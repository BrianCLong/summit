import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { runActionPinningGate } from '../action_pinning_gate.mjs';

test('passes on pinned SHAs + allows local + docker digest', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-ci-pin-pass-'));
  const workflowsDir = path.join(tmp, '.github', 'workflows');
  await fs.mkdir(workflowsDir, { recursive: true });

  const fixture = path.join(
    process.cwd(),
    'scripts',
    'ci',
    '__tests__',
    'fixtures',
    'workflow_pass_pinned.yml'
  );
  await fs.copyFile(fixture, path.join(workflowsDir, 'workflow.yml'));

  const outFile = path.join(
    tmp,
    'artifacts',
    'ci-sbom',
    'actions-inventory.json'
  );
  const result = await runActionPinningGate({ workflowsDir, outFile });

  assert.equal(result.violations.length, 0);
  const inventory = JSON.parse(await fs.readFile(outFile, 'utf8'));
  assert.equal(inventory.schema, 'summit.ci-sbom.actions/v1');
  assert.ok(Array.isArray(inventory.entries));
  assert.ok(inventory.entries.length >= 4);

  const serialized = JSON.stringify(inventory.entries);
  const sorted = [...inventory.entries].sort((a, b) => {
    const keyA = `${a.workflowFile}|${a.jobId}|${a.kind}|${a.stepIndex ?? -1}|${a.stepName ?? ''}|${a.uses}|${a.line}`;
    const keyB = `${b.workflowFile}|${b.jobId}|${b.kind}|${b.stepIndex ?? -1}|${b.stepName ?? ''}|${b.uses}|${b.line}`;
    return keyA.localeCompare(keyB);
  });
  assert.equal(serialized, JSON.stringify(sorted));
});

test('fails on floating tags and branches', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-ci-pin-fail-'));
  const workflowsDir = path.join(tmp, '.github', 'workflows');
  await fs.mkdir(workflowsDir, { recursive: true });

  const fixture = path.join(
    process.cwd(),
    'scripts',
    'ci',
    '__tests__',
    'fixtures',
    'workflow_fail_floating.yml'
  );
  await fs.copyFile(fixture, path.join(workflowsDir, 'workflow.yml'));

  const outFile = path.join(
    tmp,
    'artifacts',
    'ci-sbom',
    'actions-inventory.json'
  );
  const result = await runActionPinningGate({ workflowsDir, outFile });

  assert.equal(result.violations.length, 2);
  assert.ok(result.violations.some((violation) => violation.uses.includes('@v4')));
  assert.ok(
    result.violations.some((violation) => violation.uses.includes('@main'))
  );
});

test('fails on dynamic uses refs', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-ci-pin-dyn-'));
  const workflowsDir = path.join(tmp, '.github', 'workflows');
  await fs.mkdir(workflowsDir, { recursive: true });

  const fixture = path.join(
    process.cwd(),
    'scripts',
    'ci',
    '__tests__',
    'fixtures',
    'workflow_fail_dynamic.yml'
  );
  await fs.copyFile(fixture, path.join(workflowsDir, 'workflow.yml'));

  const outFile = path.join(
    tmp,
    'artifacts',
    'ci-sbom',
    'actions-inventory.json'
  );
  const result = await runActionPinningGate({ workflowsDir, outFile });

  assert.equal(result.violations.length, 1);
  assert.match(result.violations[0].reason, /Dynamic/i);
});

test('flags job-level reusable workflow uses when unpinned', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'summit-ci-pin-job-'));
  const workflowsDir = path.join(tmp, '.github', 'workflows');
  await fs.mkdir(workflowsDir, { recursive: true });

  const fixture = path.join(
    process.cwd(),
    'scripts',
    'ci',
    '__tests__',
    'fixtures',
    'workflow_job_level_reusable.yml'
  );
  await fs.copyFile(fixture, path.join(workflowsDir, 'workflow.yml'));

  const outFile = path.join(
    tmp,
    'artifacts',
    'ci-sbom',
    'actions-inventory.json'
  );
  const result = await runActionPinningGate({ workflowsDir, outFile });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].kind, 'job');
});
