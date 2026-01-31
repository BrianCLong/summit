import { createHash, randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { createWriteStream } from 'fs';
import os from 'os';
import path from 'path';
import archiver from 'archiver';

type RuntimeEvidenceOptions = {
  tenantId: string;
  startTime?: string;
  endTime?: string;
  auditPaths?: string[];
  policyPaths?: string[];
  sbomPaths?: string[];
  provenancePaths?: string[];
  deployedVersion?: string;
};

type RuntimeEvidenceBundle = {
  id: string;
  tenantId: string;
  bundlePath: string;
  manifestPath: string;
  checksumsPath: string;
  sha256: string;
  deployedVersion?: string;
  warnings: string[];
  counts: {
    auditEvents: number;
    policyDecisions: number;
    sbomRefs: number;
    provenanceRefs: number;
  };
  expiresAt: string;
};

const DEFAULT_AUDIT_PATHS = [
  'logs/audit-events.jsonl',
  'logs/audit.jsonl',
  'server/logs/audit-events.jsonl',
  'audit-events.jsonl',
];

const DEFAULT_POLICY_PATHS = [
  'logs/policy-decisions.jsonl',
  'logs/governance.jsonl',
  'logs/policy/decisions.jsonl',
];

const DEFAULT_SBOM_PATHS = [
  'sbom-mc-v0.4.5.json',
  'release/sbom.json',
  'release/sbom-latest.json',
];

const DEFAULT_PROVENANCE_PATHS = [
  'provenance/export-manifest.json',
  'provenance/bundle-summary.md',
  'prov-ledger/manifest.json',
];

async function resolveDeployedVersion(): Promise<string | undefined> {
  const envVersion =
    process.env.DEPLOYED_VERSION ||
    process.env.RELEASE_VERSION ||
    process.env.BUILD_VERSION;
  if (envVersion) return envVersion;

  try {
    const pkgPath = path.resolve('package.json');
    const pkg = JSON.parse(String(await fs.readFile(pkgPath, 'utf8')));
    return typeof pkg.version === 'string' ? pkg.version : undefined;
  } catch (error: unknown) {
    return undefined;
  }
}

function parseDate(input?: string): Date | undefined {
  if (!input) return undefined;
  const date = new Date(input);
  if (Number.isNaN(date.getTime())) {
    throw new Error('invalid_date');
  }
  return date;
}

function findTimestamp(value: unknown): number | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const record = value as Record<string, unknown>;
  const candidates = [
    record.timestamp,
    record.ts,
    record.created_at,
    record.createdAt,
    record.occurred_at,
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    const date = new Date(candidate as string | number | Date);
    const ms = date.getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  return undefined;
}

function matchesTenant(entry: unknown, tenantId?: string): boolean {
  if (!tenantId) return true;
  if (!entry || typeof entry !== 'object') return false;
  const record = entry as Record<string, unknown>;
  const candidates = [record.tenantId, record.tenant_id, record.tenant];
  return candidates.some((value) => value && value === tenantId);
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function collectJsonlSlice({
  sources,
  destination,
  startTime,
  endTime,
  tenantId,
}: {
  sources: string[];
  destination: string;
  startTime?: Date;
  endTime?: Date;
  tenantId?: string;
}): Promise<{ count: number; warnings: string[] }> {
  const warnings: string[] = [];
  let count = 0;
  await fs.writeFile(destination, '');

  for (const source of sources) {
    const absolute = path.resolve(source);
    const exists = await fs
      .access(absolute)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      warnings.push(`missing:${source}`);
      continue;
    }

    const content = String(await fs.readFile(absolute, 'utf8'));
    const lines = content
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const filtered: string[] = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        const ts = findTimestamp(parsed);
        if (startTime && (!ts || ts < startTime.getTime())) continue;
        if (endTime && (!ts || ts > endTime.getTime())) continue;
        if (!matchesTenant(parsed, tenantId)) continue;
        filtered.push(JSON.stringify(parsed));
        count += 1;
      } catch (error: unknown) {
        warnings.push(`parse_error:${source}`);
      }
    }

    if (filtered.length > 0) {
      await fs.appendFile(destination, filtered.join('\n') + '\n');
    }
  }

  return { count, warnings };
}

async function copyArtifacts(
  sources: string[],
  destinationDir: string,
): Promise<{ copied: string[]; warnings: string[] }> {
  const copied: string[] = [];
  const warnings: string[] = [];

  for (const source of sources) {
    const absolute = path.resolve(source);
    const exists = await fs
      .access(absolute)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      warnings.push(`missing:${source}`);
      continue;
    }

    const target = path.join(destinationDir, path.basename(source));
    await fs.copyFile(absolute, target);
    copied.push(target);
  }

  return { copied, warnings };
}

async function sha256(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  const buffer = await fs.readFile(filePath);
  hash.update(buffer);
  return hash.digest('hex');
}

class RuntimeEvidenceService {
  private readonly bundles = new Map<string, RuntimeEvidenceBundle>();
  private readonly ttlMs = 1000 * 60 * 15; // 15 minutes

  async createBundle(options: RuntimeEvidenceOptions): Promise<RuntimeEvidenceBundle> {
    const startTime = parseDate(options.startTime);
    const endTime = parseDate(options.endTime);
    const tenantId = options.tenantId;
    const deployedVersion = options.deployedVersion || (await resolveDeployedVersion());

    const workingDir = path.join(
      os.tmpdir(),
      'runtime-evidence',
      randomUUID().replace(/-/g, ''),
    );
    const artifactsDir = path.join(workingDir, 'artifacts');
    await ensureDir(artifactsDir);

    const warnings: string[] = [];

    const auditDest = path.join(artifactsDir, 'audit-events.jsonl');
    const auditResult = await collectJsonlSlice({
      sources: options.auditPaths ?? DEFAULT_AUDIT_PATHS,
      destination: auditDest,
      startTime,
      endTime,
      tenantId,
    });
    warnings.push(...auditResult.warnings);

    const policyDest = path.join(artifactsDir, 'policy-decisions.jsonl');
    const policyResult = await collectJsonlSlice({
      sources: options.policyPaths ?? DEFAULT_POLICY_PATHS,
      destination: policyDest,
      startTime,
      endTime,
      tenantId,
    });
    warnings.push(...policyResult.warnings);

    const sbomDir = path.join(artifactsDir, 'sbom');
    await ensureDir(sbomDir);
    const sbomResult = await copyArtifacts(
      options.sbomPaths ?? DEFAULT_SBOM_PATHS,
      sbomDir,
    );
    warnings.push(...sbomResult.warnings);

    const provenanceDir = path.join(artifactsDir, 'provenance');
    await ensureDir(provenanceDir);
    const provenanceResult = await copyArtifacts(
      options.provenancePaths ?? DEFAULT_PROVENANCE_PATHS,
      provenanceDir,
    );
    warnings.push(...provenanceResult.warnings);

    const manifest = {
      tenantId,
      startTime: startTime?.toISOString(),
      endTime: endTime?.toISOString(),
      counts: {
        auditEvents: auditResult.count,
        policyDecisions: policyResult.count,
        sbomRefs: sbomResult.copied.length,
        provenanceRefs: provenanceResult.copied.length,
      },
      sources: {
        audit: options.auditPaths ?? DEFAULT_AUDIT_PATHS,
        policy: options.policyPaths ?? DEFAULT_POLICY_PATHS,
        sbom: options.sbomPaths ?? DEFAULT_SBOM_PATHS,
        provenance: options.provenancePaths ?? DEFAULT_PROVENANCE_PATHS,
      },
      warnings,
      generatedAt: new Date().toISOString(),
      deployedVersion,
    };

    const manifestPath = path.join(workingDir, 'manifest.json');
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

    const filesForChecksums = [
      auditDest,
      policyDest,
      ...sbomResult.copied,
      ...provenanceResult.copied,
      manifestPath,
    ];

    const checksumLines: string[] = [];
    for (const filePath of filesForChecksums) {
      const exists = await fs
        .access(filePath)
        .then(() => true)
        .catch(() => false);
      if (!exists) continue;
      const hash = await sha256(filePath);
      checksumLines.push(`${hash}  ${path.relative(workingDir, filePath)}`);
    }

    const checksumsPath = path.join(workingDir, 'checksums.txt');
    await fs.writeFile(checksumsPath, checksumLines.join('\n'));

    const bundlePath = path.join(
      workingDir,
      `runtime-evidence-${Date.now()}.tar.gz`,
    );
    await this.writeTarball({
      files: [
        manifestPath,
        checksumsPath,
        auditDest,
        policyDest,
        ...sbomResult.copied,
        ...provenanceResult.copied,
      ],
      output: bundlePath,
      workingDir,
    });

    const sha256Hash = await sha256(bundlePath);
    const bundle: RuntimeEvidenceBundle = {
      id: randomUUID(),
      tenantId,
      bundlePath,
      manifestPath,
      checksumsPath,
      sha256: sha256Hash,
      deployedVersion,
      warnings,
      counts: manifest.counts,
      expiresAt: new Date(Date.now() + this.ttlMs).toISOString(),
    };

    this.cleanupExpired();
    this.bundles.set(bundle.id, bundle);
    return bundle;
  }

  getBundle(bundleId: string): RuntimeEvidenceBundle | undefined {
    this.cleanupExpired();
    return this.bundles.get(bundleId);
  }

  private cleanupExpired() {
    const now = Date.now();
    for (const [id, bundle] of this.bundles.entries()) {
      if (new Date(bundle.expiresAt).getTime() < now) {
        this.bundles.delete(id);
        const workingDir = path.dirname(bundle.bundlePath);
        fs.rm(workingDir, { recursive: true, force: true }).catch(() => undefined);
      }
    }
  }

  private async writeTarball({
    files,
    output,
    workingDir,
  }: {
    files: string[];
    output: string;
    workingDir: string;
  }): Promise<void> {
    await ensureDir(path.dirname(output));
    await new Promise<void>((resolve, reject) => {
      const stream = createWriteStream(output);
      const archive = archiver('tar', { gzip: true, gzipOptions: { level: 9 } });

      archive.on('error', reject);
      stream.on('close', () => resolve());

      archive.pipe(stream as unknown as NodeJS.WritableStream);

      for (const file of files) {
        archive.file(file, { name: path.relative(workingDir, file) });
      }

      archive.finalize();
    });
  }
}

export const runtimeEvidenceService = new RuntimeEvidenceService();
