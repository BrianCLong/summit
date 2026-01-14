import { spawn } from 'child_process';
import crypto from 'crypto';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const DEFAULT_POLICY_PATH = 'docs/security/DEPENDENCY_RISK_POLICY.yml';
const AUDIT_TIMEOUT_MS = 300000;
const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info', 'unknown'];
const VALID_SEVERITIES = new Set(SEVERITY_ORDER);
const VALID_UNKNOWN_LICENSE_BEHAVIOR = new Set(['fail', 'warn']);
const VALID_SOURCE_MODES = new Set(['ci', 'local']);
const VALID_NETWORK_ACCESS = new Set(['ci', 'offline']);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableStringify(value, indent = 2) {
  const seen = new WeakSet();
  const normalize = (input) => {
    if (input === null || typeof input !== 'object') return input;
    if (seen.has(input)) throw new Error('Circular reference detected in report data.');
    seen.add(input);
    if (Array.isArray(input)) return input.map((item) => normalize(item));
    const sortedKeys = Object.keys(input).sort();
    const output = {};
    for (const key of sortedKeys) {
      output[key] = normalize(input[key]);
    }
    return output;
  };
  return `${JSON.stringify(normalize(value), null, indent)}\n`;
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    policy: DEFAULT_POLICY_PATH,
    sha: '',
    out: '',
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--policy') {
      options.policy = args[i + 1];
      i += 1;
    } else if (arg === '--sha') {
      options.sha = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      options.out = args[i + 1];
      i += 1;
    }
  }

  return options;
}

function runCommand(command, args, { timeout } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, timeout });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('close', (code, signal) => {
      if (signal === 'SIGTERM' || signal === 'SIGKILL') {
        return reject(new Error(`${command} timed out`));
      }
      return resolve({ stdout, stderr, code: code ?? 1 });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}

function parseJsonFromOutput(output) {
  const trimmed = output.trim();
  if (!trimmed) return null;
  const firstBrace = trimmed.search(/[\[{]/);
  if (firstBrace === -1) return null;
  const jsonText = trimmed.slice(firstBrace);
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    const lines = jsonText.split('\n').map((line) => line.trim()).filter(Boolean);
    const parsed = [];
    for (const line of lines) {
      try {
        parsed.push(JSON.parse(line));
      } catch {
        continue;
      }
    }
    if (parsed.length === 0) throw error;
    return parsed.length === 1 ? parsed[0] : parsed;
  }
}

function normalizeSeverity(severity) {
  if (!severity) return 'unknown';
  const value = String(severity).toLowerCase();
  return VALID_SEVERITIES.has(value) ? value : 'unknown';
}

function severityRank(severity) {
  return SEVERITY_ORDER.indexOf(normalizeSeverity(severity));
}

function isSeverityAtLeast(severity, threshold) {
  return severityRank(severity) <= severityRank(threshold);
}

async function loadPolicy(policyPath) {
  if (!existsSync(policyPath)) {
    throw new Error(`Policy file not found: ${policyPath}`);
  }
  const content = await readFile(policyPath, 'utf8');
  const policy = yaml.load(content);
  return { policy, content };
}

function validatePolicy(policy) {
  const errors = [];
  if (!policy || typeof policy !== 'object') {
    errors.push('Policy file must be a YAML mapping.');
  }
  if (policy?.schema_version !== '1') {
    errors.push('schema_version must be "1".');
  }
  if (!policy?.scope || !Array.isArray(policy.scope.include_workspaces)) {
    errors.push('scope.include_workspaces must be an array.');
  }
  if (!Array.isArray(policy.scope.exclude_workspaces)) {
    errors.push('scope.exclude_workspaces must be an array.');
  }
  if (policy?.network_access && !VALID_NETWORK_ACCESS.has(policy.network_access)) {
    errors.push('network_access must be "ci" or "offline" when set.');
  }
  const vulnerabilityGate = policy?.vulnerability_gate;
  if (!vulnerabilityGate || typeof vulnerabilityGate.enabled !== 'boolean') {
    errors.push('vulnerability_gate.enabled must be boolean.');
  }
  if (vulnerabilityGate && !VALID_SEVERITIES.has(String(vulnerabilityGate.max_severity).toLowerCase())) {
    errors.push('vulnerability_gate.max_severity must be a valid severity.');
  }
  if (vulnerabilityGate && !Array.isArray(vulnerabilityGate.allowlist)) {
    errors.push('vulnerability_gate.allowlist must be an array.');
  }
  const licenseGate = policy?.license_gate;
  if (!licenseGate || typeof licenseGate.enabled !== 'boolean') {
    errors.push('license_gate.enabled must be boolean.');
  }
  if (licenseGate && !Array.isArray(licenseGate.denylist)) {
    errors.push('license_gate.denylist must be an array.');
  }
  if (licenseGate && !Array.isArray(licenseGate.allowlist)) {
    errors.push('license_gate.allowlist must be an array.');
  }
  if (licenseGate && !VALID_UNKNOWN_LICENSE_BEHAVIOR.has(licenseGate.unknown_license_behavior)) {
    errors.push('license_gate.unknown_license_behavior must be "fail" or "warn".');
  }
  if (!Array.isArray(policy?.audit_sources)) {
    errors.push('audit_sources must be an array.');
  }
  for (const source of policy?.audit_sources ?? []) {
    if (!source.type) {
      errors.push('audit_sources entries must include type.');
    }
    if (typeof source.enabled !== 'boolean') {
      errors.push(`audit_sources.${source.type}.enabled must be boolean.`);
    }
    if (source.mode && !VALID_SOURCE_MODES.has(source.mode)) {
      errors.push(`audit_sources.${source.type}.mode must be "ci" or "local".`);
    }
  }
  if (!policy?.output?.out_dir) {
    errors.push('output.out_dir is required.');
  }

  if (errors.length > 0) {
    const error = new Error(`Policy validation failed:\n- ${errors.join('\n- ')}`);
    error.name = 'PolicyValidationError';
    throw error;
  }
}

function normalizeAllowlist(allowlist) {
  const now = new Date();
  const entries = [];
  const expired = [];

  for (const entry of allowlist ?? []) {
    if (!entry?.id) continue;
    const expires = entry.expires ? new Date(entry.expires) : null;
    if (expires && Number.isNaN(expires.getTime())) {
      expired.push({ entry, reason: 'Invalid expiry date' });
      continue;
    }
    if (expires && expires < now) {
      expired.push({ entry, reason: 'Expired allowlist entry' });
      continue;
    }
    entries.push(entry);
  }

  return { entries, expired };
}

function normalizeVia(via) {
  if (Array.isArray(via)) {
    return via.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') return item.title || item.name || item.url || String(item.source || '');
      return '';
    }).filter(Boolean);
  }
  if (typeof via === 'string') return [via];
  return [];
}

function normalizeAuditReport(report, source) {
  const vulnerabilities = [];
  if (!report) return vulnerabilities;

  if (Array.isArray(report)) {
    for (const entry of report) {
      vulnerabilities.push(...normalizeAuditReport(entry, source));
    }
    return vulnerabilities;
  }

  if (report.advisories) {
    const advisories = Object.values(report.advisories);
    for (const advisory of advisories) {
      const fixAvailable = advisory.patched_versions && advisory.patched_versions !== '<0.0.0';
      const via = advisory.findings?.flatMap((finding) => finding.paths ?? []) ?? [];
      vulnerabilities.push({
        id: String(advisory.github_advisory_id || advisory.cwe || advisory.id || advisory.title || advisory.module_name),
        severity: normalizeSeverity(advisory.severity),
        package: advisory.module_name,
        version: advisory.findings?.[0]?.version || advisory.module_name,
        via: via.length > 0 ? via : [advisory.title].filter(Boolean),
        fix_available: Boolean(fixAvailable),
        source,
      });
    }
    return vulnerabilities;
  }

  if (report.vulnerabilities) {
    for (const [name, vuln] of Object.entries(report.vulnerabilities)) {
      const viaEntries = Array.isArray(vuln.via) ? vuln.via : [];
      const viaList = normalizeVia(viaEntries);
      const fixAvailable = typeof vuln.fixAvailable === 'boolean'
        ? vuln.fixAvailable
        : Boolean(vuln.fixAvailable && typeof vuln.fixAvailable === 'object');

      const advisorySources = viaEntries
        .filter((via) => via && typeof via === 'object' && via.source)
        .map((via) => ({
          id: String(via.source),
          title: via.title || via.name || name,
        }));

      if (advisorySources.length > 0) {
        for (const advisory of advisorySources) {
          vulnerabilities.push({
            id: advisory.id,
            severity: normalizeSeverity(vuln.severity),
            package: name,
            version: vuln.range || vuln.version || vuln.currentVersion || 'unknown',
            via: viaList.length > 0 ? viaList : [advisory.title],
            fix_available: fixAvailable,
            source,
          });
        }
      } else {
        vulnerabilities.push({
          id: String(vuln.name || name),
          severity: normalizeSeverity(vuln.severity),
          package: name,
          version: vuln.range || vuln.version || vuln.currentVersion || 'unknown',
          via: viaList,
          fix_available: fixAvailable,
          source,
        });
      }
    }
  }

  return vulnerabilities;
}

function normalizeLicenseValue(license) {
  if (!license) return 'UNKNOWN';
  if (typeof license === 'string') return license.trim() || 'UNKNOWN';
  if (Array.isArray(license)) {
    const items = license
      .map((item) => normalizeLicenseValue(item))
      .filter(Boolean);
    return items.length ? items.join(' OR ') : 'UNKNOWN';
  }
  if (license && typeof license === 'object') {
    if (license.type) return String(license.type).trim() || 'UNKNOWN';
    if (license.name) return String(license.name).trim() || 'UNKNOWN';
  }
  return 'UNKNOWN';
}

function splitLicenseExpression(license) {
  return license
    .split(/\s+(?:OR|AND)\s+/i)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeLicenseId(license) {
  return license.trim().toUpperCase();
}

function resolvePackageJsonPath(entry) {
  if (entry.path) {
    return path.join(entry.path, 'package.json');
  }
  const sanitized = entry.name.replace('/', '+');
  return path.join(repoRoot, 'node_modules', '.pnpm', `${sanitized}@${entry.version}`, 'node_modules', entry.name, 'package.json');
}

async function collectDependencyTree() {
  const { stdout } = await runCommand('pnpm', ['list', '--json', '--depth', 'Infinity', '--recursive']);
  const parsed = parseJsonFromOutput(stdout);
  if (!parsed) return [];
  return Array.isArray(parsed) ? parsed : [parsed];
}

function collectDependencies(nodes) {
  const dependencies = new Map();

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.name && node.version && node.path && node.path.includes('node_modules')) {
      const key = `${node.name}@${node.version}`;
      if (!dependencies.has(key)) {
        dependencies.set(key, { name: node.name, version: node.version, path: node.path });
      }
    }
    const childDeps = node.dependencies || {};
    for (const child of Object.values(childDeps)) {
      visit(child);
    }
  };

  for (const node of nodes) {
    visit(node);
  }

  return Array.from(dependencies.values());
}

async function collectLicenses(entries) {
  const results = [];
  for (const entry of entries) {
    const packageJsonPath = resolvePackageJsonPath(entry);
    let license = 'UNKNOWN';
    if (existsSync(packageJsonPath)) {
      try {
        const pkgRaw = await readFile(packageJsonPath, 'utf8');
        const pkg = JSON.parse(pkgRaw);
        license = normalizeLicenseValue(pkg.license || pkg.licenses);
      } catch {
        license = 'UNKNOWN';
      }
    }
    results.push({
      package: entry.name,
      version: entry.version,
      license,
      source: 'package.json',
    });
  }
  return results;
}

async function getToolVersions() {
  const versions = { node: process.version };
  try {
    const { stdout } = await runCommand('pnpm', ['-v']);
    versions.pnpm = stdout.trim();
  } catch {
    versions.pnpm = 'unknown';
  }
  return versions;
}

function sortVulnerabilities(list) {
  return [...list].sort((a, b) => {
    const severityDiff = severityRank(a.severity) - severityRank(b.severity);
    if (severityDiff !== 0) return severityDiff;
    const idDiff = a.id.localeCompare(b.id);
    if (idDiff !== 0) return idDiff;
    return a.package.localeCompare(b.package);
  });
}

function sortLicenses(list) {
  return [...list].sort((a, b) => {
    const pkgDiff = a.package.localeCompare(b.package);
    if (pkgDiff !== 0) return pkgDiff;
    return a.version.localeCompare(b.version);
  });
}

async function writeArtifacts(outDir, report, reportMarkdown, stamp) {
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'report.json'), stableStringify(report));
  await writeFile(path.join(outDir, 'report.md'), reportMarkdown);
  await writeFile(path.join(outDir, 'stamp.json'), stableStringify(stamp));
}

function formatReportMarkdown(report, policy, violations) {
  const vulnCount = report.vulnerabilities.length;
  const licenseCount = report.licenses.length;
  const allowlistCount = report.policy.allowlist_hits.vulnerabilities.length;
  const summary = [
    `# Dependency Risk Gate Report`,
    ``,
    `**Repository:** ${report.metadata.repo}`,
    `**SHA:** ${report.metadata.sha}`,
    `**Timestamp:** ${report.metadata.timestamp}`,
    `**Policy Hash:** ${report.policy.hash}`,
    ``,
    `## Summary`,
    `- Vulnerabilities found: ${vulnCount}`,
    `- Allowlisted (Governed Exceptions): ${allowlistCount}`,
    `- License records: ${licenseCount}`,
    `- Verdict: ${report.verdict.status.toUpperCase()}`,
    ``,
  ];

  if (violations.length > 0) {
    summary.push('## Violations', ...violations.map((item) => `- ${item}`), '');
  } else {
    summary.push('## Violations', '- None', '');
  }

  summary.push(
    '## Remediation Actions',
    '- Update dependencies to versions that address the cited CVEs.',
    '- Remove or replace dependencies that violate license policy.',
    '- If a temporary exception is required, add a time-bound allowlist entry with rationale.',
    '',
    '## How to Add a Governed Exception',
    '```yaml',
    'vulnerability_gate:',
    '  allowlist:',
    '    - id: "GHSA-xxxx-xxxx-xxxx"',
    '      expires: "2026-03-01"',
    '      rationale: "Vendor patch queued; remediation scheduled."',
    '```',
    '',
    `Policy location: docs/security/DEPENDENCY_RISK_POLICY.yml`,
    '',
    `Network access mode: ${policy.network_access ?? 'ci'}`,
  );

  return `${summary.join('\n')}\n`;
}

async function main() {
  const { policy: policyPath, sha: inputSha, out: outputOverride } = parseArgs();
  const metadata = {
    repo: path.basename(repoRoot),
    sha: inputSha,
    timestamp: new Date().toISOString(),
    tool_versions: await getToolVersions(),
    sources: [],
  };

  try {
    const { policy, content: policyContent } = await loadPolicy(policyPath);
    validatePolicy(policy);

    const shaResult = metadata.sha || (await runCommand('git', ['rev-parse', 'HEAD'])).stdout.trim();
    metadata.sha = shaResult;

    const outputDir = outputOverride
      || policy.output.out_dir.replace('${sha}', metadata.sha);

    const policyHash = sha256(policyContent);
    const allowlistInfo = normalizeAllowlist(policy.vulnerability_gate.allowlist);

    const dependencyTree = await collectDependencyTree();
    const dependencyEntries = collectDependencies(dependencyTree);

    const licenses = policy.license_gate.enabled
      ? await collectLicenses(dependencyEntries)
      : [];

    const licenseViolations = [];
    const normalizedAllowlist = new Set(policy.license_gate.allowlist.map(normalizeLicenseId));
    const normalizedDenylist = new Set(policy.license_gate.denylist.map(normalizeLicenseId));
    const unknownBehavior = policy.license_gate.unknown_license_behavior;

    if (policy.license_gate.enabled) {
      for (const entry of licenses) {
        const licenseValue = normalizeLicenseValue(entry.license);
        const licenseTokens = splitLicenseExpression(licenseValue).map(normalizeLicenseId);
        const isUnknown = licenseValue === 'UNKNOWN';
        const hasDenied = licenseTokens.some((token) => normalizedDenylist.has(token));
        const allowlistOnly = normalizedAllowlist.size > 0
          ? licenseTokens.every((token) => normalizedAllowlist.has(token))
          : true;

        if (isUnknown) {
          if (unknownBehavior === 'fail') {
            licenseViolations.push(`Unknown license for ${entry.package}@${entry.version}`);
          }
          continue;
        }
        if (hasDenied) {
          licenseViolations.push(`Denylisted license ${licenseValue} for ${entry.package}@${entry.version}`);
        } else if (!allowlistOnly) {
          licenseViolations.push(`License ${licenseValue} not in allowlist for ${entry.package}@${entry.version}`);
        }
      }
    }

    let vulnerabilities = [];
    if (policy.vulnerability_gate.enabled) {
      const auditSource = policy.audit_sources.find((source) => source.type === 'pnpm_audit');
      if (auditSource?.enabled) {
        const isCi = Boolean(process.env.CI);
        if (auditSource.mode === 'ci' && !isCi) {
          metadata.sources.push({ type: auditSource.type, status: 'skipped', notes: 'CI-only source skipped locally.' });
        } else if (policy.network_access === 'offline') {
          metadata.sources.push({ type: auditSource.type, status: 'skipped', notes: 'Policy set to offline.' });
        } else {
          const auditResult = await runCommand('pnpm', ['audit', '--json'], { timeout: AUDIT_TIMEOUT_MS });
          const auditReport = parseJsonFromOutput(auditResult.stdout);
          if (!auditReport && auditResult.code !== 0) {
            metadata.sources.push({ type: auditSource.type, status: 'failed', notes: 'Audit failed with no JSON output.' });
            throw new Error('pnpm audit failed to emit JSON output.');
          }
          vulnerabilities = normalizeAuditReport(auditReport, auditSource.type);
          metadata.sources.push({
            type: auditSource.type,
            status: 'run',
            notes: auditResult.code === 0 ? 'Completed.' : 'Completed with findings.',
          });
        }
      }
    }

    const allowlistHits = [];
    const activeAllowlist = new Map(allowlistInfo.entries.map((entry) => [entry.id, entry]));

    const vulnerabilityViolations = [];
    const severityThreshold = normalizeSeverity(policy.vulnerability_gate.max_severity);

    for (const vuln of vulnerabilities) {
      const allowlisted = activeAllowlist.get(vuln.id);
      if (allowlisted) {
        allowlistHits.push({
          id: allowlisted.id,
          expires: allowlisted.expires,
          rationale: allowlisted.rationale,
        });
        continue;
      }
      if (isSeverityAtLeast(vuln.severity, severityThreshold)) {
        vulnerabilityViolations.push(
          `${vuln.severity.toUpperCase()} ${vuln.id} in ${vuln.package}@${vuln.version}`,
        );
      }
    }

    for (const expired of allowlistInfo.expired) {
      vulnerabilityViolations.push(`Expired allowlist entry ${expired.entry.id}: ${expired.reason}`);
    }

    const report = {
      metadata,
      vulnerabilities: sortVulnerabilities(vulnerabilities),
      licenses: sortLicenses(licenses),
      policy: {
        hash: policyHash,
        decisions: {
          vulnerability_gate: {
            status: vulnerabilityViolations.length === 0 ? 'pass' : 'fail',
            max_severity: severityThreshold,
            violations: vulnerabilityViolations.length,
          },
          license_gate: {
            status: licenseViolations.length === 0 ? 'pass' : 'fail',
            unknown_behavior: unknownBehavior,
            violations: licenseViolations.length,
          },
        },
        allowlist_hits: {
          vulnerabilities: allowlistHits,
        },
      },
      verdict: {
        status: (vulnerabilityViolations.length === 0 && licenseViolations.length === 0) ? 'pass' : 'fail',
        reasons: [...vulnerabilityViolations, ...licenseViolations].sort(),
      },
    };

    const reportHash = sha256(stableStringify(report, 0));
    const stamp = {
      status: report.verdict.status,
      sha: metadata.sha,
      policy_hash: policyHash,
      report_hash: reportHash,
      timestamp: metadata.timestamp,
    };

    const reportMarkdown = formatReportMarkdown(report, policy, report.verdict.reasons);

    await writeArtifacts(outputDir, report, reportMarkdown, stamp);

    if (report.verdict.status !== 'pass') {
      process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Dependency risk gate failed: ${message}`);
    process.exit(2);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}

export { main };
