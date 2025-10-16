import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aggregateCoverage,
  buildMemoCacheKey,
  clamp,
  computeValueDensity,
  createBudgetSnapshot,
  createDecisionRecord,
  normalizeLatency,
  percentile,
  updateEma,
} from '../src/index.js';

test('computeValueDensity returns higher score for better quality at fixed cost', () => {
  const base = computeValueDensity({
    quality: 0.8,
    coverage: 0.9,
    cost: 0.002,
    latency: 200,
  });
  const improved = computeValueDensity({
    quality: 0.88,
    coverage: 0.9,
    cost: 0.002,
    latency: 200,
  });
  assert.ok(improved > base);
});

test('computeValueDensity returns zero if cost or latency is non-positive', () => {
  assert.equal(
    computeValueDensity({ quality: 0.9, coverage: 1, cost: 0, latency: 10 }),
    0,
  );
  assert.equal(
    computeValueDensity({ quality: 0.9, coverage: 1, cost: 0.001, latency: 0 }),
    0,
  );
});

test('percentile interpolates values', () => {
  const values = [10, 20, 30, 40, 50];
  const p95 = percentile(values, 0.95);
  assert.ok(p95 > 40);
  assert.ok(p95 <= 50);
});

test('createBudgetSnapshot calculates burn rate and headroom', () => {
  const now = new Date('2024-05-15T12:00:00Z');
  const snapshot = createBudgetSnapshot({
    baselineMonthlyUSD: 1000,
    consumedUSD: 400,
    timestamp: now,
  });
  assert.ok(snapshot.headroomPct < 1);
  assert.ok(snapshot.burnRateUSDPerDay > 0);
});

test('createDecisionRecord freezes payload and normalizes values', () => {
  const record = createDecisionRecord({
    taskId: 'task-1',
    arms: [{ id: 'a', V: 0.4 }],
    chosen: 'a',
    pred: { quality: 0.9, lat: 300, cost: 0.001 },
    actual: { quality: 0.92, lat: 290, cost: 0.0009 },
    provenanceUri: 's3://bucket/task-1',
    budgetDeltaUSD: -0.0001,
  });
  assert.equal(record.taskId, 'task-1');
  assert.throws(() => {
    record.taskId = 'mutate';
  });
});

test('aggregateCoverage averages bounded contributions', () => {
  const value = aggregateCoverage([1.2, 0.5, -1, 0.75]);
  assert.equal(value, (1 + 0.5 + 0 + 0.75) / 4);
});

test('buildMemoCacheKey combines prompt hash and policy version', () => {
  const key = buildMemoCacheKey('hash', 'policy-v1');
  assert.equal(key, 'hash::policy-v1');
});

test('updateEma applies smoothing', () => {
  const ema = updateEma(100, 80, 0.5);
  assert.equal(ema, 90);
});

test('normalizeLatency ensures p95 is not lower than p50', () => {
  const latency = normalizeLatency({ p50: 100, p95: 80 });
  assert.equal(latency.p95, 100);
});

test('clamp enforces bounds', () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(100, 0, 10), 10);
});
