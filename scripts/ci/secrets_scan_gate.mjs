import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { minimatch } from 'minimatch';
import {
  compileRules,
  extractMatches,
  hashMatch,
  redactMatch,
  SEVERITY_RANK,
} from './lib/secrets_rules.mjs';
import { loadSecretsPolicy, resolveOutputDir } from './lib/secrets_policy.mjs';

const DEFAULT_POLICY_PATH = 'docs/security/SECRETS_SCAN_POLICY.yml';
const DEFAULT_MODE = 'all';

const args = process.argv.slice(2);
const options = {
  policyPath: DEFAULT_POLICY_PATH,
  sha: null,
  outDir: null,
  mode: DEFAULT_MODE,
};

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--policy') {
    options.policyPath = args[i + 1];
    i += 1;
  } else if (arg === '--sha') {
    options.sha = args[i + 1];
    i += 1;
  } else if (arg === '--out') {
    options.outDir = args[i + 1];
    i += 1;
  } else if (arg === '--mode') {
    options.mode = args[i + 1];
    i += 1;
  }
}

const repoRoot = execSync('git rev-parse --show-toplevel', {
  encoding: 'utf8',
}).trim();
process.chdir(repoRoot);

const sha = options.sha || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();

let policy;
let policyHash;
try {
  const policyResult = loadSecretsPolicy(options.policyPath);
  policy = policyResult.policy;
  policyHash = policyResult.policyHash;
} catch (error) {
  console.error(`Secrets scan policy load failed: ${error.message}`);
  process.exit(2);
}

const outDir = options.outDir || resolveOutputDir(policy.output.out_dir, sha);
const mode = options.mode || DEFAULT_MODE;

if (!['repo', 'artifacts', 'all'].includes(mode)) {
  console.error(`Invalid mode: ${mode}. Expected repo, artifacts, or all.`);
  process.exit(2);
}

const includeGlobs = policy.scan.include_globs;
const excludeGlobs = policy.scan.exclude_globs;
const maxFileSizeBytes = policy.scan.max_file_size_bytes;
const rules = compileRules(policy.rules);
const allowlistEntries = policy.allowlist ?? [];

const now = new Date();
const toPosix = (filePath) => filePath.split(path.sep).join('/');
const matchesGlob = (filePath, globs) =>
  globs.some((glob) => minimatch(filePath, glob, { dot: true }));

const scannedFiles = [];
const skipped = {
  binary: 0,
  too_large: 0,
  missing: 0,
  unmatched: 0,
};

const findings = [];
const allowlisted = [];
const allowlistExpired = [];

function listRepoFiles() {
  const output = execSync('git ls-files -z', { encoding: 'utf8' });
  return output.split('\0').filter(Boolean).map((file) => toPosix(file));
}

function walkArtifacts(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const sorted = entries.sort((a, b) => a.name.localeCompare(b.name));
  const files = [];

  for (const entry of sorted) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkArtifacts(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function shouldScan(filePath) {
  if (!matchesGlob(filePath, includeGlobs)) {
    skipped.unmatched += 1;
    return false;
  }
  if (matchesGlob(filePath, excludeGlobs)) {
    skipped.unmatched += 1;
    return false;
  }
  return true;
}

function isBinary(buffer) {
  return buffer.includes(0);
}

function isAllowlisted(finding) {
  const matchingEntries = allowlistEntries.filter((entry) => {
    if (entry.rule_id !== finding.rule_id) {
      return false;
    }
    if (entry.match_hash !== finding.match_hash) {
      return false;
    }

    return minimatch(finding.path, entry.path, { dot: true });
  });

  if (matchingEntries.length === 0) {
    return { allowed: false, expired: false };
  }

  const activeEntries = matchingEntries.filter((entry) => {
    const expires = new Date(`${entry.expires}T00:00:00Z`);
    return expires >= now;
  });

  if (activeEntries.length > 0) {
    return { allowed: true, expired: false, entry: activeEntries[0] };
  }

  return { allowed: false, expired: true, entry: matchingEntries[0] };
}

function scanFile(filePath) {
  if (!fs.existsSync(filePath)) {
    skipped.missing += 1;
    return;
  }

  const stats = fs.statSync(filePath);
  if (stats.size > maxFileSizeBytes) {
    skipped.too_large += 1;
    return;
  }

  const buffer = fs.readFileSync(filePath);
  if (isBinary(buffer)) {
    skipped.binary += 1;
    return;
  }

  const text = buffer.toString('utf8');
  const lines = text.split(/\r?\n/);

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const rule of rules) {
      const matches = extractMatches(rule, line);
      for (const match of matches) {
        const matchHash = hashMatch(match.matchText);
        const redactedPreview = redactMatch(rule.id, match.matchText);
        const finding = {
          path: filePath,
          line: lineIndex + 1,
          column: match.index + 1,
          rule_id: rule.id,
          severity: rule.severity,
          match_hash: matchHash,
          redacted_preview: redactedPreview,
        };

        const allowlistResult = isAllowlisted(finding);
        if (allowlistResult.allowed) {
          allowlisted.push({
            ...finding,
            allowlist_id: allowlistResult.entry.id,
          });
          continue;
        }

        if (allowlistResult.expired) {
          allowlistExpired.push({
            ...finding,
            allowlist_id: allowlistResult.entry.id,
            expires: allowlistResult.entry.expires,
          });
        }

        findings.push(finding);
      }
    }
  }

  scannedFiles.push(filePath);
}

let fileList = [];
if (mode === 'repo' || mode === 'all') {
  fileList.push(...listRepoFiles());
}
if (mode === 'artifacts' || mode === 'all') {
  const artifactFiles = walkArtifacts(path.join(repoRoot, 'artifacts'))
    .map((file) => toPosix(path.relative(repoRoot, file)));
  fileList.push(...artifactFiles);
}

fileList = Array.from(new Set(fileList)).sort();

for (const filePath of fileList) {
  if (!shouldScan(filePath)) {
    continue;
  }
  scanFile(filePath);
}

findings.sort((a, b) =>
  a.path.localeCompare(b.path) ||
  a.line - b.line ||
  a.column - b.column ||
  a.rule_id.localeCompare(b.rule_id) ||
  a.match_hash.localeCompare(b.match_hash),
);

allowlisted.sort((a, b) =>
  a.path.localeCompare(b.path) ||
  a.line - b.line ||
  a.column - b.column ||
  a.rule_id.localeCompare(b.rule_id) ||
  a.match_hash.localeCompare(b.match_hash),
);

allowlistExpired.sort((a, b) =>
  a.path.localeCompare(b.path) ||
  a.line - b.line ||
  a.column - b.column ||
  a.rule_id.localeCompare(b.rule_id) ||
  a.match_hash.localeCompare(b.match_hash),
);

const blockingFindings = findings.filter(
  (finding) => SEVERITY_RANK[finding.severity] >= SEVERITY_RANK.medium,
);

const status = blockingFindings.length > 0 ? 'fail' : 'pass';

const report = {
  meta: {
    sha,
    mode,
    policy_path: options.policyPath,
    policy_hash: policyHash,
    scanned_at: new Date().toISOString(),
    max_file_size_bytes: maxFileSizeBytes,
    rules_count: rules.length,
    allowlist_entries: allowlistEntries.length,
    files_scanned: scannedFiles.length,
    files_total: fileList.length,
    files_skipped: skipped,
  },
  summary: {
    findings: findings.length,
    allowlisted: allowlisted.length,
    allowlist_expired: allowlistExpired.length,
    blocking_findings: blockingFindings.length,
    status,
  },
  findings,
  allowlisted,
  allowlist_expired: allowlistExpired,
};

const reportDir = path.resolve(repoRoot, outDir);
fs.mkdirSync(reportDir, { recursive: true });
const reportJsonPath = path.join(reportDir, 'report.json');
const reportMdPath = path.join(reportDir, 'report.md');
const stampPath = path.join(reportDir, 'stamp.json');

const reportJson = `${JSON.stringify(report, null, 2)}\n`;
fs.writeFileSync(reportJsonPath, reportJson, 'utf8');

const reportLines = [];
reportLines.push('# Secrets Hygiene Scan Report');
reportLines.push('');
reportLines.push(`- Status: **${status.toUpperCase()}**`);
reportLines.push(`- Git SHA: ${sha}`);
reportLines.push(`- Mode: ${mode}`);
reportLines.push(`- Policy Hash: ${policyHash}`);
reportLines.push('');
reportLines.push('## Summary');
reportLines.push(`- Files scanned: ${scannedFiles.length}`);
reportLines.push(`- Files total: ${fileList.length}`);
reportLines.push(`- Findings: ${findings.length}`);
reportLines.push(`- Allowlisted: ${allowlisted.length}`);
reportLines.push(`- Allowlist expired: ${allowlistExpired.length}`);
reportLines.push('');

if (findings.length > 0) {
  reportLines.push('## Findings');
  for (const finding of findings) {
    reportLines.push(
      `- ${finding.path}:${finding.line}:${finding.column} ` +
        `[${finding.severity}] ${finding.rule_id} ` +
        `(hash: ${finding.match_hash}) preview: ${finding.redacted_preview}`,
    );
  }
  reportLines.push('');
}

if (allowlisted.length > 0) {
  reportLines.push('## Allowlisted Findings');
  for (const finding of allowlisted) {
    reportLines.push(
      `- ${finding.path}:${finding.line}:${finding.column} ` +
        `[${finding.severity}] ${finding.rule_id} ` +
        `(allowlist: ${finding.allowlist_id}, hash: ${finding.match_hash}) ` +
        `preview: ${finding.redacted_preview}`,
    );
  }
  reportLines.push('');
}

if (allowlistExpired.length > 0) {
  reportLines.push('## Expired Allowlist Entries (Blocking)');
  for (const finding of allowlistExpired) {
    reportLines.push(
      `- ${finding.path}:${finding.line}:${finding.column} ` +
        `[${finding.severity}] ${finding.rule_id} ` +
        `(allowlist: ${finding.allowlist_id}, expired: ${finding.expires}, ` +
        `hash: ${finding.match_hash}) preview: ${finding.redacted_preview}`,
    );
  }
  reportLines.push('');
}

reportLines.push('## Remediation');
reportLines.push('- Remove the secret material and rotate affected credentials.');
reportLines.push('- If the match is a false positive, add an allowlist entry with a future expiry and rationale.');
reportLines.push('- Re-run `pnpm ci:secrets-scan` to produce a clean report.');
reportLines.push('');

fs.writeFileSync(reportMdPath, `${reportLines.join('\n')}\n`, 'utf8');

const reportHash = hashMatch(reportJson);
const stamp = {
  status,
  sha,
  mode,
  policy_hash: policyHash,
  report_hash: reportHash,
  timestamp: new Date().toISOString(),
};

fs.writeFileSync(`${stampPath}`, `${JSON.stringify(stamp, null, 2)}\n`, 'utf8');

if (status === 'fail') {
  console.error(`Secrets scan failed with ${blockingFindings.length} blocking findings.`);
  process.exit(1);
}

console.log(`Secrets scan passed. Findings: ${findings.length}. Allowlisted: ${allowlisted.length}.`);
process.exit(0);
