import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const verifier = 'scripts/ci/verify_branch_protection.mjs';
const fixturesDir = 'scripts/ci/__fixtures__/bpac';

function runTest(policyFile, liveFile, evidenceDir) {
  return spawnSync('node', [verifier], {
    encoding: 'utf8',
    env: {
      ...process.env,
      BPAC_POLICY_PATH: path.join(fixturesDir, policyFile),
      BPAC_LIVE_SNAPSHOT: path.join(fixturesDir, liveFile),
      BPAC_EVIDENCE_DIR: evidenceDir
    }
  });
}

function resetDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

console.log('Running verify_branch_protection tests...');

{
  const evidenceDir = '.tmp/bpac-test/ok';
  resetDir(evidenceDir);
  const result = runTest('desired_policy.json', 'live_ok.json', evidenceDir);
  if (result.status !== 0) {
    console.error('FAILED: Expected success for matching policy.');
    console.error(result.stderr || result.stdout);
    process.exit(1);
  }
  if (!fs.existsSync(path.join(evidenceDir, 'report.json'))) {
    console.error('FAILED: Expected report.json evidence output.');
    process.exit(1);
  }
  console.log('PASS: matching policy');
}

{
  const evidenceDir = '.tmp/bpac-test/drift';
  resetDir(evidenceDir);
  const result = runTest('desired_policy.json', 'live_drift_missing_context.json', evidenceDir);
  if (result.status === 0) {
    console.error('FAILED: Expected drift to fail.');
    process.exit(1);
  }
  console.log('PASS: drift detected');
}

console.log('All verify_branch_protection tests passed.');
