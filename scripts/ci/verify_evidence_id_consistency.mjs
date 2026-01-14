import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';

const POLICY_PATH = 'docs/governance/EVIDENCE_ID_POLICY.yml';
const GOVERNANCE_DIR = 'docs/governance';
const HEADER_SCAN_LINES = 30;
const DEFAULT_EVIDENCE_MAP = 'docs/ga/evidence_map.yml';

const STATUS_VALUES = new Set(['active', 'planned', 'deprecated']);

const hashText = (text) => createHash('sha256').update(text).digest('hex');

const readText = async (filePath) => fs.readFile(filePath, 'utf8');

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const resolveSha = () => {
  if (process.env.GITHUB_SHA) {
    return process.env.GITHUB_SHA;
  }
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
};

const normalizeStatus = (value) => {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (STATUS_VALUES.has(normalized)) {
    return normalized;
  }
  return null;
};

const listMarkdownFiles = async (rootDir) => {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listMarkdownFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }
  return files.sort();
};

const parseHeader = (lines) => {
  let status = null;
  let evidenceLine = null;

  for (const line of lines.slice(0, HEADER_SCAN_LINES)) {
    const statusMatch = line.match(
      /^\s*(?:>\s*)?(?:\*\*|__)?Status(?:\*\*|__)?\s*:\s*(.+)$/i,
    );
    if (statusMatch && !status) {
      status = normalizeStatus(statusMatch[1]);
    }

    const evidenceMatch = line.match(
      /^\s*(?:>\s*)?(?:\*\*|__)?Evidence-IDs?(?:\*\*|__)?\s*:\s*(.+)$/i,
    );
    if (evidenceMatch && evidenceLine === null) {
      evidenceLine = evidenceMatch[1].trim();
    }
  }

  return { status, evidenceLine };
};

const parseEvidenceLine = (rawValue, allowedSpecialValues) => {
  if (rawValue === null) {
    return { type: 'missing', ids: [], usesNone: false, invalidMixed: false };
  }

  if (rawValue.length === 0) {
    return { type: 'empty', ids: [], usesNone: false, invalidMixed: false };
  }

  const parts = rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  const allowed = new Set(
    (allowedSpecialValues ?? []).map((value) => value.toLowerCase()),
  );

  if (parts.length === 1 && allowed.has(parts[0].toLowerCase())) {
    return {
      type: 'special',
      ids: [],
      usesNone: true,
      invalidMixed: false,
      specialValue: parts[0],
    };
  }

  const hasSpecial = parts.some((value) => allowed.has(value.toLowerCase()));

  return {
    type: 'list',
    ids: parts,
    usesNone: false,
    invalidMixed: hasSpecial,
  };
};

const extractEvidenceMap = (rawContent) => {
  try {
    const parsed = yaml.load(rawContent);
    const candidates = [];

    if (Array.isArray(parsed)) {
      candidates.push(parsed);
    }

    if (parsed && typeof parsed === 'object') {
      for (const key of ['evidence', 'items', 'entries', 'map', 'controls']) {
        if (Array.isArray(parsed[key])) {
          candidates.push(parsed[key]);
        }
      }
    }

    if (candidates.length > 0) {
      const entries = candidates.flat();
      const map = new Map();
      for (const entry of entries) {
        if (typeof entry === 'string') {
          map.set(entry, { status: null });
        } else if (entry && typeof entry === 'object' && entry.id) {
          map.set(String(entry.id), {
            status: entry.status ? String(entry.status).toLowerCase() : null,
          });
        }
      }

      if (map.size > 0) {
        return map;
      }
    }
  } catch {
    // fallback to line-based extraction
  }

  const map = new Map();
  let currentId = null;

  rawContent.split(/\r?\n/).forEach((line) => {
    const idMatch = line.match(
      /^\s*(?:-\s*)?id\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))/i,
    );
    if (idMatch) {
      const idValue = idMatch[1] || idMatch[2] || idMatch[3];
      currentId = idValue;
      map.set(idValue, { status: null });
      return;
    }

    const statusMatch = line.match(
      /^\s*(?:-\s*)?status\s*:\s*(?:"([^"]+)"|'([^']+)'|([^\s#]+))/i,
    );
    if (statusMatch && currentId) {
      const statusValue = statusMatch[1] || statusMatch[2] || statusMatch[3];
      map.set(currentId, { status: statusValue.toLowerCase() });
    }
  });

  return map;
};

const sortIssues = (issues) =>
  [...issues].sort((a, b) => {
    const pathCompare = a.path.localeCompare(b.path);
    if (pathCompare !== 0) return pathCompare;
    const evidenceA = a.evidence_id ?? '';
    const evidenceB = b.evidence_id ?? '';
    const evidenceCompare = evidenceA.localeCompare(evidenceB);
    if (evidenceCompare !== 0) return evidenceCompare;
    return a.type.localeCompare(b.type);
  });

const buildIssue = ({
  path: docPath,
  type,
  evidenceId = null,
  message,
  remediation,
}) => ({
  path: docPath,
  type,
  evidence_id: evidenceId,
  message,
  remediation,
});

const generateReportMd = ({
  status,
  sha,
  policyHash,
  evidenceMapPath,
  docsChecked,
  evidenceIdsKnown,
  violations,
  warnings,
}) => {
  const lines = [];
  lines.push('# Evidence ID Consistency Report');
  lines.push('');
  lines.push(`Status: **${status.toUpperCase()}**`);
  lines.push(`SHA: \`${sha}\``);
  lines.push(`Policy Hash: \`${policyHash}\``);
  lines.push(`Evidence Map: \`${evidenceMapPath}\``);
  lines.push(`Docs Checked: **${docsChecked}**`);
  lines.push(`Known Evidence IDs: **${evidenceIdsKnown}**`);
  lines.push('');

  const formatIssues = (label, items) => {
    lines.push(`## ${label} (${items.length})`);
    if (items.length === 0) {
      lines.push('No entries.');
      lines.push('');
      return;
    }
    lines.push('');
    for (const issue of items) {
      lines.push(`- **${issue.path}**`);
      lines.push(`  - Type: \`${issue.type}\``);
      if (issue.evidence_id) {
        lines.push(`  - Evidence ID: \`${issue.evidence_id}\``);
      }
      lines.push(`  - Message: ${issue.message}`);
      lines.push(`  - Remediation: ${issue.remediation}`);
    }
    lines.push('');
  };

  formatIssues('Violations', violations);
  formatIssues('Warnings', warnings);

  return lines.join('\n');
};

const resolveEvidenceMapPath = async (policyPathValue) => {
  const candidates = [
    policyPathValue,
    DEFAULT_EVIDENCE_MAP,
    'docs/ga/evidence_map.yaml',
    'docs/ga/EVIDENCE_MAP.yml',
    'docs/ga/EVIDENCE_MAP.yaml',
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }
  return null;
};

const main = async () => {
  if (!(await fileExists(POLICY_PATH))) {
    console.error(`Missing policy file: ${POLICY_PATH}`);
    process.exit(2);
  }

  const policyContent = await readText(POLICY_PATH);
  const policy = yaml.load(policyContent) ?? {};

  const policyHash = hashText(policyContent);
  const sha = resolveSha();

  const evidenceMapPath = await resolveEvidenceMapPath(policy.evidence_map_path);
  if (!evidenceMapPath) {
    console.error('Evidence map not found. Update policy or add evidence map file.');
    process.exit(2);
  }

  const evidenceMapContent = await readText(evidenceMapPath);
  const evidenceMap = extractEvidenceMap(evidenceMapContent);

  const evidenceIdsKnown = evidenceMap.size;

  const reportOutDirTemplate =
    policy.report_out_dir ??
    'artifacts/governance/evidence-id-consistency/${sha}';
  const reportOutDir = reportOutDirTemplate.replace('${sha}', sha);

  const allowedSpecialValues = policy.allowed_special_values ?? ['none'];
  const plannedAllowsUnknown = policy.planned_allows_unknown ?? false;
  const deprecatedAllowsUnknown = policy.deprecated_allows_unknown ?? false;
  const activeAllowsNone = policy.active_allows_none ?? false;
  const deprecatedEvidenceAllowed = policy.deprecated_evidence_allowed ?? false;

  const docs = await listMarkdownFiles(GOVERNANCE_DIR);
  const violations = [];
  const warnings = [];

  for (const docPath of docs) {
    const content = await readText(docPath);
    const lines = content.split(/\r?\n/);
    const { status, evidenceLine } = parseHeader(lines);
    const headerInfo = parseEvidenceLine(evidenceLine, allowedSpecialValues);

    if (!status) {
      warnings.push(
        buildIssue({
          path: docPath,
          type: 'missing-status',
          message: 'Status header missing or unrecognized.',
          remediation: 'Add Status: active|planned|deprecated within the header block.',
        }),
      );
    }

    if (headerInfo.type === 'missing') {
      warnings.push(
        buildIssue({
          path: docPath,
          type: 'missing-evidence-ids',
          message: 'Evidence-IDs header missing in the header block.',
          remediation: 'Add Evidence-IDs header (comma-separated or "none").',
        }),
      );
      continue;
    }

    if (headerInfo.type === 'empty') {
      warnings.push(
        buildIssue({
          path: docPath,
          type: 'empty-evidence-ids',
          message: 'Evidence-IDs header is present but empty.',
          remediation: 'Populate Evidence-IDs with known IDs or set to "none".',
        }),
      );
      continue;
    }

    if (headerInfo.invalidMixed) {
      violations.push(
        buildIssue({
          path: docPath,
          type: 'invalid-evidence-ids',
          message: 'Evidence-IDs mixes special values with explicit IDs.',
          remediation: 'Use only "none" or a comma-separated list of IDs.',
        }),
      );
      continue;
    }

    if (headerInfo.usesNone) {
      if (status === 'active' && !activeAllowsNone) {
        warnings.push(
          buildIssue({
            path: docPath,
            type: 'active-none-not-allowed',
            message: 'Active document declares Evidence-IDs as none.',
            remediation: 'Provide Evidence-IDs for active documents or update policy.',
          }),
        );
      }
      continue;
    }

    const ids = headerInfo.ids;

    const seenIds = new Set();
    for (const id of ids) {
      if (seenIds.has(id)) {
        warnings.push(
          buildIssue({
            path: docPath,
            type: 'duplicate-evidence-id',
            evidenceId: id,
            message: 'Duplicate evidence ID in Evidence-IDs header.',
            remediation: 'Remove duplicate entries from Evidence-IDs header.',
          }),
        );
      }
      seenIds.add(id);
    }

    for (const id of ids) {
      const entry = evidenceMap.get(id);
      if (!entry) {
        const violationType =
          status === 'planned' && plannedAllowsUnknown
            ? 'warning'
            : status === 'deprecated' && deprecatedAllowsUnknown
            ? 'warning'
            : status === 'active' || status === 'planned' || status === 'deprecated'
            ? 'violation'
            : 'warning';

        const issue = buildIssue({
          path: docPath,
          type: 'unknown-evidence-id',
          evidenceId: id,
          message: 'Evidence ID is not present in the evidence map.',
          remediation: 'Add evidence ID to evidence map or correct the header value.',
        });

        if (violationType === 'violation') {
          violations.push(issue);
        } else {
          warnings.push(issue);
        }
        continue;
      }

      if (entry.status === 'deprecated' && !deprecatedEvidenceAllowed) {
        violations.push(
          buildIssue({
            path: docPath,
            type: 'deprecated-evidence-id',
            evidenceId: id,
            message: 'Evidence ID is marked deprecated in the evidence map.',
            remediation: 'Replace with an active evidence ID or update policy.',
          }),
        );
      } else if (entry.status === 'deprecated') {
        warnings.push(
          buildIssue({
            path: docPath,
            type: 'deprecated-evidence-id',
            evidenceId: id,
            message: 'Evidence ID is marked deprecated in the evidence map.',
            remediation: 'Replace with an active evidence ID or update policy.',
          }),
        );
      }
    }
  }

  const sortedViolations = sortIssues(violations);
  const sortedWarnings = sortIssues(warnings);

  const status = sortedViolations.length > 0 ? 'failed' : 'passed';

  const report = {
    status,
    sha,
    policy_hash: policyHash,
    evidence_map_path: evidenceMapPath,
    docs_checked: docs.length,
    evidence_ids_known: evidenceIdsKnown,
    violations: sortedViolations,
    warnings: sortedWarnings,
  };

  const reportJson = `${JSON.stringify(report, null, 2)}\n`;
  const reportHash = hashText(reportJson);

  await fs.mkdir(reportOutDir, { recursive: true });
  await fs.writeFile(path.join(reportOutDir, 'report.json'), reportJson, 'utf8');

  const reportMd = generateReportMd({
    status,
    sha,
    policyHash,
    evidenceMapPath,
    docsChecked: docs.length,
    evidenceIdsKnown,
    violations: sortedViolations,
    warnings: sortedWarnings,
  });

  await fs.writeFile(
    path.join(reportOutDir, 'report.md'),
    `${reportMd}\n`,
    'utf8',
  );

  const stamp = {
    status,
    sha,
    policy_hash: policyHash,
    report_hash: reportHash,
    timestamp: new Date().toISOString(),
  };

  await fs.writeFile(
    path.join(reportOutDir, 'stamp.json'),
    `${JSON.stringify(stamp, null, 2)}\n`,
    'utf8',
  );

  if (status === 'failed') {
    console.error('Evidence ID consistency check failed.');
    process.exit(1);
  }

  console.log('Evidence ID consistency check passed.');
};

main().catch((error) => {
  console.error(`Evidence ID consistency check error: ${error.message}`);
  process.exit(2);
});
