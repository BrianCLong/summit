import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const DEFAULT_SNAPSHOT_VERSION = '1.0.0';
const DEFAULT_JSON_NAME = 'trust_snapshot.json';
const DEFAULT_MD_NAME = 'trust_snapshot.md';

const DISALLOWED_PATTERNS: Array<{ pattern: RegExp; description: string }> = [
  { pattern: /ghp_[A-Za-z0-9]{20,}/g, description: 'GitHub token' },
  { pattern: /xoxb-[A-Za-z0-9-]{10,}/g, description: 'Slack token' },
  { pattern: /AKIA[0-9A-Z]{16}/g, description: 'AWS access key' },
  { pattern: /-----BEGIN [A-Z ]+-----/g, description: 'PEM block' },
  {
    pattern: /\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g,
    description: 'JWT-like token',
  },
  {
    pattern: /\b(?:localhost|127\.0\.0\.1|0\.0\.0\.0)\b/gi,
    description: 'Localhost reference',
  },
  {
    pattern: /\b(?:10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(?:1[6-9]|2\d|3[0-1])\.\d+\.\d+)\b/g,
    description: 'Private IP',
  },
  { pattern: /\.internal\b/gi, description: 'Internal domain' },
  { pattern: /\.corp\b/gi, description: 'Corp domain' },
  { pattern: /\.local\b/gi, description: 'Local domain' },
  {
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    description: 'Email address',
  },
  { pattern: /\/Users\//g, description: 'User home path' },
  { pattern: /\/home\//g, description: 'Home path' },
  { pattern: /C:\\Users\\/g, description: 'Windows user path' },
  { pattern: /\/workspace\//g, description: 'Workspace path' },
];

type Status = 'pass' | 'fail' | 'unknown';

type BundleMetadata = {
  git_sha?: string;
  workflow_run_id?: string;
  generated_at_utc?: string;
  tool_versions?: Record<string, string>;
};

type Snapshot = {
  snapshot_version: string;
  git_sha: string;
  workflow_run_id: string;
  generated_at_utc: string;
  tool_versions: Record<string, string>;
  ga_gate: {
    status: Status;
    duration_seconds: number | null;
  };
  smoke: {
    status: Status;
    duration_seconds: number | null;
  };
  governance: {
    policy_version: string;
    status: Status;
    controls_satisfied: string[];
  };
  sbom: {
    package_count: number;
    top_packages: Array<{ name: string; version?: string }>;
    licenses: Record<string, number>;
  };
  vulns?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    cves: string[];
  };
  reproducible_build: {
    status: Status;
    digest_summary: Array<{ artifact: string; sha256: string }>;
  };
  provenance: {
    attestation_present: boolean;
    digests: string[];
  };
  schema_integrity: {
    schema_hash: string;
    schema_hash_algo: 'sha256';
  };
  notes?: string;
};

type CliArgs = {
  bundlePath: string;
  outDir: string;
  jsonOut: string;
  mdOut: string;
  schemaPath: string;
  metadataPath?: string;
  notes?: string;
  toolVersions: Record<string, string>;
  gitSha?: string;
  workflowRunId?: string;
  generatedAtUtc?: string;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    bundlePath: '',
    outDir: process.cwd(),
    jsonOut: DEFAULT_JSON_NAME,
    mdOut: DEFAULT_MD_NAME,
    schemaPath: path.join(repoRoot, 'schemas', 'trust_snapshot.schema.json'),
    toolVersions: {},
  };

  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '--bundle':
        args.bundlePath = argv[i + 1];
        i += 1;
        break;
      case '--out-dir':
        args.outDir = argv[i + 1];
        i += 1;
        break;
      case '--json-out':
        args.jsonOut = argv[i + 1];
        i += 1;
        break;
      case '--md-out':
        args.mdOut = argv[i + 1];
        i += 1;
        break;
      case '--schema':
        args.schemaPath = argv[i + 1];
        i += 1;
        break;
      case '--metadata':
        args.metadataPath = argv[i + 1];
        i += 1;
        break;
      case '--notes':
        args.notes = argv[i + 1];
        i += 1;
        break;
      case '--tool-version':
        i += 1;
        const [key, value] = (argv[i] || '').split('=');
        if (!key || !value) {
          throw new Error('Invalid --tool-version format. Use key=value.');
        }
        args.toolVersions[key] = value;
        break;
      case '--git-sha':
        args.gitSha = argv[i + 1];
        i += 1;
        break;
      case '--workflow-run-id':
        args.workflowRunId = argv[i + 1];
        i += 1;
        break;
      case '--generated-at-utc':
        args.generatedAtUtc = argv[i + 1];
        i += 1;
        break;
      case '--help':
      case '-h':
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!args.bundlePath) {
    throw new Error('Missing required --bundle <path>.');
  }

  return args;
}

function printHelp(): void {
  // eslint-disable-next-line no-console
  console.log(`Usage: tsx scripts/release/generate_trust_snapshot.ts --bundle <dir> [options]

Options:
  --out-dir <dir>           Output directory (default: cwd)
  --json-out <file>         JSON filename (default: trust_snapshot.json)
  --md-out <file>           Markdown filename (default: trust_snapshot.md)
  --schema <file>           Schema path override
  --metadata <file>         Metadata JSON override
  --notes <text>            Optional notes (strictly validated)
  --tool-version key=value  Tool versions (repeatable)
  --git-sha <sha>           Override git SHA
  --workflow-run-id <id>    Override workflow run id
  --generated-at-utc <iso>  Override generated timestamp
`);
}

async function listFiles(rootDir: string): Promise<string[]> {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath)));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeStatus(value: string | undefined): Status {
  if (!value) {
    return 'unknown';
  }
  const normalized = value.toLowerCase();
  if (normalized === 'pass' || normalized === 'success') {
    return 'pass';
  }
  if (normalized === 'fail' || normalized === 'failure') {
    return 'fail';
  }
  return 'unknown';
}

function scanForDisallowedContent(label: string, content: string): void {
  for (const { pattern, description } of DISALLOWED_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      throw new Error(`Disallowed content detected in ${label}: ${description}`);
    }
  }
}

async function readJsonIfExists(filePath: string): Promise<unknown | null> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

function findFilesByName(files: string[], nameMatcher: RegExp): string[] {
  return files
    .filter((file) => nameMatcher.test(path.basename(file)))
    .sort((a, b) => a.localeCompare(b));
}

function hashSha256(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function extractToolVersions(metadata: BundleMetadata, overrides: Record<string, string>): Record<string, string> {
  return { ...(metadata.tool_versions ?? {}), ...overrides };
}

function extractGaGateFromReport(report: Record<string, unknown> | null): {
  gaGate: Snapshot['ga_gate'];
  smoke: Snapshot['smoke'];
} {
  if (!report) {
    return {
      gaGate: { status: 'unknown', duration_seconds: null },
      smoke: { status: 'unknown', duration_seconds: null },
    };
  }

  const totalDuration = typeof report.total_duration_seconds === 'number'
    ? report.total_duration_seconds
    : null;

  let gaStatus: Status = 'unknown';
  let smokeStatus: Status = 'unknown';
  let smokeDuration: number | null = null;

  const checks = Array.isArray(report.checks) ? report.checks : [];
  let hasChecks = false;
  let hasFailure = false;

  for (const check of checks) {
    if (typeof check !== 'object' || check === null) {
      continue;
    }
    const name = typeof (check as Record<string, unknown>).name === 'string'
      ? (check as Record<string, unknown>).name
      : '';
    const status = typeof (check as Record<string, unknown>).status === 'string'
      ? (check as Record<string, unknown>).status
      : undefined;
    const duration = typeof (check as Record<string, unknown>).duration_seconds === 'number'
      ? (check as Record<string, unknown>).duration_seconds
      : null;

    if (name) {
      hasChecks = true;
    }

    if (status && status.toLowerCase() === 'fail') {
      hasFailure = true;
    }

    if (name === 'Smoke Test') {
      smokeStatus = normalizeStatus(status);
      smokeDuration = duration;
    }
  }

  if (hasChecks) {
    gaStatus = hasFailure ? 'fail' : 'pass';
  }

  return {
    gaGate: { status: gaStatus, duration_seconds: totalDuration },
    smoke: { status: smokeStatus, duration_seconds: smokeDuration },
  };
}

function extractGovernance(
  lockfile: Record<string, unknown> | null,
  auditLog: Record<string, unknown> | null,
): Snapshot['governance'] {
  const policyVersion = typeof lockfile?.schema_version === 'string'
    ? lockfile.schema_version
    : typeof lockfile?.version === 'string'
      ? lockfile.version
      : 'unknown';

  const controls = new Set<string>();
  const files = Array.isArray(lockfile?.files) ? lockfile?.files : [];
  for (const file of files) {
    if (typeof file !== 'object' || file === null) {
      continue;
    }
    const filePath = typeof (file as Record<string, unknown>).path === 'string'
      ? (file as Record<string, unknown>).path
      : '';
    if (!filePath) {
      continue;
    }
    const baseName = path.basename(filePath).replace(path.extname(filePath), '');
    if (baseName && baseName.endsWith('_POLICY')) {
      controls.add(baseName);
    }
  }

  let status: Status = 'unknown';
  const entries = Array.isArray(auditLog?.entries) ? auditLog?.entries : [];
  if (entries.length > 0) {
    const sortedEntries = [...entries].sort((a, b) => {
      const aTime = typeof (a as Record<string, unknown>).timestamp === 'string'
        ? (a as Record<string, unknown>).timestamp
        : '';
      const bTime = typeof (b as Record<string, unknown>).timestamp === 'string'
        ? (b as Record<string, unknown>).timestamp
        : '';
      return aTime.localeCompare(bTime);
    });
    const lastGateEntry = [...sortedEntries].reverse().find((entry) => {
      if (typeof entry !== 'object' || entry === null) {
        return false;
      }
      const eventType = (entry as Record<string, unknown>).event_type;
      return eventType === 'gate';
    });
    if (lastGateEntry && typeof lastGateEntry === 'object') {
      const entryStatus = (lastGateEntry as Record<string, unknown>).status;
      status = normalizeStatus(typeof entryStatus === 'string' ? entryStatus : undefined);
    }
  }

  return {
    policy_version: policyVersion,
    status,
    controls_satisfied: Array.from(controls).sort((a, b) => a.localeCompare(b)),
  };
}

function extractSbomSummary(sbom: Record<string, unknown> | null): Snapshot['sbom'] {
  if (!sbom) {
    return { package_count: 0, top_packages: [], licenses: {} };
  }

  const licenses: Record<string, number> = {};
  const topPackages: Array<{ name: string; version?: string }> = [];

  if (sbom.bomFormat === 'CycloneDX' && Array.isArray(sbom.components)) {
    for (const component of sbom.components) {
      if (typeof component !== 'object' || component === null) {
        continue;
      }
      const name = typeof (component as Record<string, unknown>).name === 'string'
        ? (component as Record<string, unknown>).name
        : undefined;
      const version = typeof (component as Record<string, unknown>).version === 'string'
        ? (component as Record<string, unknown>).version
        : undefined;
      if (name) {
        topPackages.push({ name, ...(version ? { version } : {}) });
      }

      const componentLicenses = (component as Record<string, unknown>).licenses;
      if (Array.isArray(componentLicenses)) {
        for (const licenseEntry of componentLicenses) {
          if (typeof licenseEntry !== 'object' || licenseEntry === null) {
            continue;
          }
          const license = (licenseEntry as Record<string, unknown>).license;
          const expression = (licenseEntry as Record<string, unknown>).expression;
          let licenseName: string | undefined;
          if (typeof expression === 'string') {
            licenseName = expression;
          } else if (license && typeof license === 'object') {
            const licenseId = (license as Record<string, unknown>).id;
            const licenseLabel = (license as Record<string, unknown>).name;
            if (typeof licenseId === 'string') {
              licenseName = licenseId;
            } else if (typeof licenseLabel === 'string') {
              licenseName = licenseLabel;
            }
          }
          if (licenseName) {
            licenses[licenseName] = (licenses[licenseName] || 0) + 1;
          }
        }
      }
    }

    return {
      package_count: sbom.components.length,
      top_packages: topPackages
        .sort((a, b) => a.name.localeCompare(b.name) || (a.version || '').localeCompare(b.version || ''))
        .slice(0, 10),
      licenses: Object.keys(licenses)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, number>>((acc, key) => {
          acc[key] = licenses[key];
          return acc;
        }, {}),
    };
  }

  if (typeof sbom.spdxVersion === 'string' && Array.isArray(sbom.packages)) {
    for (const pkg of sbom.packages) {
      if (typeof pkg !== 'object' || pkg === null) {
        continue;
      }
      const name = typeof (pkg as Record<string, unknown>).name === 'string'
        ? (pkg as Record<string, unknown>).name
        : undefined;
      const version = typeof (pkg as Record<string, unknown>).versionInfo === 'string'
        ? (pkg as Record<string, unknown>).versionInfo
        : undefined;
      if (name) {
        topPackages.push({ name, ...(version ? { version } : {}) });
      }
      const license = (pkg as Record<string, unknown>).licenseConcluded
        ?? (pkg as Record<string, unknown>).licenseDeclared;
      if (typeof license === 'string') {
        licenses[license] = (licenses[license] || 0) + 1;
      }
    }

    return {
      package_count: sbom.packages.length,
      top_packages: topPackages
        .sort((a, b) => a.name.localeCompare(b.name) || (a.version || '').localeCompare(b.version || ''))
        .slice(0, 10),
      licenses: Object.keys(licenses)
        .sort((a, b) => a.localeCompare(b))
        .reduce<Record<string, number>>((acc, key) => {
          acc[key] = licenses[key];
          return acc;
        }, {}),
    };
  }

  return { package_count: 0, top_packages: [], licenses: {} };
}

type VulnSummary = {
  critical: number;
  high: number;
  medium: number;
  low: number;
  cves: string[];
};

function extractVulnSummary(trivy: Record<string, unknown> | null, audit: Record<string, unknown> | null): VulnSummary {
  if (trivy) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const cves = new Set<string>();
    const results = Array.isArray(trivy.Results) ? trivy.Results : [];
    for (const result of results) {
      if (typeof result !== 'object' || result === null) {
        continue;
      }
      const vulnerabilities = Array.isArray((result as Record<string, unknown>).Vulnerabilities)
        ? (result as Record<string, unknown>).Vulnerabilities
        : [];
      for (const vuln of vulnerabilities) {
        if (typeof vuln !== 'object' || vuln === null) {
          continue;
        }
        const severity = typeof (vuln as Record<string, unknown>).Severity === 'string'
          ? (vuln as Record<string, unknown>).Severity.toLowerCase()
          : '';
        const id = typeof (vuln as Record<string, unknown>).VulnerabilityID === 'string'
          ? (vuln as Record<string, unknown>).VulnerabilityID
          : undefined;

        if (severity === 'critical') counts.critical += 1;
        if (severity === 'high') counts.high += 1;
        if (severity === 'medium') counts.medium += 1;
        if (severity === 'low') counts.low += 1;
        if (id) {
          cves.add(id);
        }
      }
    }
    return {
      ...counts,
      cves: Array.from(cves).sort((a, b) => a.localeCompare(b)),
    };
  }

  if (audit) {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    const cves = new Set<string>();
    const metadata = audit.metadata as Record<string, unknown> | undefined;
    const vulnMetadata = metadata?.vulnerabilities as Record<string, unknown> | undefined;
    if (vulnMetadata) {
      counts.critical += Number(vulnMetadata.critical || 0);
      counts.high += Number(vulnMetadata.high || 0);
      counts.medium += Number(vulnMetadata.moderate || vulnMetadata.medium || 0);
      counts.low += Number(vulnMetadata.low || 0);
    }

    const advisories = audit.advisories as Record<string, unknown> | undefined;
    if (advisories) {
      for (const advisory of Object.values(advisories)) {
        if (typeof advisory !== 'object' || advisory === null) {
          continue;
        }
        const cveList = (advisory as Record<string, unknown>).cves;
        if (Array.isArray(cveList)) {
          for (const cve of cveList) {
            if (typeof cve === 'string') {
              cves.add(cve);
            }
          }
        }
      }
    }

    return {
      ...counts,
      cves: Array.from(cves).sort((a, b) => a.localeCompare(b)),
    };
  }

  return { critical: 0, high: 0, medium: 0, low: 0, cves: [] };
}

function extractReproducibleBuildSummary(digests: Array<{ artifact: string; sha256: string }>): Snapshot['reproducible_build'] {
  const status: Status = digests.length > 0 ? 'pass' : 'unknown';
  const digestSummary = digests
    .sort((a, b) => a.artifact.localeCompare(b.artifact))
    .map((entry) => ({
      artifact: entry.artifact,
      sha256: entry.sha256,
    }));

  return {
    status,
    digest_summary: digestSummary,
  };
}

function collectDigestsFromText(text: string): Array<{ artifact: string; sha256: string }> {
  const digests: Array<{ artifact: string; sha256: string }> = [];
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([a-f0-9]{64})\s+(.+)$/i);
    if (!match) {
      continue;
    }
    const sha256 = match[1].toLowerCase();
    const artifact = path.basename(match[2]);
    digests.push({ artifact, sha256 });
  }
  return digests;
}

function collectSha256Values(value: unknown, digests: Set<string>): void {
  if (typeof value === 'string') {
    if (/^[a-f0-9]{64}$/i.test(value)) {
      digests.add(value.toLowerCase());
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSha256Values(item, digests);
    }
    return;
  }
  if (typeof value === 'object' && value !== null) {
    for (const entry of Object.values(value)) {
      collectSha256Values(entry, digests);
    }
  }
}

function extractProvenanceSummary(provenance: Record<string, unknown> | null, digests: Set<string>): Snapshot['provenance'] {
  if (!provenance) {
    return { attestation_present: false, digests: [] };
  }
  collectSha256Values(provenance, digests);
  return {
    attestation_present: true,
    digests: Array.from(digests).sort((a, b) => a.localeCompare(b)),
  };
}

function buildMarkdown(snapshot: Snapshot): string {
  const lines: string[] = [];
  lines.push('# Public Trust Snapshot');
  lines.push('');
  lines.push(`**Snapshot Version:** ${snapshot.snapshot_version}`);
  lines.push(`**Git SHA:** ${snapshot.git_sha}`);
  lines.push(`**Workflow Run ID:** ${snapshot.workflow_run_id}`);
  lines.push(`**Generated At (UTC):** ${snapshot.generated_at_utc}`);
  lines.push('');

  lines.push('## GA Gate');
  lines.push(`- Status: ${snapshot.ga_gate.status}`);
  lines.push(`- Duration (seconds): ${snapshot.ga_gate.duration_seconds ?? 'unknown'}`);
  lines.push('');

  lines.push('## Smoke Tests');
  lines.push(`- Status: ${snapshot.smoke.status}`);
  lines.push(`- Duration (seconds): ${snapshot.smoke.duration_seconds ?? 'unknown'}`);
  lines.push('');

  lines.push('## Governance');
  lines.push(`- Policy Version: ${snapshot.governance.policy_version}`);
  lines.push(`- Status: ${snapshot.governance.status}`);
  lines.push(`- Controls Satisfied: ${snapshot.governance.controls_satisfied.join(', ') || 'none'}`);
  lines.push('');

  lines.push('## SBOM Summary');
  lines.push(`- Package Count: ${snapshot.sbom.package_count}`);
  lines.push('- Top Packages:');
  if (snapshot.sbom.top_packages.length === 0) {
    lines.push('  - none');
  } else {
    for (const pkg of snapshot.sbom.top_packages) {
      lines.push(`  - ${pkg.name}${pkg.version ? `@${pkg.version}` : ''}`);
    }
  }
  lines.push('- License Distribution:');
  const licenseEntries = Object.entries(snapshot.sbom.licenses);
  if (licenseEntries.length === 0) {
    lines.push('  - none');
  } else {
    for (const [license, count] of licenseEntries) {
      lines.push(`  - ${license}: ${count}`);
    }
  }
  lines.push('');

  if (snapshot.vulns) {
    lines.push('## Vulnerability Summary');
    lines.push(`- Critical: ${snapshot.vulns.critical}`);
    lines.push(`- High: ${snapshot.vulns.high}`);
    lines.push(`- Medium: ${snapshot.vulns.medium}`);
    lines.push(`- Low: ${snapshot.vulns.low}`);
    lines.push(`- CVEs: ${snapshot.vulns.cves.join(', ') || 'none'}`);
    lines.push('');
  }

  lines.push('## Reproducible Build');
  lines.push(`- Status: ${snapshot.reproducible_build.status}`);
  if (snapshot.reproducible_build.digest_summary.length === 0) {
    lines.push('- Digests: none');
  } else {
    lines.push('- Digests:');
    for (const digest of snapshot.reproducible_build.digest_summary) {
      lines.push(`  - ${digest.artifact}: ${digest.sha256}`);
    }
  }
  lines.push('');

  lines.push('## Provenance');
  lines.push(`- Attestation Present: ${snapshot.provenance.attestation_present}`);
  if (snapshot.provenance.digests.length === 0) {
    lines.push('- Digests: none');
  } else {
    lines.push(`- Digests: ${snapshot.provenance.digests.join(', ')}`);
  }
  lines.push('');

  lines.push('## Schema Integrity');
  lines.push(`- Schema Hash: ${snapshot.schema_integrity.schema_hash}`);
  lines.push(`- Hash Algorithm: ${snapshot.schema_integrity.schema_hash_algo}`);
  lines.push('');

  if (snapshot.notes) {
    lines.push('## Notes');
    lines.push(snapshot.notes);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const args = parseArgs(process.argv);
  const bundlePath = path.resolve(args.bundlePath);
  const outDir = path.resolve(args.outDir);

  const files = await listFiles(bundlePath);

  const metadataPath = args.metadataPath
    ? path.resolve(args.metadataPath)
    : path.join(bundlePath, 'bundle_metadata.json');
  const metadata = (await readJsonIfExists(metadataPath)) as BundleMetadata | null;
  const metadataValues = metadata ?? {};

  const gitSha = args.gitSha || metadataValues.git_sha || 'unknown';
  const workflowRunId = args.workflowRunId || metadataValues.workflow_run_id || 'unknown';
  const generatedAtUtc = args.generatedAtUtc || metadataValues.generated_at_utc || 'unknown';
  const toolVersions = extractToolVersions(metadataValues, args.toolVersions);

  const gaReportFile = findFilesByName(files, /^ga_report\.json$/i)[0];
  const gaReport = (await readJsonIfExists(gaReportFile ?? '')) as Record<string, unknown> | null;

  const lockfilePath = findFilesByName(files, /^governance_lockfile\.json$/i)[0]
    ?? findFilesByName(files, /^governance-lockfile\.json$/i)[0];
  const auditLogPath = findFilesByName(files, /^governance_audit_log\.json$/i)[0]
    ?? findFilesByName(files, /^governance-audit-log\.json$/i)[0];
  const lockfile = (await readJsonIfExists(lockfilePath ?? '')) as Record<string, unknown> | null;
  const auditLog = (await readJsonIfExists(auditLogPath ?? '')) as Record<string, unknown> | null;

  const sbomCandidates = findFilesByName(files, /^sbom-.*\.json$/i)
    .concat(findFilesByName(files, /^sbom.*\.json$/i));
  const sbomFile = sbomCandidates.find((file) => /cyclonedx/i.test(file))
    ?? sbomCandidates.find((file) => /spdx/i.test(file))
    ?? sbomCandidates[0];
  const sbom = (await readJsonIfExists(sbomFile ?? '')) as Record<string, unknown> | null;

  const trivyFile = findFilesByName(files, /^trivy-.*\.json$/i)[0];
  const trivy = (await readJsonIfExists(trivyFile ?? '')) as Record<string, unknown> | null;

  const auditFile = findFilesByName(files, /^dependency-audit-.*\.json$/i)[0];
  const audit = (await readJsonIfExists(auditFile ?? '')) as Record<string, unknown> | null;

  const provenanceFile = findFilesByName(files, /provenance.*\.json$/i)[0]
    ?? findFilesByName(files, /attestation.*\.json$/i)[0];
  const provenance = (await readJsonIfExists(provenanceFile ?? '')) as Record<string, unknown> | null;

  const digestSummary: Array<{ artifact: string; sha256: string }> = [];
  const shaSumFile = findFilesByName(files, /^SHA256SUMS$/i)[0];
  if (shaSumFile) {
    const text = await fs.readFile(shaSumFile, 'utf8');
    digestSummary.push(...collectDigestsFromText(text));
  }
  const shaFiles = findFilesByName(files, /\.sha256$/i);
  for (const file of shaFiles) {
    const text = await fs.readFile(file, 'utf8');
    const digest = text.trim().split(/\s+/)[0];
    if (/^[a-f0-9]{64}$/i.test(digest)) {
      digestSummary.push({ artifact: path.basename(file, path.extname(file)), sha256: digest.toLowerCase() });
    }
  }

  const { gaGate, smoke } = extractGaGateFromReport(gaReport);
  const governance = extractGovernance(lockfile, auditLog);
  const sbomSummary = extractSbomSummary(sbom);
  const vulns = extractVulnSummary(trivy, audit);

  const schemaText = await fs.readFile(path.resolve(args.schemaPath), 'utf8');
  const schemaHash = hashSha256(schemaText);

  const provenanceDigests = new Set<string>();
  const provenanceSummary = extractProvenanceSummary(provenance, provenanceDigests);

  const snapshot: Snapshot = {
    snapshot_version: DEFAULT_SNAPSHOT_VERSION,
    git_sha: gitSha,
    workflow_run_id: workflowRunId,
    generated_at_utc: generatedAtUtc,
    tool_versions: Object.keys(toolVersions)
      .sort((a, b) => a.localeCompare(b))
      .reduce<Record<string, string>>((acc, key) => {
        acc[key] = toolVersions[key];
        return acc;
      }, {}),
    ga_gate: gaGate,
    smoke,
    governance,
    sbom: sbomSummary,
    vulns,
    reproducible_build: extractReproducibleBuildSummary(digestSummary),
    provenance: provenanceSummary,
    schema_integrity: {
      schema_hash: schemaHash,
      schema_hash_algo: 'sha256',
    },
    ...(args.notes ? { notes: args.notes } : {}),
  };

  const ajv = new Ajv({ allErrors: true, strict: true });
  addFormats(ajv);
  const schema = JSON.parse(schemaText) as Record<string, unknown>;
  const validate = ajv.compile(schema);
  const valid = validate(snapshot);
  if (!valid) {
    throw new Error(`Schema validation failed: ${ajv.errorsText(validate.errors)}`);
  }

  const jsonContent = JSON.stringify(snapshot, null, 2);
  const mdContent = buildMarkdown(snapshot);

  scanForDisallowedContent('trust_snapshot.json', jsonContent);
  scanForDisallowedContent('trust_snapshot.md', mdContent);

  await fs.mkdir(outDir, { recursive: true });
  await fs.writeFile(path.join(outDir, args.jsonOut), jsonContent);
  await fs.writeFile(path.join(outDir, args.mdOut), mdContent);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
