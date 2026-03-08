import { describe, it, expect, beforeEach } from '@jest/globals';
import { CostAwareLLMRouter, RoutingDecision } from '../routing/llmRouter';
import { DefaultModelCatalog, ModelCatalog } from '../routing/modelCatalog';
import { DifficultySignal } from '../difficulty/difficulty';

describe('CostAwareLLMRouter', () => {
  let router: CostAwareLLMRouter;
  let catalog: ModelCatalog;

  beforeEach(() => {
    catalog = new DefaultModelCatalog();
    router = new CostAwareLLMRouter(catalog);
  });

  const easySignal: DifficultySignal = {
    score: 0.1,
    band: 'easy',
    domain: 'general',
    recommendedDepth: 1,
    reasons: []
  };

  const hardSignal: DifficultySignal = {
    score: 0.9,
    band: 'hard',
    domain: 'coding',
    recommendedDepth: 3,
    reasons: []
  };

  it('should select cheapest model for easy tasks', () => {
    const decision = router.route(easySignal, 100);
    expect(decision.modelId).toBe('openai/gpt-4o-mini');
    expect(decision.reason).toContain('Easy task');
  });

  it('should select high tier model for hard tasks if budget allows', () => {
    const decision = router.route(hardSignal, 1000, 1.0); // High budget
    // Both gpt-4o and claude-3-5-sonnet are high tier and support coding.
    // GPT-4o is slightly cheaper in my mock catalog, so it might be preferred by the sort logic.
    expect(['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20240620']).toContain(decision.modelId);
    expect(decision.reason).toContain('Hard task');
  });

  it('should fallback to cheapest model if budget is exceeded', () => {
    // Very strict budget that even cheap models might exceed if input is huge
    // But here input is huge (1M tokens) and budget is tiny (0.00000001)
    const decision = router.route(hardSignal, 1000000, 0.00000001);
    expect(decision.reason).toContain('Budget exceeded');
    expect(decision.modelId).toBe('openai/gpt-4o-mini');
  });
});
