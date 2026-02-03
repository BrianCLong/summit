import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

const repoRoot = process.cwd();
const validatorPath = path.join(repoRoot, 'scripts/ci/validate_policy_references.mjs');

function writeFile(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function runValidator({ policyPath, workflowsPath, evidenceOut, allowlistPath, allowPrefixMatch }) {
  const args = [validatorPath, '--policy', policyPath, '--workflows', workflowsPath, '--evidence-out', evidenceOut];
  if (allowlistPath) {
    args.push('--allowlist', allowlistPath);
  }
  if (allowPrefixMatch) {
    args.push('--allow-prefix-match');
  }
  try {
    execFileSync('node', args, { stdio: 'ignore' });
  } catch {
    // validator signals failure via exit code; evidence still written
  }
  return JSON.parse(fs.readFileSync(evidenceOut, 'utf8'));
}

test('policy validator requires exact match by default', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-validator-'));
  const workflowsDir = path.join(tmpDir, 'workflows');
  const policyPath = path.join(tmpDir, 'policy.yml');
  const allowlistPath = path.join(tmpDir, 'allowlist.yml');
  const evidenceOut = path.join(tmpDir, 'evidence.json');

  writeFile(
    path.join(workflowsDir, 'ci.yml'),
    'name: Policy Checks\n\njobs:\n  gate:\n    name: Gate\n    runs-on: ubuntu-latest\n    steps: []\n',
  );
  writeFile(
    policyPath,
    'always_required:\n  - name: "Policy Checks"\n',
  );
  writeFile(allowlistPath, 'allowlisted_checks: []\n');

  const evidence = runValidator({
    policyPath,
    workflowsPath: workflowsDir,
    evidenceOut,
    allowlistPath,
  });

  assert.equal(evidence.verdict, 'FAIL');
  assert.deepEqual(evidence.missing_required_checks, ['Policy Checks']);
});

test('policy validator supports explicit prefix match flag', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-validator-'));
  const workflowsDir = path.join(tmpDir, 'workflows');
  const policyPath = path.join(tmpDir, 'policy.yml');
  const allowlistPath = path.join(tmpDir, 'allowlist.yml');
  const evidenceOut = path.join(tmpDir, 'evidence.json');

  writeFile(
    path.join(workflowsDir, 'ci.yml'),
    'name: Policy Checks\n\njobs:\n  gate:\n    name: Gate\n    runs-on: ubuntu-latest\n    steps: []\n',
  );
  writeFile(
    policyPath,
    'always_required:\n  - name: "Policy Checks"\n',
  );
  writeFile(allowlistPath, 'allowlisted_checks: []\n');

  const evidence = runValidator({
    policyPath,
    workflowsPath: workflowsDir,
    evidenceOut,
    allowlistPath,
    allowPrefixMatch: true,
  });

  assert.equal(evidence.verdict, 'PASS');
  assert.deepEqual(evidence.missing_required_checks, []);
});

test('unparsable workflows are reported and allowlists satisfy non-enumerable checks', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'policy-validator-'));
  const workflowsDir = path.join(tmpDir, 'workflows');
  const policyPath = path.join(tmpDir, 'policy.yml');
  const allowlistPath = path.join(tmpDir, 'allowlist.yml');
  const evidenceOut = path.join(tmpDir, 'evidence.json');

  writeFile(
    path.join(workflowsDir, 'valid.yml'),
    'name: Valid Workflow\n\njobs:\n  gate:\n    name: Gate\n    runs-on: ubuntu-latest\n    steps: []\n',
  );
  writeFile(
    path.join(workflowsDir, 'broken.yml'),
    'name: Broken Workflow\n\n  pull_request:\n',
  );
  writeFile(
    policyPath,
    'always_required:\n  - name: "Valid Workflow / Gate"\n  - name: "External Check"\n',
  );
  writeFile(allowlistPath, 'allowlisted_checks:\n  - External Check\n');

  const evidence = runValidator({
    policyPath,
    workflowsPath: workflowsDir,
    evidenceOut,
    allowlistPath,
  });

  assert.equal(evidence.verdict, 'PASS');
  assert.deepEqual(evidence.missing_required_checks, []);
  assert.deepEqual(evidence.allowlisted_checks_used, ['External Check']);
  assert.equal(evidence.unparsable_workflows.length, 1);
});
