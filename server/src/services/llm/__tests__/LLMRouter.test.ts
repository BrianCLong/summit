
import { jest, describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { LLMRouter } from '../LLMRouter.js';
import { LLMRouterConfig } from '../interfaces.js';
import { MockProvider } from '../providers/MockProvider.js';
import { CostControlPolicy } from '../policies/CostControlPolicy.js';
import { LatencyPolicy } from '../policies/LatencyPolicy.js';

const mockConfig: LLMRouterConfig = {
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

describe('LLMRouter', () => {
    let router: LLMRouter;

    beforeEach(() => {
        router = new LLMRouter(mockConfig);
        CostControlPolicy.resetUsage();
    });

    test('should instantiate correctly', () => {
        expect(router).toBeDefined();
    });

    test('should execute a request successfully using mock provider', async () => {
        const result = await router.execute({
            taskType: 'test',
            prompt: 'Hello world'
        });

        expect(result.ok).toBe(true);
        expect(result.text).toContain('Mock response');
        expect(result.provider).toBeDefined();
    });

    test('should handle routing failure gracefully', async () => {
        const badConfig: LLMRouterConfig = {
            providers: [],
            routing: { defaultPolicy: 'cost-control' }
        };
        const badRouter = new LLMRouter(badConfig);

        const result = await badRouter.execute({
            taskType: 'test',
            prompt: 'Hello'
        });

        expect(result.ok).toBe(false);
        expect(result.error).toContain('No providers found');
    });

    test('should redact PII', async () => {
        const result = await router.execute({
            taskType: 'test',
            prompt: 'My SECRET_KEY is 123'
        });

        expect(result.text).toContain('[REDACTED]');
        expect(result.text).not.toContain('SECRET_KEY');
    });

    test('should enforce global budget', async () => {
        // Mock provider cost is 0 in default config, let's make it expensive
        const expensiveConfig = { ...mockConfig };
        expensiveConfig.providers = [{
            name: 'expensive',
            type: 'mock',
            apiKeyEnv: 'MOCK',
            models: {'test': 'expensive'},
            costPerMs: 1 // Doesn't matter, mock uses estimate()
        }];

        // We need to subclass MockProvider or mock estimate to return high cost
        class ExpensiveProvider extends MockProvider {
            estimate() { return { costUsd: 100, p95ms: 10 }; }
        }

        const routerWithExpensive = new LLMRouter(expensiveConfig);
        // Inject expensive provider manually for test
        (routerWithExpensive as any).providers.set('expensive', new ExpensiveProvider());

        // 1. First call exceeds budget
        const result1 = await routerWithExpensive.execute({ taskType: 'test', prompt: 'hi' });
        expect(result1.ok).toBe(true); // First call succeeds but bumps usage

        // 2. Second call should fail because budget is exceeded
        const result2 = await routerWithExpensive.execute({ taskType: 'test', prompt: 'hi again' });

        // It might return "Policy returned no provider" or we can refine the error
        expect(result2.ok).toBe(false);
        expect(result2.error).toContain('Policy returned no provider');
    });
});
