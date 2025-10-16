import assert from 'node:assert/strict';

import { record } from '../src/index.ts';
import type { WorkflowDefinition, WorkflowRunRecord } from 'common-types';

type TestFn = () => void;

function runTest(name: string, fn: TestFn) {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✖ ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

const workflow: WorkflowDefinition = {
  workflowId: 'wf-ledger',
  tenantId: 'tenant-9',
  name: 'ledger',
  version: 3,
  policy: {
    purpose: 'engineering',
    retention: 'standard-365d',
    licenseClass: 'MIT-OK',
    pii: false,
  },
  constraints: { latencyP95Ms: 1000, budgetUSD: 5 },
  nodes: [
    {
      id: 'n1',
      type: 'git.clone',
      params: {},
      evidenceOutputs: [
        { type: 'provenance', path: 'prov/n1.json', required: true },
      ],
    },
    {
      id: 'n2',
      type: 'test.junit',
      params: {},
      evidenceOutputs: [
        { type: 'junit', path: 'reports/junit.xml', required: true },
      ],
    },
  ],
  edges: [{ from: 'n1', to: 'n2', on: 'success' }],
};

const run: WorkflowRunRecord = {
  runId: 'run-123',
  workflowId: 'wf-ledger',
  version: 3,
  status: 'succeeded',
  tenantId: 'tenant-9',
  stats: {
    latencyMs: 1200,
    costUSD: 1.25,
    criticalPath: ['n1', 'n2'],
    cacheHits: 1,
  },
  nodes: [
    {
      nodeId: 'n1',
      status: 'succeeded',
      startedAt: '2024-01-01T00:00:00Z',
      finishedAt: '2024-01-01T00:05:00Z',
      metrics: { latencyMs: 300 },
    },
  ],
};

runTest('record produces signed ledger entry', () => {
  const entry = record(run, workflow, {
    ledgerBaseUri: 's3://ledger/runs/',
    signer: 'mc-platform',
    signingKey: 'secret-key',
  });

  assert.equal(entry.runId, run.runId);
  assert.equal(entry.workflowId, workflow.workflowId);
  assert.equal(entry.ledgerUri, 's3://ledger/runs/run-123');
  assert.equal(entry.evidence.length, 2);
  assert.equal(entry.evidence[0]?.nodeId, 'n1');
  assert.equal(entry.inputsHash.length, 64);
  assert.equal(entry.signature.length, 64);
});

runTest('record can include node metrics when requested', () => {
  const withMetrics = record(
    run,
    workflow,
    {
      ledgerBaseUri: 's3://ledger/runs',
      signer: 'mc-platform',
      signingKey: 'secret-key',
    },
    { includeNodeMetrics: true, evaluationTags: ['smoke'] },
  );

  assert.deepEqual(withMetrics.tags, ['smoke']);
  assert.ok(withMetrics.outputsHash);
  const again = record(
    run,
    workflow,
    {
      ledgerBaseUri: 's3://ledger/runs',
      signer: 'mc-platform',
      signingKey: 'secret-key',
    },
    { includeNodeMetrics: true },
  );
  assert.equal(withMetrics.outputsHash, again.outputsHash);
});

if (!process.exitCode) {
  console.log('All prov-ledger assertions passed.');
}
