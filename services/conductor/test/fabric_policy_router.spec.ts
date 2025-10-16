import { CapabilityRegistry } from '../src/fabric/registry';
import { routeTask } from '../src/fabric/policyRouter';
import type { BuildTaskSpec } from '../src/build';

describe('policy router', () => {
  function buildSpec(): BuildTaskSpec {
    return {
      taskId: 'task:router-test',
      tenantId: 'tenant-x',
      title: 'Stabilize jest suite',
      goal: 'Reduce flake rate and latency',
      nonGoals: ['Rewrite build system'],
      targets: [{ repo: 'maestro', module: 'worker', job: 'test' }],
      inputs: [],
      constraints: {
        latencyP95Ms: 1200,
        budgetUSD: 1,
        contextTokensMax: 2000,
        cache: 'prefer',
      },
      policy: {
        purpose: 'engineering',
        retention: 'standard-365d',
        licenseClass: 'MIT-OK',
        pii: false,
      },
      acceptanceCriteria: [
        {
          id: 'AC1',
          statement: 'flake rate < 1% across 200 runs',
          verify: 'repro-suite',
          metric: 'flakeRate',
          threshold: 0.01,
        },
        {
          id: 'AC2',
          statement: 'p95 build latency <= 900ms',
          verify: 'latency-metrics',
          metric: 'buildLatencyP95Ms',
          threshold: 900,
        },
      ],
      risks: ['regression'],
      raci: { owner: 'build-team', reviewers: ['SRE'] },
      language: 'en',
      provenanceHash: 'sha256:test',
    };
  }

  it('selects high-value bundle under cost and latency constraints', () => {
    const registry = new CapabilityRegistry();
    registry.upsert({
      id: 'cap-1',
      modelId: 'llm.jest-fixer',
      provider: 'Acme',
      skills: ['test', 'flakeRate', 'buildLatencyP95Ms', 'worker'],
      costUsdPer1KTokens: 0.02,
      latencyMsP95: 650,
      latencyMsP50: 420,
      contextWindow: 16000,
      safety: 'baseline',
      dataResidency: 'us',
      evalScore: 0.88,
    });
    registry.upsert({
      id: 'cap-2',
      modelId: 'llm.security',
      provider: 'Acme',
      skills: ['security', 'sarif'],
      costUsdPer1KTokens: 0.03,
      latencyMsP95: 900,
      contextWindow: 8000,
      safety: 'enhanced',
      dataResidency: 'us',
      evalScore: 0.7,
    });

    const spec = buildSpec();
    const decision = routeTask(spec, registry, {
      costBudgetUsd: 0.5,
      latencyBudgetMs: 1000,
    });
    expect(decision.bundle.length).toBeGreaterThanOrEqual(1);
    expect(decision.bundle[0].modelId).toBe('llm.jest-fixer');
    expect(decision.estimatedCost).toBeLessThanOrEqual(0.5);
    expect(decision.coverage).toBeGreaterThan(0.4);
  });

  it('falls back when budgets make bids infeasible', () => {
    const registry = new CapabilityRegistry();
    const spec = buildSpec();
    const decision = routeTask(spec, registry, {
      costBudgetUsd: 0.01,
      latencyBudgetMs: 100,
    });
    expect(decision.fallback).toBeDefined();
    expect(decision.bundle[0].modelId).toBe('regex-baseline');
  });
});
