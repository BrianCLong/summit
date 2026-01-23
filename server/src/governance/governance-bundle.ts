import { randomUUID, createHash } from 'crypto';
import { createReadStream, createWriteStream, promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';

type GovernanceSourceConfig = {
  auditLogPaths: string[];
  policyLogPaths: string[];
  sbomPaths: string[];
  provenancePaths: string[];
};

export const defaultGovernanceSources: GovernanceSourceConfig = {
  auditLogPaths: [
    path.resolve('logs/audit-events.jsonl'),
    path.resolve('server/logs/audit-events.jsonl'),
  ],
  policyLogPaths: [
    path.resolve('logs/policy-decisions.jsonl'),
    path.resolve('logs/governance.jsonl'),
  ],
  sbomPaths: [
    path.resolve('sbom-mc-v0.4.5.json'),
    path.resolve('security/sbom/quality-gates-sbom.json'),
  ],
  provenancePaths: [
    path.resolve('provenance/export-manifest.json'),
    path.resolve('provenance/bundle-summary.md'),
    path.resolve('provenance/model.md'),
  ],
};

export interface GovernanceBundleOptions {
  tenantId: string;
  startTime: string;
  endTime: string;
  auditLogPaths?: string[];
  policyLogPaths?: string[];
  sbomPaths?: string[];
  provenancePaths?: string[];
  outputRoot?: string;
}

export interface GovernanceBundleCounts {
  auditEvents: number;
  policyDecisions: number;
  sbomRefs: number;
  provenanceRefs: number;
}

interface ManifestEntry {
  path: string;
  sha256: string;
  type: 'audit' | 'policy' | 'sbom' | 'provenance' | 'manifest' | 'checksums';
  count?: number;
  source?: string | null;
  warnings?: string[];
}

export interface GovernanceBundleResult {
  id: string;
  tarPath: string;
  sha256: string;
  manifestPath: string;
  checksumsPath: string;
  counts: GovernanceBundleCounts;
  warnings: string[];
  workspace: string;
  files: ManifestEntry[];
}

const MAX_EVENTS = 5000;

export async function generateGovernanceBundle(
  options: GovernanceBundleOptions,
): Promise<GovernanceBundleResult> {
  const start = new Date(options.startTime);
  const end = new Date(options.endTime);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error('invalid_time_window');
  }

  const sources: GovernanceSourceConfig = {
    auditLogPaths: options.auditLogPaths ?? defaultGovernanceSources.auditLogPaths,
    policyLogPaths:
      options.policyLogPaths ?? defaultGovernanceSources.policyLogPaths,
    sbomPaths: options.sbomPaths ?? defaultGovernanceSources.sbomPaths,
    provenancePaths:
      options.provenancePaths ?? defaultGovernanceSources.provenancePaths,
  };

  const workspace = await fs.mkdtemp(
    path.join(options.outputRoot ?? os.tmpdir(), 'governance-bundle-'),
  );
  const bundleId = randomUUID();
  const bundleDir = path.join(workspace, bundleId);
  await fs.mkdir(bundleDir, { recursive: true });

  const manifestEntries: ManifestEntry[] = [];
  const warnings: string[] = [];
  const counts: GovernanceBundleCounts = {
    auditEvents: 0,
    policyDecisions: 0,
    sbomRefs: 0,
    provenanceRefs: 0,
  };

  const audit = await collectJsonlSlice({
    label: 'audit',
    candidates: sources.auditLogPaths,
    start,
    end,
    destination: path.join(bundleDir, 'audit-events.json'),
  });
  manifestEntries.push(audit.entry);
  warnings.push(...audit.warnings);
  counts.auditEvents = audit.entry.count ?? 0;

  const policy = await collectJsonlSlice({
    label: 'policy',
    candidates: sources.policyLogPaths,
    start,
    end,
    destination: path.join(bundleDir, 'policy-decisions.json'),
  });
  manifestEntries.push(policy.entry);
  warnings.push(...policy.warnings);
  counts.policyDecisions = policy.entry.count ?? 0;

  const sbom = await copyReferences({
    label: 'sbom',
    candidates: sources.sbomPaths,
    destination: path.join(bundleDir, 'sbom'),
  });
  manifestEntries.push(...sbom.entries);
  warnings.push(...sbom.warnings);
  counts.sbomRefs = sbom.entries.length;

  const provenance = await copyReferences({
    label: 'provenance',
    candidates: sources.provenancePaths,
    destination: path.join(bundleDir, 'provenance'),
  });
  manifestEntries.push(...provenance.entries);
  warnings.push(...provenance.warnings);
  counts.provenanceRefs = provenance.entries.length;

  const manifest = {
    id: bundleId,
    tenantId: options.tenantId,
    window: { start: start.toISOString(), end: end.toISOString() },
    generatedAt: new Date().toISOString(),
    warnings,
    counts,
    files: manifestEntries,
  };

  const manifestPath = path.join(bundleDir, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  const manifestHash = await hashFile(manifestPath);
  manifestEntries.push({
    path: 'manifest.json',
    sha256: manifestHash,
    type: 'manifest',
  });

  const checksumsPath = path.join(bundleDir, 'checksums.txt');
  await writeChecksums(checksumsPath, manifestEntries);
  const checksumHash = await hashFile(checksumsPath);
  manifestEntries.push({
    path: 'checksums.txt',
    sha256: checksumHash,
    type: 'checksums',
  });

  const tarPath = path.join(workspace, `${bundleId}.tar.gz`);
  await createTarball(bundleDir, tarPath);
  const tarHash = await hashFile(tarPath);

  return {
    id: bundleId,
    tarPath,
    sha256: tarHash,
    manifestPath,
    checksumsPath,
    counts,
    warnings,
    workspace,
    files: manifestEntries,
  };
}

async function collectJsonlSlice({
  label,
  candidates,
  start,
  end,
  destination,
}: {
  label: 'audit' | 'policy';
  candidates: string[];
  start: Date;
  end: Date;
  destination: string;
}): Promise<{ entry: ManifestEntry; warnings: string[] }> {
  const warnings: string[] = [];
  const source = await firstExistingPath(candidates);
  let records: any[] = [];

  if (source) {
    const content = await fs.readFile(source, 'utf8');
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const ts = resolveTimestamp(parsed);
        if (ts && ts >= start.getTime() && ts <= end.getTime()) {
          records.push(parsed);
        }
      } catch (error: any) {
        warnings.push(`${label}:invalid_line`);
      }
    }

    if (records.length > MAX_EVENTS) {
      records = records.slice(0, MAX_EVENTS);
      warnings.push(`${label}:truncated`);
    }
  } else {
    warnings.push(`${label}:source_missing`);
  }

  await fs.writeFile(
    destination,
    JSON.stringify(
      {
        source,
        window: { start: start.toISOString(), end: end.toISOString() },
        count: records.length,
        events: records,
        warnings,
      },
      null,
      2,
    ),
    'utf8',
  );

  const hash = await hashFile(destination);
  return {
    entry: {
      path: path.relative(path.dirname(destination), destination),
      sha256: hash,
      type: label,
      count: records.length,
      source,
      warnings,
    },
    warnings,
  };
}

async function copyReferences({
  label,
  candidates,
  destination,
}: {
  label: 'sbom' | 'provenance';
  candidates: string[];
  destination: string;
}): Promise<{ entries: ManifestEntry[]; warnings: string[] }> {
  await fs.mkdir(destination, { recursive: true });
  const entries: ManifestEntry[] = [];
  const warnings: string[] = [];

  for (const candidate of candidates) {
    const exists = await pathExists(candidate);
    if (!exists) {
      continue;
    }

    const target = path.join(destination, path.basename(candidate));
    await fs.copyFile(candidate, target);
    const sha256 = await hashFile(target);
    entries.push({
      path: path.relative(path.dirname(destination), target),
      sha256,
      type: label,
      source: candidate,
    });
  }

  if (entries.length === 0) {
    warnings.push(`${label}:source_missing`);
  }

  return { entries, warnings };
}

async function writeChecksums(filePath: string, entries: ManifestEntry[]) {
  const lines = entries.map(
    (entry) => `${entry.sha256}  ${entry.path.replace(/\\/g, '/')}`,
  );
  await fs.writeFile(filePath, lines.join('\n'), 'utf8');
}

async function firstExistingPath(pathsToCheck: string[]): Promise<string | null> {
  for (const candidate of pathsToCheck) {
    if (await pathExists(candidate)) {
      return candidate;
    }
  }
  return null;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await fs.access(target);
    return true;
  } catch {
    return false;
  }
}

function resolveTimestamp(record: Record<string, any>): number | null {
  const candidate =
    record?.timestamp || record?.created_at || record?.createdAt || record?.ts;
  if (!candidate) return null;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

async function hashFile(target: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(target);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function createTarball(sourceDir: string, tarPath: string) {
  return new Promise<void>((resolve, reject) => {
    const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });
    const writable = createWriteStream(tarPath);

    writable.on('close', () => resolve());
    writable.on('error', reject);

    archive.on('error', reject);
    archive.pipe(writable as unknown as NodeJS.WritableStream);
    archive.directory(sourceDir, false);
    archive.finalize().catch(reject);
  });
}
