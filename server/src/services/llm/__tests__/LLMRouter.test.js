"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const LLMRouter_js_1 = require("../LLMRouter.js");
const MockProvider_js_1 = require("../providers/MockProvider.js");
const CostControlPolicy_js_1 = require("../policies/CostControlPolicy.js");
const mockConfig = {
    providers: [
        {
            name: 'mock-fast',
            type: 'mock',
            apiKeyEnv: 'MOCK_KEY',
            models: { 'test': 'mock-fast-model' },
            costPerMs: 0
        },
        {
            name: 'mock-slow-cheap',
            type: 'mock',
            apiKeyEnv: 'MOCK_KEY',
            models: { 'test': 'mock-slow-cheap' },
            costPerMs: 0
        }
    ],
    routing: {
        defaultPolicy: 'cost-control'
    },
    budgets: {
        globalDailyUsd: 10.0,
        perTenantDailyUsd: {
            'tenant-1': 1.0
        }
    }
};
(0, globals_1.describe)('LLMRouter', () => {
    let router;
    (0, globals_1.beforeEach)(() => {
        router = new LLMRouter_js_1.LLMRouter(mockConfig);
        CostControlPolicy_js_1.CostControlPolicy.resetUsage();
    });
    test('should instantiate correctly', () => {
        (0, globals_1.expect)(router).toBeDefined();
    });
    test('should execute a request successfully using mock provider', async () => {
        const result = await router.execute({
            taskType: 'test',
            prompt: 'Hello world'
        });
        (0, globals_1.expect)(result.ok).toBe(true);
        (0, globals_1.expect)(result.text).toContain('Mock response');
        (0, globals_1.expect)(result.provider).toBeDefined();
    });
    test('should handle routing failure gracefully', async () => {
        const badConfig = {
            providers: [],
            routing: { defaultPolicy: 'cost-control' }
        };
        const badRouter = new LLMRouter_js_1.LLMRouter(badConfig);
        const result = await badRouter.execute({
            taskType: 'test',
            prompt: 'Hello'
        });
        (0, globals_1.expect)(result.ok).toBe(false);
        (0, globals_1.expect)(result.error).toContain('No providers found');
    });
    test('should redact PII', async () => {
        const result = await router.execute({
            taskType: 'test',
            prompt: 'My SECRET_KEY is 123'
        });
        (0, globals_1.expect)(result.text).toContain('[REDACTED]');
        (0, globals_1.expect)(result.text).not.toContain('SECRET_KEY');
    });
    test('should enforce global budget', async () => {
        // Mock provider cost is 0 in default config, let's make it expensive
        const expensiveConfig = { ...mockConfig };
        expensiveConfig.providers = [{
                name: 'expensive',
                type: 'mock',
                apiKeyEnv: 'MOCK',
                models: { 'test': 'expensive' },
                costPerMs: 1 // Doesn't matter, mock uses estimate()
            }];
        // We need to subclass MockProvider or mock estimate to return high cost
        class ExpensiveProvider extends MockProvider_js_1.MockProvider {
            estimate() { return { costUsd: 100, p95ms: 10 }; }
        }
        const routerWithExpensive = new LLMRouter_js_1.LLMRouter(expensiveConfig);
        // Inject expensive provider manually for test
        routerWithExpensive.providers.set('expensive', new ExpensiveProvider());
        // 1. First call exceeds budget
        const result1 = await routerWithExpensive.execute({ taskType: 'test', prompt: 'hi' });
        (0, globals_1.expect)(result1.ok).toBe(true); // First call succeeds but bumps usage
        // 2. Second call should fail because budget is exceeded
        const result2 = await routerWithExpensive.execute({ taskType: 'test', prompt: 'hi again' });
        // It might return "Policy returned no provider" or we can refine the error
        (0, globals_1.expect)(result2.ok).toBe(false);
        (0, globals_1.expect)(result2.error).toContain('Policy returned no provider');
    });
});
