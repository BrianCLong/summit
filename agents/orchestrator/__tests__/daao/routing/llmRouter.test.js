"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const llmRouter_js_1 = require("../../../src/daao/routing/llmRouter.js");
const modelCatalog_js_1 = require("../../../src/daao/routing/modelCatalog.js");
(0, vitest_1.describe)('CostAwareLLMRouter', () => {
    let router;
    let catalog;
    (0, vitest_1.beforeEach)(() => {
        catalog = new modelCatalog_js_1.DefaultModelCatalog();
        router = new llmRouter_js_1.CostAwareLLMRouter(catalog);
    });
    const easySignal = {
        score: 0.2,
        band: 'easy',
        domain: 'general',
        recommendedDepth: 1,
        reasons: []
    };
    const hardSignal = {
        score: 0.8,
        band: 'hard',
        domain: 'complex',
        recommendedDepth: 3,
        reasons: ['Complex query']
    };
    (0, vitest_1.it)('should select cheapest model for easy tasks with sufficient budget', async () => {
        const decision = await router.route(easySignal, { budget: 1.0 });
        // Expect gpt-4o-mini or claude-3-haiku depending on exact cost order in catalog
        // haiku: 0.00025, mini: 0.0006
        (0, vitest_1.expect)(decision.modelId).toBe('claude-3-haiku-20240307');
        (0, vitest_1.expect)(decision.estimatedWorstCaseCost).toBeLessThan(1.0);
    });
    (0, vitest_1.it)('should select most capable model within budget for hard tasks', async () => {
        // Budget high enough for o1-preview (0.04 * 4 = 0.16)
        const decision = await router.route(hardSignal, { budget: 0.2 });
        (0, vitest_1.expect)(decision.modelId).toBe('o1-preview');
    });
    (0, vitest_1.it)('should downgrade to cheaper capable model if budget is tight for hard task', async () => {
        // Budget 0.05. o1 (0.16) too expensive. gpt-4o (0.01*4=0.04) fits.
        const decision = await router.route(hardSignal, { budget: 0.05 });
        (0, vitest_1.expect)(decision.modelId).toBe('gpt-4o');
    });
    (0, vitest_1.it)('should fallback if budget is extremely low', async () => {
        // Budget 0.0000001
        const decision = await router.route(hardSignal, { budget: 0.0000001 });
        (0, vitest_1.expect)(decision.modelId).toBe('gpt-4o-mini'); // Fallback ID
        (0, vitest_1.expect)(decision.reasons.join(' ')).toContain('fallback');
    });
    (0, vitest_1.it)('should respect allowed providers', async () => {
        const openaiRouter = new llmRouter_js_1.CostAwareLLMRouter(catalog, {
            fallbackModelId: 'gpt-4o-mini',
            allowedProviders: ['openai']
        });
        const decision = await openaiRouter.route(easySignal, { budget: 1.0 });
        // Should be gpt-4o-mini (cheapest openai), not haiku
        (0, vitest_1.expect)(decision.modelId).toBe('gpt-4o-mini');
        (0, vitest_1.expect)(decision.provider).toBe('openai');
    });
});
