import assert from 'node:assert/strict';
import test from 'node:test';

import { LICENSE_CLASSES, SAFETY_TIERS } from 'common-types';
import { PolicyEngine } from 'policy';
import { ZeroSpendOrchestrator } from '../src/index.js';

const baselineCandidate = {
  id: 'baseline',
  kind: 'model',
  skills: ['general'],
  ckpt: 'ckpt://baseline',
  contextTokens: 8000,
  cost: { unit: 'usd/1kTok', estimate: 0.0025 },
  latencyMs: { p50: 160, p95: 420 },
  safetyTier: SAFETY_TIERS.B,
  licenseClass: LICENSE_CLASSES.MIT_OK,
  residency: 'us-west',
  constraints: { pii: false },
};

const source = {
  async listResources() {
    return [
      baselineCandidate,
      {
        id: 'res-high-quality',
        kind: 'model',
        skills: ['summarization', 'log-triage'],
        ckpt: 'ckpt://res-high-quality',
        contextTokens: 32000,
        cost: { unit: 'usd/1kTok', estimate: 0.0021 },
        latencyMs: { p50: 110, p95: 340 },
        safetyTier: SAFETY_TIERS.A,
        licenseClass: LICENSE_CLASSES.MIT_OK,
        residency: 'us-west',
        constraints: { pii: false },
      },
      {
        id: 'res-fast',
        kind: 'model',
        skills: ['summarization', 'typescript-fix'],
        ckpt: 'ckpt://res-fast',
        contextTokens: 24000,
        cost: { unit: 'usd/1kTok', estimate: 0.0018 },
        latencyMs: { p50: 90, p95: 280 },
        safetyTier: SAFETY_TIERS.A,
        licenseClass: LICENSE_CLASSES.OPEN_DATA_OK,
        residency: 'us-west',
        constraints: { pii: false },
      },
      {
        id: 'res-eu',
        kind: 'model',
        skills: ['summarization'],
        ckpt: 'ckpt://res-eu',
        contextTokens: 24000,
        cost: { unit: 'usd/1kTok', estimate: 0.0019 },
        latencyMs: { p50: 120, p95: 360 },
        safetyTier: SAFETY_TIERS.A,
        licenseClass: LICENSE_CLASSES.OPEN_DATA_OK,
        residency: 'eu-central',
        constraints: { pii: false },
      },
    ];
  },
};

test('orchestrator routes traffic while staying budget neutral', async () => {
  const policyEngine = new PolicyEngine({ allowedResidencies: ['us-west'] });
  const orchestrator = new ZeroSpendOrchestrator({
    N: 2,
    baselineCandidate,
    policyEngine,
    discoverySources: [source],
    budget: { baselineMonthlyUSD: 100, alertThreshold: 0.8 },
  });
  await orchestrator.bootstrap();
  assert.ok(orchestrator.discovery.all().length >= 3);

  const tasks = [
    {
      id: 'task-1',
      skills: ['summarization'],
      policy: { tenant: 'acme', allowedResidencies: ['us-west'] },
      payload: { summary: 'summarize release notes' },
      promptHash: 'hash-1',
      policyVersion: 'v1',
      tokens: 3000,
    },
    {
      id: 'task-2',
      skills: ['typescript-fix'],
      policy: { tenant: 'acme', allowedResidencies: ['us-west'] },
      payload: { summary: 'fix types' },
      promptHash: 'hash-2',
      policyVersion: 'v1',
      tokens: 1500,
    },
    {
      id: 'task-3',
      skills: ['log-triage'],
      policy: { tenant: 'acme', allowedResidencies: ['us-west'] },
      payload: { summary: 'triage logs' },
      promptHash: 'hash-3',
      policyVersion: 'v1',
      tokens: 5000,
    },
  ];

  await Promise.all(tasks.map((task) => orchestrator.runTask(task)));

  const status = orchestrator.budgetStatus();
  assert.ok(status.headroomPct <= 1);
  assert.ok(status.headroomPct >= 0);
  const metrics = orchestrator.metricsSnapshot();
  assert.ok(metrics.p95Latency > 0);
  assert.ok(metrics.avgCost >= 0);
  assert.ok(metrics.cacheHitRate >= 0);

  // Run a cacheable task twice and ensure the second run is free.
  const cacheTask = {
    id: 'task-cache-a',
    skills: ['summarization'],
    policy: { tenant: 'acme', allowedResidencies: ['us-west'] },
    payload: { summary: 'cached task', password: 'secret' },
    promptHash: 'hash-cache',
    policyVersion: 'v1',
    tokens: 2000,
  };
  await orchestrator.runTask(cacheTask);
  const cacheHitEntry = await orchestrator.runTask({
    ...cacheTask,
    id: 'task-cache-b',
  });
  assert.equal(cacheHitEntry.decision.chosen, 'cache');

  const ledgerSummary = orchestrator.ledger.summary();
  assert.ok(ledgerSummary.count >= 5);
  assert.ok(
    ledgerSummary.totalBudgetDeltaUSD <=
      tasks.length * baselineCandidate.cost.estimate,
  );
});
