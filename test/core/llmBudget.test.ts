import {
  BudgetDecision,
  InMemoryBudgetStore,
  LlmBudgetEngine,
  StaticPolicyProvider,
} from '../../src/core/llmBudget';

describe('LlmBudgetEngine', () => {
  it('allows usage within budget and records metrics', async () => {
    const engine = new LlmBudgetEngine({
      policyProvider: new StaticPolicyProvider([
        {
          id: 'sandbox',
          scope: 'environment',
          window: 'day',
          mode: 'hard',
          limit: { usd: 5, tokens: 1000 },
        },
      ]),
      usageStore: new InMemoryBudgetStore(),
    });

    const result = await engine.checkAndConsume(
      { environment: 'sandbox' },
      { usd: 1.25, tokens: 250 }
    );

    expect(result.decision).toBe(BudgetDecision.ALLOW);
    expect(engine.metricsSnapshot()).toEqual(
      expect.objectContaining({
        llm_budget_consumed_usd: 1.25,
        llm_budget_consumed_tokens: 250,
        llm_budget_blocked_requests_total: 0,
      })
    );
  });

  it('triggers a soft limit when projected usage exceeds the policy', async () => {
    const engine = new LlmBudgetEngine({
      policyProvider: new StaticPolicyProvider([
        {
          id: 'maestro_planning',
          scope: 'feature',
          window: 'day',
          mode: 'soft',
          limit: { tokens: 100 },
        },
      ]),
      usageStore: new InMemoryBudgetStore(),
    });

    await engine.checkAndConsume(
      { environment: 'dev', feature: 'maestro_planning' },
      { tokens: 60 }
    );
    const second = await engine.checkAndConsume(
      { environment: 'dev', feature: 'maestro_planning' },
      { tokens: 50 }
    );

    expect(second.decision).toBe(BudgetDecision.SOFT_LIMIT);
    expect(second.scopeHit).toBe('feature:maestro_planning');
    expect(second.remaining?.tokens).toBe(0);
  });

  it('enforces hard limits on rolling windows and prunes expired usage', async () => {
    const usageStore = new InMemoryBudgetStore();
    const engine = new LlmBudgetEngine({
      policyProvider: new StaticPolicyProvider([
        {
          id: 'dev',
          scope: 'environment',
          window: 'day',
          mode: 'hard',
          limit: { requests: 2 },
        },
      ]),
      usageStore,
    });

    const dayMs = 24 * 60 * 60 * 1000;
    await engine.checkAndConsume(
      { environment: 'dev' },
      { requests: 1 },
      0
    );
    await engine.checkAndConsume(
      { environment: 'dev' },
      { requests: 1 },
      60 * 60 * 1000
    );

    const blocked = await engine.checkAndConsume(
      { environment: 'dev' },
      { requests: 1 },
      2 * 60 * 60 * 1000
    );
    expect(blocked.decision).toBe(BudgetDecision.HARD_LIMIT);
    expect(engine.metricsSnapshot().llm_budget_blocked_requests_total).toBe(1);

    const afterWindow = await engine.checkAndConsume(
      { environment: 'dev' },
      { requests: 1 },
      dayMs + 10_000
    );
    expect(afterWindow.decision).toBe(BudgetDecision.ALLOW);
  });
});
