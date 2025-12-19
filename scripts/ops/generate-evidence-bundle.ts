#!/usr/bin/env -S node --loader ts-node/esm

import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

export const EVIDENCE_VERSION = '2.0.0';
const DEFAULT_OUTPUT_ROOT = path.join('artifacts', 'evidence');

export interface GitInfo {
  commit: string;
  shortCommit: string;
  branch: string;
  message?: string;
}

export interface ManifestEntry {
  path: string;
  sha256: string;
  size: number;
}

export interface EvidenceManifest {
  version: string;
  generatedAt: string;
  bundle: {
    name: string;
    commit: string;
    shortCommit: string;
    branch: string;
  };
  requiredComponents: string[];
  files: ManifestEntry[];
  manifestSha256File: string;
  notes?: string;
}

export interface EvidenceBundleResult {
  bundleName: string;
  bundlePath: string;
  manifestPath: string;
  manifest: EvidenceManifest;
}

export interface EvidenceBundleOptions {
  outputRoot?: string;
  timestamp?: string;
  commitSha?: string;
  branch?: string;
  controlMappingPath?: string;
  sloConfigPath?: string;
  sloSnapshotPath?: string;
  llmPolicyPath?: string;
  sbomPaths?: string[];
  packageJsonPath?: string;
  provenancePath?: string;
  multiTenantSummaryPath?: string;
  gaGateNotes?: string;
}

const REQUIRED_COMPONENTS = [
  'ga-gate-report.json',
  'ci/metadata.json',
  'sboms/*',
  'provenance.json',
  'slo/config.yaml',
  'slo/snapshot.json',
  'llm/policy.yaml',
  'controls/multi-tenant-summary.json',
  'controls/control-mapping.md',
];

const parseList = (value?: string): string[] =>
  value
    ? value
        .split(',')
        .map(entry => entry.trim())
        .filter(Boolean)
    : [];

const sha256File = async (filePath: string): Promise<string> => {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
};

const ensureFileExists = async (filePath: string, label: string) => {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
};

const sanitizeTimestamp = (timestamp: string): string =>
  timestamp.replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');

const resolveGitInfo = async (options?: EvidenceBundleOptions): Promise<GitInfo> => {
  const commit =
    options?.commitSha ||
    process.env.GITHUB_SHA ||
    (await execAsync('git rev-parse HEAD').then(r => r.stdout.trim()).catch(() => 'unknown'));

  const branch =
    options?.branch ||
    process.env.GITHUB_REF_NAME ||
    process.env.GITHUB_HEAD_REF ||
    (await execAsync('git rev-parse --abbrev-ref HEAD').then(r => r.stdout.trim()).catch(() => 'unknown'));

  const message =
    (await execAsync(`git show -s --format=%s ${commit}`)
      .then(r => r.stdout.trim())
      .catch(() => undefined)) || undefined;

  return {
    commit,
    shortCommit: commit.slice(0, 12),
    branch,
    message,
  };
};

const copyFileWithHash = async (
  bundlePath: string,
  relativeDestination: string,
  sourcePath: string,
): Promise<ManifestEntry> => {
  await ensureFileExists(sourcePath, `Required source for ${relativeDestination}`);
  const destinationPath = path.join(bundlePath, relativeDestination);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.copyFile(sourcePath, destinationPath);
  const sha256 = await sha256File(destinationPath);
  const { size } = await fs.stat(destinationPath);

  return {
    path: relativeDestination,
    sha256,
    size,
  };
};

const writeJsonWithHash = async (
  bundlePath: string,
  relativeDestination: string,
  data: unknown,
): Promise<ManifestEntry> => {
  const destinationPath = path.join(bundlePath, relativeDestination);
  await fs.mkdir(path.dirname(destinationPath), { recursive: true });
  await fs.writeFile(destinationPath, JSON.stringify(data, null, 2));
  const sha256 = await sha256File(destinationPath);
  const { size } = await fs.stat(destinationPath);

  return {
    path: relativeDestination,
    sha256,
    size,
  };
};

const generateMinimalSbom = async (
  bundlePath: string,
  git: GitInfo,
  timestamp: string,
  packageJsonPath: string,
): Promise<ManifestEntry> => {
  await ensureFileExists(packageJsonPath, 'Package manifest for SBOM generation');
  const pkg = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8')) as {
    name: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };

  const components = Object.entries({
    ...(pkg.dependencies || {}),
    ...(pkg.devDependencies || {}),
  })
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, version]) => ({
      type: 'library',
      name,
      version,
    }));

  const sbom = {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    metadata: {
      timestamp,
      component: {
        type: 'application',
        name: pkg.name,
        version: pkg.version || '0.0.0',
        purl: `pkg:npm/${pkg.name}@${pkg.version || '0.0.0'}`,
      },
      tools: [
        {
          vendor: 'Summit',
          name: 'evidence-bundler',
          version: EVIDENCE_VERSION,
        },
      ],
      properties: {
        commit: git.commit,
        branch: git.branch,
      },
    },
    components,
  };

  return writeJsonWithHash(bundlePath, path.join('sboms', 'workspace-sbom.json'), sbom);
};

const buildCiMetadata = (git: GitInfo, timestamp: string) => {
  const workflowUrl =
    process.env.GITHUB_RUN_ID && process.env.GITHUB_REPOSITORY
      ? `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : undefined;

  return {
    generatedAt: timestamp,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    workflowName: process.env.GITHUB_WORKFLOW,
    job: process.env.GITHUB_JOB,
    repository: process.env.GITHUB_REPOSITORY,
    ref: process.env.GITHUB_REF,
    actor: process.env.GITHUB_ACTOR,
    url: workflowUrl,
    git,
  };
};

const buildGaGateReport = (
  git: GitInfo,
  timestamp: string,
  missingComponents: string[],
  manifestPath: string,
  options?: EvidenceBundleOptions,
) => ({
  generatedAt: timestamp,
  commit: git.commit,
  shortCommit: git.shortCommit,
  branch: git.branch,
  status: missingComponents.length === 0 ? 'pass' : 'fail',
  missingComponents,
  manifest: {
    path: manifestPath,
  },
  notes: options?.gaGateNotes,
});

const findMissingComponents = (entries: ManifestEntry[], skipGateReport = false): string[] => {
  const paths = entries.map(entry => entry.path);
  const missing = new Set<string>();

  const ensurePath = (expected: string) => {
    if (!paths.includes(expected)) missing.add(expected);
  };

  if (!skipGateReport) {
    ensurePath('ga-gate-report.json');
  }
  ensurePath('ci/metadata.json');
  ensurePath('provenance.json');
  ensurePath('slo/config.yaml');
  ensurePath('slo/snapshot.json');
  ensurePath('llm/policy.yaml');
  ensurePath('controls/multi-tenant-summary.json');
  ensurePath('controls/control-mapping.md');

  const hasSbom = paths.some(p => p.startsWith('sboms/'));
  if (!hasSbom) missing.add('sboms/*');

  return Array.from(missing);
};

const setActionOutputs = async (bundlePath: string, bundleName: string, manifestPath: string) => {
  if (!process.env.GITHUB_OUTPUT) return;
  const outputs = [`bundle-path=${bundlePath}`, `bundle-name=${bundleName}`, `manifest-path=${manifestPath}`];
  await fs.appendFile(process.env.GITHUB_OUTPUT, `${outputs.join('\n')}\n`);
};

const gatherOptionsFromEnv = (): EvidenceBundleOptions => ({
  outputRoot: process.env.EVIDENCE_OUTPUT_ROOT,
  timestamp: process.env.EVIDENCE_TIMESTAMP,
  commitSha: process.env.EVIDENCE_COMMIT_SHA,
  branch: process.env.EVIDENCE_BRANCH,
  controlMappingPath: process.env.CONTROL_MAPPING_PATH,
  sloConfigPath: process.env.SLO_CONFIG_PATH,
  sloSnapshotPath: process.env.SLO_SNAPSHOT_PATH,
  llmPolicyPath: process.env.LLM_POLICY_PATH,
  sbomPaths: parseList(process.env.EVIDENCE_SBOM_PATHS),
  packageJsonPath: process.env.PACKAGE_JSON_PATH,
  provenancePath: process.env.PROVENANCE_PATH,
  multiTenantSummaryPath: process.env.MULTI_TENANT_SUMMARY_PATH,
  gaGateNotes: process.env.GA_GATE_NOTES,
});

export const generateEvidenceBundle = async (
  options: EvidenceBundleOptions = {},
): Promise<EvidenceBundleResult> => {
  const mergedOptions: EvidenceBundleOptions = { ...gatherOptionsFromEnv(), ...options };
  const timestamp = mergedOptions.timestamp || new Date().toISOString();
  const git = await resolveGitInfo(mergedOptions);
  const bundleName = `evidence-${git.commit}-${sanitizeTimestamp(timestamp)}`;
  const outputRoot = path.resolve(mergedOptions.outputRoot || DEFAULT_OUTPUT_ROOT);
  const bundlePath = path.join(outputRoot, bundleName);

  await fs.rm(bundlePath, { recursive: true, force: true });
  await fs.mkdir(bundlePath, { recursive: true });

  const manifestEntries: ManifestEntry[] = [];

  const controlMappingPath =
    mergedOptions.controlMappingPath || path.resolve('docs', 'audit', 'control-mapping.md');
  manifestEntries.push(
    await copyFileWithHash(bundlePath, path.join('controls', 'control-mapping.md'), controlMappingPath),
  );

  const multiTenantSummaryPath = mergedOptions.multiTenantSummaryPath;
  if (multiTenantSummaryPath) {
    manifestEntries.push(
      await copyFileWithHash(
        bundlePath,
        path.join('controls', 'multi-tenant-summary.json'),
        multiTenantSummaryPath,
      ),
    );
  } else {
    manifestEntries.push(
      await writeJsonWithHash(bundlePath, path.join('controls', 'multi-tenant-summary.json'), {
        generatedAt: timestamp,
        enforcement: {
          isolation: 'Tenant-aware data access guards at API, service, and datastore layers',
          authentication: 'OIDC + RBAC/ABAC with policy checks recorded for audit',
          network: 'Namespace and network policy boundaries per tenant tier',
          dataResidency: 'Config-driven region pinning and export controls',
        },
        monitoring: {
          auditLogging: 'Access, administrative actions, and cross-tenant requests are logged',
          alerts: 'Access drift and noisy tenants alert to SRE and Security channels',
          dashboards: 'Per-tenant SLOs and error budgets tracked in Grafana panels',
        },
        references: {
          policies: 'policy/',
          docs: 'docs/security and docs/maestro',
        },
      }),
    );
  }

  const sloConfigPath = mergedOptions.sloConfigPath || path.resolve('slo-config.yaml');
  const sloConfigEntry = await copyFileWithHash(bundlePath, path.join('slo', 'config.yaml'), sloConfigPath);
  manifestEntries.push(sloConfigEntry);
  const sloSnapshotPath = mergedOptions.sloSnapshotPath;
  if (sloSnapshotPath) {
    manifestEntries.push(
      await copyFileWithHash(bundlePath, path.join('slo', 'snapshot.json'), sloSnapshotPath),
    );
  } else {
    manifestEntries.push(
      await writeJsonWithHash(bundlePath, path.join('slo', 'snapshot.json'), {
        capturedAt: timestamp,
        source: 'slo/config.yaml',
        configSha256: sloConfigEntry.sha256,
        status: 'not-evaluated',
      }),
    );
  }

  const llmPolicyPath = mergedOptions.llmPolicyPath || path.resolve('litellm.config.yaml');
  manifestEntries.push(await copyFileWithHash(bundlePath, path.join('llm', 'policy.yaml'), llmPolicyPath));

  const ciMetadata = buildCiMetadata(git, timestamp);
  manifestEntries.push(await writeJsonWithHash(bundlePath, path.join('ci', 'metadata.json'), ciMetadata));

  const sbomPaths = mergedOptions.sbomPaths && mergedOptions.sbomPaths.length > 0 ? mergedOptions.sbomPaths : undefined;
  if (sbomPaths?.length) {
    for (const sbomPath of sbomPaths) {
      const destination = path.join('sboms', path.basename(sbomPath));
      manifestEntries.push(await copyFileWithHash(bundlePath, destination, path.resolve(sbomPath)));
    }
  } else {
    manifestEntries.push(
      await generateMinimalSbom(
        bundlePath,
        git,
        timestamp,
        mergedOptions.packageJsonPath || path.resolve('package.json'),
      ),
    );
  }

  if (mergedOptions.provenancePath) {
    manifestEntries.push(
      await copyFileWithHash(bundlePath, 'provenance.json', path.resolve(mergedOptions.provenancePath)),
    );
  } else {
    manifestEntries.push(
      await writeJsonWithHash(bundlePath, 'provenance.json', {
        generatedAt: timestamp,
        commit: git.commit,
        branch: git.branch,
        builder: 'scripts/ops/generate-evidence-bundle.ts',
        workflow: ciMetadata,
      }),
    );
  }

  const missingBeforeGate = findMissingComponents(manifestEntries, true);
  const gaGateReport = buildGaGateReport(git, timestamp, missingBeforeGate, 'manifest.json', mergedOptions);
  manifestEntries.push(await writeJsonWithHash(bundlePath, 'ga-gate-report.json', gaGateReport));

  const missingComponents = findMissingComponents(manifestEntries);
  if (missingComponents.length > 0) {
    throw new Error(`Missing required evidence components: ${missingComponents.join(', ')}`);
  }

  manifestEntries.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: EvidenceManifest = {
    version: EVIDENCE_VERSION,
    generatedAt: timestamp,
    bundle: {
      name: bundleName,
      commit: git.commit,
      shortCommit: git.shortCommit,
      branch: git.branch,
    },
    requiredComponents: REQUIRED_COMPONENTS,
    files: manifestEntries,
    manifestSha256File: 'manifest.sha256',
    notes: mergedOptions.gaGateNotes,
  };

  const manifestPath = path.join(bundlePath, 'manifest.json');
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

  const manifestSha = await sha256File(manifestPath);
  await fs.writeFile(path.join(bundlePath, 'manifest.sha256'), `${manifestSha}  manifest.json\n`);

  await setActionOutputs(bundlePath, bundleName, manifestPath);

  return {
    bundleName,
    bundlePath,
    manifestPath,
    manifest,
  };
};

const isMainModule = (): boolean => {
  const executedPath = path.resolve(process.argv[1] || '');
  const metaUrl = (() => {
    try {
      // eslint-disable-next-line no-eval
      return (0, eval)('import.meta.url');
    } catch {
      return undefined;
    }
  })();

  const currentPath = metaUrl
    ? (() => {
        try {
          return fileURLToPath(metaUrl);
        } catch {
          return undefined;
        }
      })()
    : typeof __filename !== 'undefined'
      ? path.resolve(__filename)
      : undefined;

  if (!currentPath) return false;
  if (executedPath === currentPath) return true;

  if (typeof require !== 'undefined' && require.main?.filename) {
    return path.resolve(require.main.filename) === currentPath;
  }

  return false;
};

if (isMainModule()) {
  generateEvidenceBundle().catch(error => {
    console.error('Failed to generate evidence bundle:', error);
    process.exitCode = 1;
  });
}
