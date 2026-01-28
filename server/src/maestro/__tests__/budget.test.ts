import {
  buildBudgetEvidence,
  normalizeReasoningBudget,
} from '../budget';

describe('Reasoning budget normalization', () => {
  it('applies defaults and enforces think mode off', () => {
    const budget = normalizeReasoningBudget({
      thinkMode: 'off',
      thinkingBudget: 5000,
      maxTokens: 100,
    });

    expect(budget.thinkMode).toBe('off');
    expect(budget.thinkingBudget).toBe(0);
    expect(budget.maxTokens).toBe(100);
  });

  it('builds evidence payloads with outcomes', () => {
    const budget = normalizeReasoningBudget();
    const evidence = buildBudgetEvidence(budget, {
      success: true,
      latencyMs: 1200,
      totalCostUSD: 1.2,
      totalInputTokens: 500,
      totalOutputTokens: 400,
    });

    expect(evidence.budget).toEqual(budget);
    expect(evidence.outcome?.success).toBe(true);
    expect(evidence.outcome?.latencyMs).toBe(1200);
  });
});
