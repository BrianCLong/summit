import { describe, expect, it } from 'vitest';
import { BudgetEngine, CostGuard, DEFAULT_PROFILE } from '../src/index.js';

describe('BudgetEngine', () => {
  const yaml = `budgets:
  - workspace: red-team
    owner: a@example.com
    monthlyCap: 500
    throttleLimits:
      maxRru: 150
      maxLatencyMs: 1200
`;

  it('denies when metadata missing and supplies appeal obligations', () => {
    const engine = new BudgetEngine();
    const decision = engine.evaluate({
      workspace: 'missing',
      plan: {
        estimatedRru: 10,
        estimatedLatencyMs: 100,
        depth: 1,
        operations: 1,
        containsCartesianProduct: false,
      },
      tenantId: 't1',
      profile: DEFAULT_PROFILE,
      activeQueries: 0,
      recentLatencyP95: 50,
    });

    expect(decision.action).toBe('deny');
    expect(decision.obligations).toContain('appeal-required');
  });

  it('enforces throttling and cost guard thresholds with simulation option', () => {
    const engine = new BudgetEngine({ warnRatio: 0.5, enforceRatio: 0.9 });
    engine.loadFromYaml(yaml);

    const throttle = engine.evaluate({
      workspace: 'red-team',
      plan: {
        estimatedRru: 200,
        estimatedLatencyMs: 2000,
        depth: 2,
        operations: 2,
        containsCartesianProduct: false,
      },
      tenantId: 't1',
      profile: DEFAULT_PROFILE,
      activeQueries: 0,
      recentLatencyP95: 100,
      simulate: true,
    });

    expect(throttle.action).toBe('simulate');
    expect(throttle.reason).toContain('throttling');

    const allow = engine.evaluate({
      workspace: 'red-team',
      plan: {
        estimatedRru: 50,
        estimatedLatencyMs: 300,
        depth: 1,
        operations: 1,
        containsCartesianProduct: false,
      },
      tenantId: 't1',
      profile: DEFAULT_PROFILE,
      activeQueries: 1,
      recentLatencyP95: 80,
    });

    expect(allow.action).toBe('allow');
    expect(allow.obligations).toContain('record-provenance');

    const enforce = engine.evaluate({
      workspace: 'red-team',
      plan: {
        estimatedRru: 400,
        estimatedLatencyMs: 500,
        depth: 1,
        operations: 1,
        containsCartesianProduct: false,
      },
      tenantId: 't1',
      profile: DEFAULT_PROFILE,
      activeQueries: 2,
      recentLatencyP95: 90,
    });

    expect(enforce.action).toBe('deny');
    expect(enforce.reason).toContain('Budget cap');
  });
});

describe('CostGuard + BudgetEngine integration', () => {
  it('aligns planBudget with budget evaluation for appeals', () => {
    const guard = new CostGuard(DEFAULT_PROFILE);
    const engine = new BudgetEngine({ warnRatio: 0.1, enforceRatio: 0.2 });
    engine.loadFromYaml(`budgets:
  - workspace: blue-team
    owner: b@example.com
    monthlyCap: 100
`);

    const budgetDecision = engine.evaluate({
      workspace: 'blue-team',
      plan: {
        estimatedRru: 30,
        estimatedLatencyMs: 800,
        depth: 1,
        operations: 1,
        containsCartesianProduct: false,
      },
      tenantId: 'tenant-blue',
      profile: DEFAULT_PROFILE,
      activeQueries: 1,
      recentLatencyP95: 900,
    });

    const guardDecision = guard.planBudget({
      tenantId: 'tenant-blue',
      plan: {
        estimatedRru: 30,
        estimatedLatencyMs: 800,
        depth: 1,
        operations: 1,
        containsCartesianProduct: false,
      },
      profile: DEFAULT_PROFILE,
      activeQueries: 1,
      recentLatencyP95: 900,
    });

    expect(budgetDecision.reason).toContain('warning');
    expect(guardDecision.action).toBe('throttle');
  });
});
