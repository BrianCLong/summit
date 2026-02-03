import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const SCHEMA_VERSION = '1.0.0';

export const VerificationState = {
  VERIFIED_MATCH: 'VERIFIED_MATCH',
  VERIFIED_DRIFT: 'VERIFIED_DRIFT',
  UNVERIFIABLE_PERMISSIONS: 'UNVERIFIABLE_PERMISSIONS',
  UNVERIFIABLE_ERROR: 'UNVERIFIABLE_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_PROTECTION: 'NO_PROTECTION',
};

function compareByCodeUnit(left, right) {
  if (left === right) return 0;
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

function sortKeysDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value && typeof value === 'object') {
    const sorted = {};
    for (const key of Object.keys(value).sort(compareByCodeUnit)) {
      sorted[key] = sortKeysDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

function stableJson(value) {
  return `${JSON.stringify(sortKeysDeep(value), null, 2)}
`;
}

function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}

function contentHash(data) {
  const normalized = JSON.stringify(data, Object.keys(data).sort());
  return createHash('sha256').update(normalized).digest('hex').slice(0, 16);
}

function normalizeRelativePath(root, target) {
  const relative = path.relative(root, target);
  return relative.split(path.sep).join('/');
}

function hashStringList(values) {
  const sorted = values.slice().sort(compareByCodeUnit);
  const joined = `${sorted.join('\n')}\n`;
  return { sorted, sha256: sha256Hex(Buffer.from(joined, 'utf8')) };
}

function writeDeterministicJson(filePath, payload) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const serialized = stableJson(payload);
  fs.writeFileSync(filePath, serialized, 'utf8');
  return serialized;
}

export function buildPolicyEvidence({ policyPath, policyHash, knownChecks, missingChecks, allowlistedChecks, sha }) {
  const verdict = missingChecks.length === 0 ? 'PASS' : 'FAIL';
  const evidence = {
    schema_version: SCHEMA_VERSION,
    gate: 'required-checks-policy',
    sha,
    verdict,
    policy_path: policyPath,
    policy_hash: policyHash,
    summary: {
      known_checks_count: knownChecks.length,
      missing_checks_count: missingChecks.length,
      allowlisted_count: allowlistedChecks.length,
    },
    details: { missing_checks: missingChecks.sort(), allowlisted_checks: allowlistedChecks.sort() },
  };
  evidence.content_hash = contentHash(evidence);
  return evidence;
}

export function buildDeterminismEvidence({ scannedPaths, violations, falsePositivePatterns, sha }) {
  const verdict = violations.length === 0 ? 'PASS' : 'FAIL';
  const evidence = {
    schema_version: SCHEMA_VERSION,
    gate: 'determinism-scan',
    sha,
    verdict,
    summary: { paths_scanned: scannedPaths.length, violation_count: violations.length, fp_patterns_active: falsePositivePatterns.length },
    details: { violations: violations.map(v => ({ file: v.file, line: v.line, pattern: v.pattern })).sort((a, b) => a.file.localeCompare(b.file)) },
  };
  evidence.content_hash = contentHash(evidence);
  return evidence;
}

export function buildBranchProtectionEvidence({ branch, state, expectedChecks, actualChecks, driftDetails, sha }) {
  const stateToVerdict = {
    [VerificationState.VERIFIED_MATCH]: 'PASS',
    [VerificationState.VERIFIED_DRIFT]: 'FAIL',
    [VerificationState.UNVERIFIABLE_PERMISSIONS]: 'SKIP',
    [VerificationState.UNVERIFIABLE_ERROR]: 'ERROR',
    [VerificationState.RATE_LIMITED]: 'SKIP',
    [VerificationState.NO_PROTECTION]: 'FAIL',
  };
  const verdict = stateToVerdict[state] || 'ERROR';
  const evidence = {
    schema_version: SCHEMA_VERSION,
    gate: 'branch-protection-audit',
    sha,
    verdict,
    branch,
    verification_state: state,
    summary: { expected_checks_count: expectedChecks?.length || 0, actual_checks_count: actualChecks?.length || 0, drift_detected: state === VerificationState.VERIFIED_DRIFT },
    details: { drift: driftDetails || null },
  };
  evidence.content_hash = contentHash(evidence);
  return evidence;
}

export function buildGovernanceSummary({ sha, gates }) {
  const overallVerdict = gates.every(g => g.verdict === 'PASS' || g.verdict === 'SKIP') ? 'PASS' : 'FAIL';
  return {
    schema_version: SCHEMA_VERSION,
    aggregate: 'governance-summary',
    sha,
    verdict: overallVerdict,
    gates: gates.map(g => ({ gate: g.gate, verdict: g.verdict, content_hash: g.content_hash })).sort((a, b) => a.gate.localeCompare(b.gate)),
  };
}

export {
  compareByCodeUnit,
  hashStringList,
  normalizeRelativePath,
  sha256Hex,
  stableJson,
  writeDeterministicJson,
  contentHash,
  SCHEMA_VERSION
};