import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export const GATE_VERSION = '1.3.1';

export function compareByCodeUnit(left, right) {
  if (left === right) {
    return 0;
  }
  const leftLength = left.length;
  const rightLength = right.length;
  const minLength = Math.min(leftLength, rightLength);
  for (let index = 0; index < minLength; index += 1) {
    const leftCode = left.charCodeAt(index);
    const rightCode = right.charCodeAt(index);
    if (leftCode !== rightCode) {
      return leftCode < rightCode ? -1 : 1;
    }
  }
  return leftLength < rightLength ? -1 : 1;
}

export function canonicalizeJson(value, indent = 2) {
  const sorted = sortValue(value);
  return `${JSON.stringify(sorted, null, indent)}\n`;
}

function sortValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => sortValue(entry));
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort(compareByCodeUnit);
    return keys.reduce((acc, key) => {
      acc[key] = sortValue(value[key]);
      return acc;
    }, {});
  }
  return value;
}

export function normalizeRelativePath(root, target) {
  const relative = path.relative(root, target);
  return relative.split(path.sep).join('/');
}

export async function collectEvidenceEntries({ repoRoot, evidenceRoot }) {
  const entries = [];
  let dirEntries;
  try {
    dirEntries = await fs.readdir(evidenceRoot, { withFileTypes: true });
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  for (const entry of dirEntries) {
    const fullPath = path.join(evidenceRoot, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectEvidenceEntries({
        repoRoot,
        evidenceRoot: fullPath,
      });
      entries.push(...nested);
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const relativePath = normalizeRelativePath(evidenceRoot, fullPath);
    const content = await fs.readFile(fullPath);
    const contentHash = hashBuffer(content);
    const evidenceId = hashString(`${relativePath}\n${contentHash}`);
    entries.push({
      id: evidenceId,
      path: normalizeRelativePath(repoRoot, fullPath),
      sha256: contentHash,
    });
  }
  return entries;
}

export function sortEvidenceEntries(entries) {
  return entries.slice().sort((left, right) => {
    const idCompare = compareByCodeUnit(left.id, right.id);
    if (idCompare !== 0) {
      return idCompare;
    }
    return compareByCodeUnit(left.path, right.path);
  });
}

export function hashBuffer(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export function hashString(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

// Comprehensive timestamp key patterns (case-insensitive matching)
const TIMESTAMP_KEYS = new Set([
  // snake_case variants
  'timestamp', 'time', 'date', 'datetime',
  'created_at', 'updated_at', 'deleted_at',
  'generated_at', 'started_at', 'finished_at', 'ended_at',
  'modified_at', 'last_update', 'last_modified',
  'expires_at', 'expired_at',
  'duration_ms', 'elapsed_ms', 'duration', 'elapsed',
  // camelCase variants (normalized to lowercase for matching)
  'createdat', 'updatedat', 'deletedat',
  'generatedat', 'startedat', 'finishedat', 'endedat',
  'modifiedat', 'lastupdate', 'lastmodified',
  'expiresat', 'expiredat',
  'durationms', 'elapsedms',
]);

// ISO8601/RFC3339 patterns for value scanning (match anywhere in the string)
const TIMESTAMP_VALUE_PATTERNS = [
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?/,
  /\d{4}-\d{2}-\d{2}/,
];

const EPOCH_STRING_PATTERN = /1\d{9,12}/g;

/**
 * Detect if a numeric value is likely a Unix epoch timestamp.
 * Checks for milliseconds (13+ digits) or seconds (10 digits) in valid range.
 */
export function isLikelyEpoch(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  // Milliseconds: 2000-01-01 (946684800000) to 2100-01-01 (4102444800000)
  if (value > 946684800000 && value < 4102444800000) return true;
  // Seconds: 2000-01-01 (946684800) to 2100-01-01 (4102444800)
  if (value > 946684800 && value < 4102444800) return true;
  return false;
}

/**
 * Check if a string value matches timestamp patterns.
 */
function isLikelyEpochString(value) {
  if (typeof value !== 'string') return false;
  const matches = value.match(EPOCH_STRING_PATTERN);
  if (!matches) return false;
  return matches.some((match) => {
    const numeric = Number(match);
    return Number.isFinite(numeric) && isLikelyEpoch(numeric);
  });
}

export function isTimestampValue(value) {
  if (typeof value !== 'string') return false;
  if (TIMESTAMP_VALUE_PATTERNS.some((pattern) => pattern.test(value))) {
    return true;
  }
  return isLikelyEpochString(value);
}

/**
 * Scan for timestamp keys in an object structure.
 * Returns array of paths where timestamp keys are found.
 */
export function scanTimestampKeys(value, prefix = '') {
  const matches = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...scanTimestampKeys(entry, `${prefix}[${index}]`));
    });
    return matches;
  }
  if (!value || typeof value !== 'object') {
    return matches;
  }
  for (const [key, child] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    const nextPath = prefix ? `${prefix}.${key}` : key;
    if (TIMESTAMP_KEYS.has(lowerKey)) {
      matches.push(nextPath);
    }
    matches.push(...scanTimestampKeys(child, nextPath));
  }
  return matches;
}

/**
 * Scan for timestamp values (not just keys) in an object structure.
 * Returns array of paths where timestamp-like values are found.
 */
export function scanTimestampValues(value, prefix = '') {
  const matches = [];
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      matches.push(...scanTimestampValues(entry, `${prefix}[${index}]`));
    });
    return matches;
  }
  if (value === null || value === undefined) {
    return matches;
  }
  if (typeof value === 'string' && isTimestampValue(value)) {
    if (prefix) matches.push(prefix);
    return matches;
  }
  if (typeof value === 'number' && isLikelyEpoch(value)) {
    if (prefix) matches.push(prefix);
    return matches;
  }
  if (typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      const nextPath = prefix ? `${prefix}.${key}` : key;
      matches.push(...scanTimestampValues(child, nextPath));
    }
  }
  return matches;
}

export function buildReport({
  evidenceRoot,
  sha,
  evidenceEntries,
  duplicates,
}) {
  return {
    $schema:
      'schemas/evidence/evidence-id-consistency-report.schema.json',
    gate_version: GATE_VERSION,
    sha,
    evidence_root: evidenceRoot,
    evidence: evidenceEntries,
    duplicate_ids: duplicates,
    status: duplicates.length === 0 ? 'pass' : 'fail',
  };
}

export function buildMetrics({ sha, evidenceTotal, duplicateCount }) {
  return {
    $schema:
      'schemas/evidence/evidence-id-consistency-metrics.schema.json',
    gate_version: GATE_VERSION,
    sha,
    evidence_total: evidenceTotal,
    duplicate_ids_total: duplicateCount,
    status: duplicateCount === 0 ? 'pass' : 'fail',
  };
}

export function buildAiLedger({ sha, artifacts }) {
  const sortedArtifacts = artifacts
    .slice()
    .sort((left, right) => compareByCodeUnit(left.name, right.name));
  return {
    $schema:
      'schemas/evidence/evidence-id-consistency-ai-ledger.schema.json',
    gate_version: GATE_VERSION,
    sha,
    artifacts: sortedArtifacts,
  };
}

export function buildStamp({
  sha,
  runId,
  startedAt,
  finishedAt,
  durationMs,
}) {
  return {
    $schema: 'schemas/evidence/evidence-id-consistency-stamp.schema.json',
    gate_version: GATE_VERSION,
    sha,
    run_id: runId,
    started_at: startedAt,
    finished_at: finishedAt,
    duration_ms: durationMs,
    node_version: process.version,
    platform: process.platform,
  };
}

export async function writeJsonFile(filePath, data) {
  const payload = canonicalizeJson(data);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, payload);
  return payload;
}
