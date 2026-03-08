"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const premium_model_router_js_1 = require("../premium-model-router.js");
const baseRequest = {
    query: 'Analyze recent events and provide a concise summary.',
    context: {
        userId: 'user-1',
        tenantId: 'tenant-1',
        taskType: 'analysis',
        complexity: 0.4,
        budget: 10,
        urgency: 'medium',
        qualityRequirement: 0.7,
        expectedOutputLength: 512,
    },
    constraints: {},
};
(0, globals_1.describe)('PremiumModelRouter', () => {
    const originalEnv = { ...process.env };
    (0, globals_1.beforeEach)(() => {
        process.env = { ...originalEnv, DATABASE_URL: '', REDIS_URL: '' };
    });
    (0, globals_1.afterAll)(() => {
        process.env = originalEnv;
    });
    test('constructs and connects without throwing', async () => {
        const router = new premium_model_router_js_1.PremiumModelRouter();
        await router.connect();
        (0, globals_1.expect)(true).toBe(true);
    });
    test('returns a routing decision with required fields', async () => {
        const router = new premium_model_router_js_1.PremiumModelRouter();
        const decision = await router.routeToOptimalModel(baseRequest);
        (0, globals_1.expect)(decision.selectedModel).toBeDefined();
        (0, globals_1.expect)(typeof decision.confidence).toBe('number');
        (0, globals_1.expect)(decision.routingStrategy).toBeDefined();
        (0, globals_1.expect)(Array.isArray(decision.fallbackModels)).toBe(true);
        (0, globals_1.expect)(decision.fallbackModels.length).toBeGreaterThan(0);
    });
    test('basic mode returns deterministic default when env vars are missing', async () => {
        const router = new premium_model_router_js_1.PremiumModelRouter();
        const decision = await router.routeToOptimalModel(baseRequest);
        (0, globals_1.expect)(decision.selectedModel.id).toBe('gpt-4o');
        (0, globals_1.expect)(decision.routingStrategy).toBe('basic-default');
        (0, globals_1.expect)(decision.reasoning).toMatch(/default premium model/i);
    });
});
