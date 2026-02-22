import { describe, it, expect, beforeEach } from 'vitest';
import { CostAwareLLMRouter } from '../../../src/daao/routing/llmRouter.js';
import { DefaultModelCatalog } from '../../../src/daao/routing/modelCatalog.js';
import { DifficultySignal } from '../../../src/daao/difficulty/difficulty.js';

describe('CostAwareLLMRouter', () => {
  let router: CostAwareLLMRouter;
  let catalog: DefaultModelCatalog;

  beforeEach(() => {
    catalog = new DefaultModelCatalog();
    router = new CostAwareLLMRouter(catalog);
  });

  const easySignal: DifficultySignal = {
    score: 0.2,
    band: 'easy',
    domain: 'general',
    recommendedDepth: 1,
    reasons: []
  };

  const hardSignal: DifficultySignal = {
    score: 0.8,
    band: 'hard',
    domain: 'complex',
    recommendedDepth: 3,
    reasons: ['Complex query']
  };

  it('should select cheapest model for easy tasks with sufficient budget', async () => {
    const decision = await router.route(easySignal, { budget: 1.0 });
    // Expect gpt-4o-mini or claude-3-haiku depending on exact cost order in catalog
    // haiku: 0.00025, mini: 0.0006
    expect(decision.modelId).toBe('claude-3-haiku-20240307');
    expect(decision.estimatedWorstCaseCost).toBeLessThan(1.0);
  });

  it('should select most capable model within budget for hard tasks', async () => {
    // Budget high enough for o1-preview (0.04 * 4 = 0.16)
    const decision = await router.route(hardSignal, { budget: 0.2 });
    expect(decision.modelId).toBe('o1-preview');
  });

  it('should downgrade to cheaper capable model if budget is tight for hard task', async () => {
    // Budget 0.05. o1 (0.16) too expensive. gpt-4o (0.01*4=0.04) fits.
    const decision = await router.route(hardSignal, { budget: 0.05 });
    expect(decision.modelId).toBe('gpt-4o');
  });

  it('should fallback if budget is extremely low', async () => {
    // Budget 0.0000001
    const decision = await router.route(hardSignal, { budget: 0.0000001 });
    expect(decision.modelId).toBe('gpt-4o-mini'); // Fallback ID
    expect(decision.reasons.join(' ')).toContain('fallback');
  });

  it('should respect allowed providers', async () => {
    const openaiRouter = new CostAwareLLMRouter(catalog, {
      fallbackModelId: 'gpt-4o-mini',
      allowedProviders: ['openai']
    });

    const decision = await openaiRouter.route(easySignal, { budget: 1.0 });
    // Should be gpt-4o-mini (cheapest openai), not haiku
    expect(decision.modelId).toBe('gpt-4o-mini');
    expect(decision.provider).toBe('openai');
  });
});
