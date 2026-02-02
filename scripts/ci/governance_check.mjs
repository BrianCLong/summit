#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = process.cwd();
const evidenceDir = path.join(repoRoot, 'artifacts', 'governance');

function runNode(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    stdio: 'inherit',
  });
  return result.status ?? 1;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function summarize(results) {
  const rows = [
    ['Gate', 'Result', 'Evidence'],
    ['-----', '------', '--------'],
  ];
  for (const row of results) {
    rows.push(row);
  }
  for (const row of rows) {
    console.log(`| ${row[0]} | ${row[1]} | ${row[2]} |`);
  }
}

function main() {
  ensureDir(evidenceDir);
  const results = [];
  let exitCode = 0;

  const policyEvidence = path.join(evidenceDir, 'required-checks-policy.evidence.json');
  const determinismEvidence = path.join(evidenceDir, 'determinism-scan.evidence.json');
  const branchEvidence = path.join(evidenceDir, 'branch-protection-audit.evidence.json');

  const policyStatus = runNode('scripts/ci/validate_policy_references.mjs', [
    `--evidence-out=${policyEvidence}`,
  ]);
  const policyVerdict = fs.existsSync(policyEvidence)
    ? readJson(policyEvidence).verdict
    : 'ERROR';
  results.push(['Required Checks Policy', policyVerdict, normalizeEvidencePath(policyEvidence)]);
  if (policyVerdict === 'FAIL' || policyStatus !== 0) {
    exitCode = 1;
  }

  const determinismStatus = runNode('scripts/ci/verify_evidence_id_consistency.mjs', [
    '--sha=LOCAL',
    '--run-id=LOCAL',
    `--out-dir=${path.join('artifacts', 'evidence-id-consistency')}`,
    '--evidence-root=evidence',
    `--determinism-evidence-out=${determinismEvidence}`,
  ]);
  const determinismVerdict = fs.existsSync(determinismEvidence)
    ? readJson(determinismEvidence).verdict
    : 'ERROR';
  results.push(['Determinism Scan', determinismVerdict, normalizeEvidencePath(determinismEvidence)]);
  if (determinismVerdict === 'FAIL' || determinismStatus !== 0) {
    exitCode = 1;
  }

  const hasToken = Boolean(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  const branchArgs = hasToken
    ? []
    : ['--offline'];
  const branchStatus = runNode('scripts/ci/check_branch_protection_drift.mjs', [
    ...branchArgs,
    `--out=${path.join('artifacts', 'governance', 'branch-protection-drift')}`,
  ]);
  const branchState = fs.existsSync(branchEvidence)
    ? readJson(branchEvidence).state
    : 'ERROR';
  results.push(['Branch Protection Audit', branchState, normalizeEvidencePath(branchEvidence)]);
  if (branchState === 'VERIFIED_DRIFT' || branchStatus !== 0) {
    exitCode = 1;
  }

  console.log('\nGovernance Check Summary');
  summarize(results);

  process.exit(exitCode);
}

function normalizeEvidencePath(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join('/');
}

main();
