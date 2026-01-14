import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../server/store.js';
import { startRun } from '../server/runner.js';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const createTempDir = async () =>
  await fs.mkdtemp(path.join(os.tmpdir(), 'maestro-workboard-'));

const readJson = async (filePath) =>
  JSON.parse(await fs.readFile(filePath, 'utf-8'));

const assertFileExists = async (filePath) => {
  const stat = await fs.stat(filePath);
  assert.ok(stat.isFile());
};

test('creates work item and persists evidence bundle on run', async () => {
  const dataDir = await createTempDir();
  const store = createStore({ dataDir });
  await store.load();
  const workItem = await store.createWorkItem({
    title: 'Test work item',
    description: 'Ensure run writes evidence bundle',
    status: 'Ready',
    acceptanceCriteria: ['Evidence bundle exists'],
    skills: ['stub-skill'],
  });
  const run = await startRun({
    store,
    workItem,
    capabilityProfile: 'read-only',
    worktreeMode: 'noop',
  });
  const runRecord = store.getRun(run.id);
  assert.equal(runRecord.status, 'completed');
  assert.equal(runRecord.evidence.plan.includes('plan.md'), true);
  await assertFileExists(runRecord.evidence.plan);
  await assertFileExists(runRecord.evidence.provenance);
  const provenance = await readJson(runRecord.evidence.provenance);
  assert.equal(provenance.runId, run.id);
});
