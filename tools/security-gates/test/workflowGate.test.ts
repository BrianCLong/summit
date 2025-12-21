import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { enforceWorkflowGate } from '../src/workflowGate.ts';
import type { WorkflowGateConfig } from '../src/types.ts';

function writeWorkflow(tmpDir: string, fileName: string, contents: string): string {
  const filePath = path.join(tmpDir, fileName);
  fs.writeFileSync(filePath, contents);
  return filePath;
}

test('fails when actions are not pinned and permissions are missing', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-gate-'));
  writeWorkflow(
    tmpDir,
    'deploy.yml',
    `name: Deploy
permissions: {}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`
  );

  const config: WorkflowGateConfig = {
    workflowGlobs: ['**/*.yml'],
    enforcePinnedActions: true,
    enforceMinimumPermissions: { contents: 'read', 'id-token': 'write' }
  };

  const result = await enforceWorkflowGate(tmpDir, config);
  assert.strictEqual(result.ok, false);
  assert.ok(result.details.join(' ').includes('unpinned actions'));
  assert.ok(result.details.join(' ').includes('permissions'));
});

test('passes when actions are pinned and permissions are minimal', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workflow-gate-'));
  writeWorkflow(
    tmpDir,
    'deploy.yml',
    `name: Deploy
permissions:
  contents: read
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@b4ffde65f46336ab0f624c56b08a5bd31857c6d3
`
  );

  const config: WorkflowGateConfig = {
    workflowGlobs: ['**/*.yml'],
    enforcePinnedActions: true,
    enforceMinimumPermissions: { contents: 'read', 'id-token': 'write' }
  };

  const result = await enforceWorkflowGate(tmpDir, config);
  assert.strictEqual(result.ok, true);
});
