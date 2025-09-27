import fs from 'fs';
import path from 'path';
import { ArtifactInput, DiffEntry, Signer, SparArtifact, SparManifest } from './types';
import {
  computeHash,
  deepClone,
  deepEqual,
  normalisePolicyTags,
  normaliseTools,
  stableStringify,
} from './utils';
import { replayManifest as replayManifestPayload } from './manifest';

interface RegistryIndexEntry {
  version: number;
  id: string;
  hash: string;
  createdAt: string;
}

interface RegistryIndex {
  templates: Record<string, RegistryIndexEntry[]>;
  hashes: Record<string, string>;
}

export class SparRegistry {
  private readonly indexPath: string;
  private index: RegistryIndex;

  constructor(private readonly storageDir: string) {
    fs.mkdirSync(storageDir, { recursive: true });
    this.indexPath = path.join(storageDir, 'index.json');
    this.index = this.loadIndex();
  }

  registerArtifact(input: ArtifactInput, signer: Signer): SparArtifact {
    const prepared = this.prepareInput(input);
    const canonical = this.canonicalPayload(prepared);
    const hash = computeHash(canonical);

    const existingId = this.index.hashes[hash];
    if (existingId) {
      return this.getArtifact(existingId);
    }

    const templateEntries = this.index.templates[prepared.templateId] ?? [];
    const nextVersion = templateEntries.length > 0 ? templateEntries[templateEntries.length - 1].version + 1 : 1;
    const artifactId = `${prepared.templateId}:v${nextVersion}`;
    const createdAt = new Date().toISOString();
    const signature = signer.sign(hash);

    const artifact: SparArtifact = {
      ...prepared,
      id: artifactId,
      version: nextVersion,
      hash,
      signerId: signer.id,
      signature,
      createdAt,
    };

    this.persistArtifact(artifact);

    const registryEntry: RegistryIndexEntry = {
      version: nextVersion,
      id: artifactId,
      hash,
      createdAt,
    };

    this.index.templates[prepared.templateId] = [...templateEntries, registryEntry];
    this.index.hashes[hash] = artifactId;
    this.saveIndex();

    return artifact;
  }

  getArtifact(artifactId: string): SparArtifact {
    const { templateId, version } = this.parseArtifactId(artifactId);
    const artifactPath = this.artifactPath(templateId, version);
    if (!fs.existsSync(artifactPath)) {
      throw new Error(`Artifact ${artifactId} not found`);
    }
    const raw = fs.readFileSync(artifactPath, 'utf-8');
    return JSON.parse(raw) as SparArtifact;
  }

  listArtifacts(templateId?: string): SparArtifact[] {
    if (templateId) {
      return this.loadArtifactsForTemplate(templateId);
    }
    return Object.keys(this.index.templates).flatMap((id) => this.loadArtifactsForTemplate(id));
  }

  exportManifest(artifactId: string): SparManifest {
    const artifact = this.getArtifact(artifactId);
    return {
      schemaVersion: '1.0.0',
      artifactId: artifact.id,
      templateId: artifact.templateId,
      version: artifact.version,
      hash: artifact.hash,
      signerId: artifact.signerId,
      signature: artifact.signature,
      createdAt: artifact.createdAt,
      promptTemplate: artifact.promptTemplate,
      inputs: artifact.inputs,
      toolTraces: artifact.toolTraces,
      output: artifact.output,
      policyTags: artifact.policyTags,
      metadata: artifact.metadata,
    };
  }

  verifyArtifact(artifactId: string, signer: Signer): boolean {
    const artifact = this.getArtifact(artifactId);
    const canonical = this.canonicalPayload(artifact);
    const expectedHash = computeHash(canonical);
    if (artifact.hash !== expectedHash) {
      return false;
    }
    return signer.verify(artifact.hash, artifact.signature);
  }

  diffArtifacts(firstId: string, secondId: string): DiffEntry[] {
    const first = this.getArtifact(firstId);
    const second = this.getArtifact(secondId);
    const firstCore = this.corePayload(first);
    const secondCore = this.corePayload(second);
    return diffCore(firstCore, secondCore);
  }

  replayManifest(manifest: SparManifest, signer: Signer): boolean {
    const replayed = replayManifestPayload(manifest, signer);
    const artifact = this.getArtifact(manifest.artifactId);
    const artifactCanonical = this.canonicalPayload(artifact);
    return stableStringify(artifactCanonical) === replayed.canonical;
  }

  private persistArtifact(artifact: SparArtifact): void {
    const artifactPath = this.artifactPath(artifact.templateId, artifact.version);
    if (fs.existsSync(artifactPath)) {
      const existing = fs.readFileSync(artifactPath, 'utf-8');
      if (existing !== JSON.stringify(artifact, null, 2)) {
        throw new Error(`Artifact at ${artifactPath} already exists with different content`);
      }
      return;
    }
    fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
    fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  }

  private loadArtifactsForTemplate(templateId: string): SparArtifact[] {
    const entries = this.index.templates[templateId] ?? [];
    return entries.map((entry) => this.getArtifact(entry.id));
  }

  private parseArtifactId(artifactId: string): { templateId: string; version: number } {
    const [templateId, versionPart] = artifactId.split(':v');
    if (!templateId || !versionPart) {
      throw new Error(`Invalid artifact id ${artifactId}`);
    }
    const version = Number(versionPart);
    if (!Number.isInteger(version)) {
      throw new Error(`Invalid artifact version for id ${artifactId}`);
    }
    return { templateId, version };
  }

  private artifactPath(templateId: string, version: number): string {
    return path.join(this.storageDir, templateId, `v${version}.json`);
  }

  private canonicalPayload(input: ArtifactInput | SparArtifact | SparManifest): Record<string, unknown> {
    return {
      promptTemplate: input.promptTemplate,
      inputs: input.inputs,
      toolTraces: input.toolTraces,
      output: input.output,
      metadata: input.metadata,
      policyTags: input.policyTags,
    };
  }

  private corePayload(input: ArtifactInput | SparArtifact | SparManifest): Record<string, unknown> {
    return this.canonicalPayload(input);
  }

  private prepareInput(input: ArtifactInput): ArtifactInput {
    return {
      templateId: input.templateId,
      promptTemplate: input.promptTemplate,
      inputs: deepClone(input.inputs),
      toolTraces: input.toolTraces.map((trace) => ({
        ...trace,
        input: deepClone(trace.input),
        output: deepClone(trace.output),
        meta: trace.meta ? deepClone(trace.meta) : undefined,
      })),
      output: input.output,
      policyTags: normalisePolicyTags(input.policyTags),
      metadata: {
        model: input.metadata.model,
        parameters: deepClone(input.metadata.parameters),
        tools: normaliseTools(
          input.metadata.tools.map((tool) => ({
            ...tool,
            parameters: tool.parameters ? deepClone(tool.parameters) : undefined,
          })),
        ),
      },
    };
  }

  private loadIndex(): RegistryIndex {
    if (!fs.existsSync(this.indexPath)) {
      return { templates: {}, hashes: {} };
    }
    const raw = fs.readFileSync(this.indexPath, 'utf-8');
    const parsed = JSON.parse(raw) as RegistryIndex;
    return {
      templates: parsed.templates ?? {},
      hashes: parsed.hashes ?? {},
    };
  }

  private saveIndex(): void {
    fs.writeFileSync(this.indexPath, JSON.stringify(this.index, null, 2));
  }
}

function diffCore(a: Record<string, unknown>, b: Record<string, unknown>, prefix = ''): DiffEntry[] {
  const diffs: DiffEntry[] = [];
  const keys = Array.from(new Set([...Object.keys(a), ...Object.keys(b)])).sort();

  for (const key of keys) {
    const path = prefix ? `${prefix}.${key}` : key;
    const aValue = a[key];
    const bValue = b[key];

    if (deepEqual(aValue, bValue)) {
      continue;
    }

    if (Array.isArray(aValue) && Array.isArray(bValue)) {
      const maxLength = Math.max(aValue.length, bValue.length);
      for (let index = 0; index < maxLength; index += 1) {
        const itemPath = `${path}[${index}]`;
        if (index >= aValue.length) {
          diffs.push({ path: itemPath, before: undefined, after: bValue[index] });
          continue;
        }
        if (index >= bValue.length) {
          diffs.push({ path: itemPath, before: aValue[index], after: undefined });
          continue;
        }
        if (!deepEqual(aValue[index], bValue[index])) {
          if (typeof aValue[index] === 'object' && typeof bValue[index] === 'object') {
            diffs.push(...diffCore(aValue[index] as Record<string, unknown>, bValue[index] as Record<string, unknown>, itemPath));
          } else {
            diffs.push({ path: itemPath, before: aValue[index], after: bValue[index] });
          }
        }
      }
      continue;
    }

    if (typeof aValue === 'object' && typeof bValue === 'object' && aValue && bValue) {
      diffs.push(...diffCore(aValue as Record<string, unknown>, bValue as Record<string, unknown>, path));
      continue;
    }

    diffs.push({ path, before: aValue, after: bValue });
  }

  return diffs;
}
