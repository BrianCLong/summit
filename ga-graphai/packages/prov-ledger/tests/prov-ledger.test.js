import assert from 'node:assert/strict';
import test from 'node:test';

import { createDecisionRecord } from 'common-types';
import { ProvenanceLedger } from '../src/index.js';

const baseDecision = createDecisionRecord({
  taskId: 'task-123',
  arms: [
    { id: 'baseline', V: 0.5 },
    { id: 'res_1', V: 0.7 },
  ],
  chosen: 'res_1',
  pred: { quality: 0.9, lat: 410, cost: 0.0021 },
  actual: { quality: 0.91, lat: 405, cost: 0.002 },
  provenanceUri: 's3://bucket/task-123',
  budgetDeltaUSD: -0.0003,
});

test('ledger records immutable decision entries', () => {
  const ledger = new ProvenanceLedger({ namespace: 'zero-spend' });
  const entry = ledger.record(baseDecision, {
    policyTags: ['tenant:acme'],
    savingsUSD: 0.0005,
  });
  assert.equal(entry.namespace, 'zero-spend');
  assert.ok(ledger.verify(entry));
  assert.equal(ledger.findByTask('task-123').length, 1);
  assert.throws(() => {
    entry.metadata.policyTags.push('mutate');
  });
});

test('summary aggregates deltas and savings', () => {
  const ledger = new ProvenanceLedger();
  ledger.record(baseDecision, { savingsUSD: 0.1 });
  ledger.record(
    {
      ...baseDecision,
      taskId: 'task-456',
      chosen: 'baseline',
      budgetDeltaUSD: 0.0001,
    },
    { savingsUSD: 0 },
  );
  const summary = ledger.summary();
  assert.equal(summary.count, 2);
  assert.ok(summary.totalBudgetDeltaUSD < 0);
  assert.ok(summary.totalSavingsUSD >= 0.1);
});
