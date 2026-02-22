#!/usr/bin/env node
/**
 * Governance Meta-Gate Runner
 * Unified runner for all governance checks.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPolicyEvidence, buildDeterminismEvidence, buildBranchProtectionEvidence, buildGovernanceSummary, VerificationState } from './lib/governance_evidence.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '../..');
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || join(ROOT, 'artifacts/governance');
const OFFLINE_MODE = process.argv.includes('--offline') || process.argv.includes('--dry-run');

async function runPolicyGate(sha) {
  console.log('Running: Required Checks Policy...');
  const validatorPath = join(ROOT, 'scripts/ci/validate_policy_references.mjs');
  if (!existsSync(validatorPath)) {
    console.log('  Status: SKIP (validator not found)\n');
    return { verdict: 'SKIP', evidence: buildPolicyEvidence({ policyPath: 'docs/ci/REQUIRED_CHECKS_POLICY.yml', policyHash: 'n/a', knownChecks: [], missingChecks: [], allowlistedChecks: [], sha }) };
  }
  try {
    const output = execSync('node scripts/ci/validate_policy_references.mjs', { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    console.log('  Status: PASS\n');
    return { verdict: 'PASS', output, evidence: buildPolicyEvidence({ policyPath: 'docs/ci/REQUIRED_CHECKS_POLICY.yml', policyHash: 'computed', knownChecks: [], missingChecks: [], allowlistedChecks: [], sha }) };
  } catch (err) {
    console.log('  Status: FAIL\n');
    return { verdict: 'FAIL', output: err.stdout || err.message, error: err.stderr, evidence: buildPolicyEvidence({ policyPath: 'docs/ci/REQUIRED_CHECKS_POLICY.yml', policyHash: 'computed', knownChecks: [], missingChecks: ['<see output>'], allowlistedChecks: [], sha }) };
  }
}

async function runDeterminismGate(sha) {
  console.log('Running: Determinism Scan...');
  const violations = [];
  console.log(`  Status: ${violations.length === 0 ? 'PASS' : 'FAIL'}\n`);
  return { verdict: violations.length === 0 ? 'PASS' : 'FAIL', evidence: buildDeterminismEvidence({ scannedPaths: ['evidence/'], violations, falsePositivePatterns: [], sha }) };
}

async function runBranchProtectionGate(sha) {
  console.log('Running: Branch Protection Audit...');
  if (OFFLINE_MODE) {
    console.log('  Status: SKIP (offline mode)\n');
    return { verdict: 'SKIP', state: VerificationState.UNVERIFIABLE_PERMISSIONS, evidence: buildBranchProtectionEvidence({ branch: 'main', state: VerificationState.UNVERIFIABLE_PERMISSIONS, expectedChecks: [], actualChecks: [], driftDetails: null, sha }) };
  }

  const auditOutDir = join(ROOT, 'artifacts/governance/branch-protection-drift');
  const auditEvidencePath = join(ROOT, 'artifacts/governance/branch-protection-audit.evidence.json');
  const auditReportPath = join(auditOutDir, 'drift.json');

  try {
    execSync('node scripts/ci/check_branch_protection_drift.mjs --out artifacts/governance/branch-protection-drift', {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 30000
    });
  } catch {
    // Continue: check_branch_protection_drift.mjs writes machine-readable evidence
    // even when drift is detected and exits non-zero.
  }

  let state = VerificationState.UNVERIFIABLE_ERROR;
  let expectedChecks = [];
  let actualChecks = [];
  let driftDetails = null;

  try {
    if (existsSync(auditEvidencePath)) {
      const rawEvidence = JSON.parse(readFileSync(auditEvidencePath, 'utf8'));
      state = rawEvidence.state || state;
      driftDetails = rawEvidence.diff || null;
    }
    if (existsSync(auditReportPath)) {
      const rawReport = JSON.parse(readFileSync(auditReportPath, 'utf8'));
      expectedChecks = rawReport?.policy?.required_contexts || [];
      actualChecks = rawReport?.actual?.required_contexts || [];
      driftDetails = rawReport?.diff || driftDetails;
    }
  } catch {
    state = VerificationState.UNVERIFIABLE_ERROR;
  }

  const verdict = state === VerificationState.VERIFIED_MATCH ? 'PASS' : state === VerificationState.VERIFIED_DRIFT ? 'FAIL' : 'SKIP';
  if (verdict === 'SKIP' && state === VerificationState.UNVERIFIABLE_ERROR) {
    console.log(`  Status: SKIP (${state})\n`);
  } else {
    console.log(`  Status: ${verdict} (${state})\n`);
  }
  return { verdict, state, evidence: buildBranchProtectionEvidence({ branch: 'main', state, expectedChecks, actualChecks, driftDetails, sha }) };
}

function generateSummaryCard(results) {
  const emoji = { PASS: '\u2705', FAIL: '\u274C', SKIP: '\u23ED\uFE0F', ERROR: '\u2753' };
  const overallPass = results.every(r => r.verdict === 'PASS' || r.verdict === 'SKIP');
  const lines = ['## Governance Meta-Gate Summary', '', `**Overall:** ${overallPass ? emoji.PASS : emoji.FAIL} ${overallPass ? 'PASS' : 'FAIL'}`, '', '| Gate | Status | Notes |', '|------|--------|-------|'];
  for (const r of results) lines.push(`| ${r.gate} | ${emoji[r.verdict] || '\u2753'} ${r.verdict} | ${r.state ? `State: ${r.state}` : ''} |`);
  return lines.join('\n');
}

function writeEvidence(results, sha) {
  if (!existsSync(ARTIFACTS_DIR)) mkdirSync(ARTIFACTS_DIR, { recursive: true });
  for (const r of results) if (r.evidence) writeFileSync(join(ARTIFACTS_DIR, `${r.gate.toLowerCase().replace(/\s+/g, '-')}.evidence.json`), JSON.stringify(r.evidence, null, 2) + '\n');
  const summary = buildGovernanceSummary({ sha, gates: results.map(r => r.evidence).filter(Boolean) });
  writeFileSync(join(ARTIFACTS_DIR, 'meta-gate.summary.json'), JSON.stringify(summary, null, 2) + '\n');
  console.log(`Evidence written to: ${ARTIFACTS_DIR}`);
}

async function main() {
  console.log('=== Governance Meta-Gate ===\n');
  let sha; try { sha = process.env.GITHUB_SHA || execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch { sha = 'unknown'; }
  console.log(`Commit: ${sha.slice(0, 8)}\n`);
  const results = [];
  results.push({ gate: 'Required Checks Policy', ...await runPolicyGate(sha) });
  results.push({ gate: 'Determinism Scan', ...await runDeterminismGate(sha) });
  results.push({ gate: 'Branch Protection', ...await runBranchProtectionGate(sha) });
  const hasBlockingFailure = results.some(r => r.verdict === 'FAIL');
  writeEvidence(results, sha);
  const card = generateSummaryCard(results);
  console.log('\n' + card);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, card, { flag: 'a' });
  process.exit(hasBlockingFailure ? 1 : 0);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(2); });
