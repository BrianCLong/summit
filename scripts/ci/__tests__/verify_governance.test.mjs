import { writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import assert from 'node:assert/strict';
import { verifyGovernance } from '../../verify-governance.js';

test('verifyGovernance allows when required IDs are present', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gov-verify-'));
  const policyPath = path.join(dir, 'policy.yml');
  const evidencePath = path.join(dir, 'bundle.json');

  await writeFile(policyPath, `version: 1.0\nevidence:\n  unit_test_coverage:\n    id: EV-001\n    required: true\n  lint_results:\n    id: EV-002\n    required: true\n`);
  await writeFile(
    evidencePath,
    JSON.stringify({ evidence: [{ id: 'EV-001' }, { id: 'EV-002' }] }),
  );

  const verdict = await verifyGovernance({ evidencePath, policyPath });
  assert.equal(verdict.status, 'allow');
});

test('verifyGovernance denies when required IDs missing', async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'gov-verify-missing-'));
  const policyPath = path.join(dir, 'policy.yml');
  const evidencePath = path.join(dir, 'bundle.json');

  await writeFile(policyPath, `version: 1.0\nevidence:\n  unit_test_coverage:\n    id: EV-001\n    required: true\n  lint_results:\n    id: EV-002\n    required: true\n`);
  await writeFile(
    evidencePath,
    JSON.stringify({ evidence: [{ id: 'EV-001' }] }),
  );

  await assert.rejects(
    verifyGovernance({ evidencePath, policyPath }),
    /Missing required evidence IDs: EV-002/,
  );
});
