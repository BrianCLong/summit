import fs from 'node:fs';
import path from 'node:path';
import { MANIFEST_VERSION, validateManifestStructure } from './schema.js';
import { fileExists, hashFile, toCanonicalPath } from './utils.js';
import type {
  Manifest,
  ManifestFileEntry,
  ManifestTransform,
  VerificationIssue,
  VerificationReport
} from './types.js';

interface EnrichedEntry extends ManifestFileEntry {
  category: 'documents' | 'exhibits' | 'evidence';
  absolutePath?: string;
  canonicalPath?: string;
  computedHash?: string;
}

function mergeEntries(manifest: Manifest): EnrichedEntry[] {
  const entries: EnrichedEntry[] = [];
  manifest.documents.forEach((entry) => entries.push({ ...entry, category: 'documents' }));
  manifest.exhibits?.forEach((entry) => entries.push({ ...entry, category: 'exhibits' }));
  manifest.evidence?.forEach((entry) => entries.push({ ...entry, category: 'evidence' }));
  return entries;
}

function buildEntryMap(entries: EnrichedEntry[]): Map<string, EnrichedEntry> {
  const map = new Map<string, EnrichedEntry>();
  entries.forEach((entry) => {
    if (!map.has(entry.id)) {
      map.set(entry.id, entry);
    }
  });
  return map;
}

function resolveEntryPath(bundlePath: string, entry: EnrichedEntry): { issue?: VerificationIssue; absolutePath?: string } {
  try {
    const canonical = toCanonicalPath(bundlePath, entry.path);
    const absolutePath = path.join(path.resolve(bundlePath), canonical);
    return { absolutePath };
  } catch (error) {
    return {
      issue: {
        code: 'PATH_TRAVERSAL',
        message: `Path outside bundle: ${entry.path}`,
        path: entry.path,
        details: { error: (error as Error).message }
      }
    };
  }
}

async function validateEntryAsset(entry: EnrichedEntry, absolutePath: string): Promise<VerificationIssue | undefined> {
  const exists = await fileExists(absolutePath);
  if (!exists) {
    return {
      code: 'MISSING_FILE',
      message: `Missing file for ${entry.id}`,
      path: entry.path
    };
  }
  const computedHash = await hashFile(absolutePath);
  entry.computedHash = computedHash;
  if (computedHash.toLowerCase() !== entry.sha256.toLowerCase()) {
    return {
      code: 'HASH_MISMATCH',
      message: `Hash mismatch for ${entry.id}`,
      path: entry.path,
      details: {
        expected: entry.sha256,
        actual: computedHash
      }
    };
  }
  return undefined;
}

function verifyEvidenceLinks(entry: EnrichedEntry, entryMap: Map<string, EnrichedEntry>): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  if (!entry.evidence) {
    return issues;
  }
  entry.evidence.forEach((evidenceId) => {
    const evidenceEntry = entryMap.get(evidenceId);
    if (!evidenceEntry) {
      issues.push({
        code: 'EVIDENCE_MISSING',
        message: `Evidence ${evidenceId} referenced by ${entry.id} is missing from manifest`,
        path: entry.path
      });
    }
  });
  return issues;
}

function verifyTransformChain(
  entry: EnrichedEntry,
  entryMap: Map<string, EnrichedEntry>,
  transformMap: Map<string, ManifestTransform>
): VerificationIssue[] {
  const issues: VerificationIssue[] = [];
  if (!entry.transforms || entry.transforms.length === 0) {
    return issues;
  }

  let previousOutput: string | undefined;
  const transforms = entry.transforms!;
  transforms.forEach((transformId, index) => {
    const transform = transformMap.get(transformId);
    if (!transform) {
      issues.push({
        code: 'TRANSFORM_BROKEN',
        message: `Transform ${transformId} referenced by ${entry.id} is missing`,
        path: entry.path
      });
      return;
    }

    const inputEntry = entryMap.get(transform.inputId);
    const outputEntry = entryMap.get(transform.outputId);
    if (!inputEntry || !outputEntry) {
      issues.push({
        code: 'TRANSFORM_BROKEN',
        message: `Transform ${transformId} references unknown input/output`,
        path: entry.path,
        details: { inputId: transform.inputId, outputId: transform.outputId }
      });
      return;
    }

    if (index === 0 && entry.evidence && entry.evidence.length > 0) {
      const expectedInput = entry.evidence[0];
      if (transform.inputId !== expectedInput) {
        issues.push({
          code: 'TRANSFORM_BROKEN',
          message: `Transform chain for ${entry.id} must start from evidence ${expectedInput}`,
          path: entry.path,
          details: { expectedInput, actualInput: transform.inputId }
        });
      }
    }

    if (previousOutput && transform.inputId !== previousOutput) {
      issues.push({
        code: 'TRANSFORM_BROKEN',
        message: `Transform chain for ${entry.id} is broken between steps ${index} and ${index + 1}`,
        path: entry.path,
        details: { expectedInput: previousOutput, actualInput: transform.inputId }
      });
    }

    if (index === transforms.length - 1 && transform.outputId !== entry.id) {
      issues.push({
        code: 'TRANSFORM_BROKEN',
        message: `Final transform for ${entry.id} must output the document id`,
        path: entry.path,
        details: { expectedOutput: entry.id, actualOutput: transform.outputId }
      });
    }

    previousOutput = transform.outputId;
  });

  return issues;
}

export async function verifyManifest(bundlePath: string): Promise<VerificationReport> {
  const issues: VerificationIssue[] = [];
  const absoluteBundle = path.resolve(bundlePath);
  const manifestPath = path.join(absoluteBundle, 'manifest.json');

  if (!(await fileExists(manifestPath))) {
    issues.push({ code: 'MISSING_MANIFEST', message: 'manifest.json not found', path: manifestPath });
    return {
      bundlePath: absoluteBundle,
      manifestPath,
      valid: false,
      manifestVersion: undefined,
      issues,
      filesChecked: 0,
      transformsChecked: 0
    };
  }

  const manifestRaw = await fs.promises.readFile(manifestPath, 'utf8');
  let manifest: Manifest;
  try {
    manifest = JSON.parse(manifestRaw) as Manifest;
  } catch (error) {
    issues.push({
      code: 'SCHEMA_INVALID',
      message: 'manifest.json is not valid JSON',
      path: manifestPath,
      details: { error: (error as Error).message }
    });
    return {
      bundlePath: absoluteBundle,
      manifestPath,
      valid: false,
      manifestVersion: undefined,
      issues,
      filesChecked: 0,
      transformsChecked: 0
    };
  }

  const schemaResult = validateManifestStructure(manifest);
  if (!schemaResult.valid) {
    issues.push({
      code: 'SCHEMA_INVALID',
      message: 'manifest.json does not match schema',
      path: manifestPath,
      details: { errors: schemaResult.errors }
    });
  }

  if (manifest.manifestVersion && manifest.manifestVersion !== MANIFEST_VERSION) {
    issues.push({
      code: 'SCHEMA_INVALID',
      message: `Unsupported manifestVersion: ${manifest.manifestVersion}`,
      path: manifestPath
    });
  }

  if (issues.length > 0) {
    return {
      bundlePath: absoluteBundle,
      manifestPath,
      valid: false,
      manifestVersion: manifest.manifestVersion,
      issues,
      filesChecked: 0,
      transformsChecked: 0
    };
  }

  const entries = mergeEntries(manifest);
  const entryMap = buildEntryMap(entries);
  const transformMap = new Map<string, ManifestTransform>();
  manifest.transforms?.forEach((transform) => transformMap.set(transform.id, transform));

  let filesChecked = 0;
  const transformsChecked = manifest.transforms?.length ?? 0;

  for (const entry of entries) {
    const resolved = resolveEntryPath(absoluteBundle, entry);
    if (resolved.issue) {
      issues.push(resolved.issue);
      continue;
    }
    entry.absolutePath = resolved.absolutePath;
    entry.canonicalPath = toCanonicalPath(absoluteBundle, entry.path);

    const assetIssue = await validateEntryAsset(entry, entry.absolutePath!);
    filesChecked += 1;
    if (assetIssue) {
      issues.push(assetIssue);
    }

    issues.push(...verifyEvidenceLinks(entry, entryMap));
    issues.push(...verifyTransformChain(entry, entryMap, transformMap));
  }

  return {
    bundlePath: absoluteBundle,
    manifestPath,
    manifestVersion: manifest.manifestVersion,
    valid: issues.length === 0,
    issues,
    filesChecked,
    transformsChecked
  };
}
