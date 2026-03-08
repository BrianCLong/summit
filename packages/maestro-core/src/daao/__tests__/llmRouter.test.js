"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const llmRouter_1 = require("../routing/llmRouter");
const modelCatalog_1 = require("../routing/modelCatalog");
(0, globals_1.describe)('CostAwareLLMRouter', () => {
    let router;
    let catalog;
    (0, globals_1.beforeEach)(() => {
        catalog = new modelCatalog_1.DefaultModelCatalog();
        router = new llmRouter_1.CostAwareLLMRouter(catalog);
    });
    const easySignal = {
        score: 0.1,
        band: 'easy',
        domain: 'general',
        recommendedDepth: 1,
        reasons: []
    };
    const hardSignal = {
        score: 0.9,
        band: 'hard',
        domain: 'coding',
        recommendedDepth: 3,
        reasons: []
    };
    (0, globals_1.it)('should select cheapest model for easy tasks', () => {
        const decision = router.route(easySignal, 100);
        (0, globals_1.expect)(decision.modelId).toBe('openai/gpt-4o-mini');
        (0, globals_1.expect)(decision.reason).toContain('Easy task');
    });
    (0, globals_1.it)('should select high tier model for hard tasks if budget allows', () => {
        const decision = router.route(hardSignal, 1000, 1.0); // High budget
        // Both gpt-4o and claude-3-5-sonnet are high tier and support coding.
        // GPT-4o is slightly cheaper in my mock catalog, so it might be preferred by the sort logic.
        (0, globals_1.expect)(['openai/gpt-4o', 'anthropic/claude-3-5-sonnet-20240620']).toContain(decision.modelId);
        (0, globals_1.expect)(decision.reason).toContain('Hard task');
    });
    (0, globals_1.it)('should fallback to cheapest model if budget is exceeded', () => {
        // Very strict budget that even cheap models might exceed if input is huge
        // But here input is huge (1M tokens) and budget is tiny (0.00000001)
        const decision = router.route(hardSignal, 1000000, 0.00000001);
        (0, globals_1.expect)(decision.reason).toContain('Budget exceeded');
        (0, globals_1.expect)(decision.modelId).toBe('openai/gpt-4o-mini');
    });
});
