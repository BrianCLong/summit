// @ts-nocheck
import crypto from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

const DEFAULT_IGNORE = new Set(['node_modules', '.git', 'dist', '.turbo']);

export interface ProvenanceCacheOptions {
  cacheFile: string;
  artifactPath?: string;
  attestationPath?: string;
  inputs?: string[];
  ignore?: string[];
}

export interface ProvenanceCacheRecord {
  inputsFingerprint: string;
  artifactDigest?: string;
  attestationDigest?: string;
  rekorEntryUUID?: string;
  updatedAt: string;
}

export interface ProvenanceCacheValidation {
  cacheHit: boolean;
  current: Omit<ProvenanceCacheRecord, 'updatedAt'>;
  previous?: ProvenanceCacheRecord;
  reason?: string;
}

export class ProvenanceCache {
  constructor(private readonly options: ProvenanceCacheOptions) {}

  async validate(): Promise<ProvenanceCacheValidation> {
    const current = await this.buildCurrentRecord();
    const previous = await this.readCache();

    const cacheHit =
      !!previous &&
      previous.inputsFingerprint === current.inputsFingerprint &&
      previous.artifactDigest === current.artifactDigest &&
      previous.attestationDigest === current.attestationDigest;

    return {
      cacheHit,
      current,
      previous,
      reason: cacheHit
        ? undefined
        : this.describeMiss(previous, current),
    };
  }

  async snapshot(
    overrides: Partial<ProvenanceCacheRecord> = {},
  ): Promise<ProvenanceCacheRecord> {
    const current = await this.buildCurrentRecord();

    return {
      ...current,
      ...overrides,
      updatedAt: new Date().toISOString(),
    };
  }

  async persist(record: ProvenanceCacheRecord): Promise<void> {
    await fs.mkdir(path.dirname(this.options.cacheFile), { recursive: true });
    await fs.writeFile(this.options.cacheFile, JSON.stringify(record, null, 2));
  }

  private async buildCurrentRecord(): Promise<
    Omit<ProvenanceCacheRecord, 'updatedAt'>
  > {
    const inputsFingerprint = await this.fingerprintInputs(
      this.options.inputs ?? [],
    );

    return {
      inputsFingerprint,
      artifactDigest: await this.safeDigest(this.options.artifactPath),
      attestationDigest: await this.safeDigest(this.options.attestationPath),
    };
  }

  private async readCache(): Promise<ProvenanceCacheRecord | undefined> {
    try {
      const contents = await fs.readFile(this.options.cacheFile, 'utf8');
      return JSON.parse(contents) as ProvenanceCacheRecord;
    } catch {
      return undefined;
    }
  }

  private describeMiss(
    previous: ProvenanceCacheRecord | undefined,
    current: Omit<ProvenanceCacheRecord, 'updatedAt'>,
  ): string | undefined {
    if (!previous) return 'no prior cache record found';
    if (previous.inputsFingerprint !== current.inputsFingerprint)
      return 'inputs fingerprint changed';
    if (previous.artifactDigest !== current.artifactDigest)
      return 'artifact digest changed or missing';
    if (previous.attestationDigest !== current.attestationDigest)
      return 'attestation digest changed or missing';
    return undefined;
  }

  private async fingerprintInputs(pathsToHash: string[]): Promise<string> {
    const hasher = crypto.createHash('sha256');

    for (const target of pathsToHash) {
      await this.hashTarget(target, hasher);
    }

    return hasher.digest('hex');
  }

  private async hashTarget(target: string, hasher: crypto.Hash): Promise<void> {
    try {
      const stat = await fs.stat(target);

      if (stat.isDirectory()) {
        const entries = await fs.readdir(target);
        const filtered = entries
          .filter((entry) => !(this.options.ignore || []).includes(entry))
          .filter((entry) => !DEFAULT_IGNORE.has(entry))
          .sort();

        for (const entry of filtered) {
          await this.hashTarget(path.join(target, entry), hasher);
        }
        return;
      }

      if (stat.isFile()) {
        const data = await fs.readFile(target);
        hasher.update(target);
        hasher.update(data);
      }
    } catch {
      // Missing targets are treated as empty contributions to the fingerprint
    }
  }

  private async safeDigest(filePath?: string): Promise<string | undefined> {
    if (!filePath) return undefined;
    try {
      const content = await fs.readFile(filePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return undefined;
    }
  }
}
