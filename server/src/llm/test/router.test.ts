// @ts-nocheck
import { describe, it, expect, jest, beforeAll, afterAll, afterEach } from '@jest/globals';
import { LLMRouter } from '../router.js';
import { MockProvider } from '../providers/mock.js';
import { CostControlPolicy, LatencyPolicy } from '../policies/index.js';
import { LLMRequest, LLMResponse } from '../types.js';
import fs from 'fs';
import { ProviderAdapter } from '../types.js';

describe('LLMRouter', () => {
    const logDir = 'logs/llm_test_jest';

    beforeAll(() => {
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
    });

    afterAll(() => {
        fs.rmSync(logDir, { recursive: true, force: true });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Policy Ordering', () => {
        it('should prefer cheaper provider with CostControlPolicy', async () => {
            // Setup providers
            const cheapProvider = new MockProvider();
            cheapProvider.name = 'mock' as any; // default
            // Mock capabilities
            jest.spyOn(cheapProvider, 'estimateCost').mockReturnValue(0.01);
            jest.spyOn(cheapProvider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'mock', model: 'mock-model',
                text: 'cheap', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });

            const expensiveProvider = new MockProvider();
            expensiveProvider.name = 'openai' as any; // pretend
            jest.spyOn(expensiveProvider, 'estimateCost').mockReturnValue(0.10);
             jest.spyOn(expensiveProvider, 'generate').mockResolvedValue({
                id: '2', requestId: 'req1', provider: 'openai', model: 'mock-model',
                text: 'expensive', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });

            const router = new LLMRouter({
                providers: [expensiveProvider, cheapProvider], // Expensive first in list
                policies: [new CostControlPolicy(0.05)], // Should filter out expensive
                logDir
            });

            const req: Partial<LLMRequest> = {
                messages: [{ role: 'user', content: 'test' }],
                tags: ['test']
            };

            const res = await router.route(req);

            // Should be the cheap one
            expect(res.text).toBe('cheap');
            expect(cheapProvider.generate).toHaveBeenCalled();
            // Expensive one might be filtered out before generate is called, or if generate called it means policy failed.
            // CostControlPolicy filters out providers > maxCost.
            // So expensiveProvider should NOT be called.
            expect(expensiveProvider.generate).not.toHaveBeenCalled();
        });

        it('should prefer faster provider with LatencyPolicy', async () => {
            // Setup providers
            const fastProvider = new MockProvider();
            fastProvider.name = 'groq' as any;
            (fastProvider as any).capabilities[0].avgLatencyMs = 50;
            jest.spyOn(fastProvider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'groq', model: 'mock-model',
                text: 'fast', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 50, cached: false
            });

            const slowProvider = new MockProvider();
            slowProvider.name = 'openai' as any;
            (slowProvider as any).capabilities[0].avgLatencyMs = 500;
             jest.spyOn(slowProvider, 'generate').mockResolvedValue({
                id: '2', requestId: 'req1', provider: 'openai', model: 'mock-model',
                text: 'slow', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 500, cached: false
            });

            const router = new LLMRouter({
                providers: [slowProvider, fastProvider], // Slow first
                policies: [new LatencyPolicy()], // Should reorder to [fast, slow]
                logDir
            });

            const req: Partial<LLMRequest> = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'mock-model'
            };

            const res = await router.route(req);

            // Should be the fast one because it was moved to front of line
            expect(res.text).toBe('fast');
            expect(fastProvider.generate).toHaveBeenCalled();
            expect(slowProvider.generate).not.toHaveBeenCalled();
        });
    });

    describe('Caching', () => {
        it('should return cached response on second call', async () => {
             const provider = new MockProvider();
             jest.spyOn(provider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'mock', model: 'mock-model',
                text: 'fresh', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });

            const router = new LLMRouter({
                providers: [provider],
                cacheTTL: 1000,
                logDir
            });

            const req: Partial<LLMRequest> = {
                messages: [{ role: 'user', content: 'cache me' }],
                model: 'mock-model'
            };

            // First call
            const res1 = await router.route(req);
            expect(res1.cached).toBe(false);
            expect(res1.text).toBe('fresh');
            expect(provider.generate).toHaveBeenCalledTimes(1);

            // Second call
            const res2 = await router.route(req);
            expect(res2.cached).toBe(true);
            expect(res2.text).toBe('fresh');
            // Provider should NOT be called again
            expect(provider.generate).toHaveBeenCalledTimes(1);
        });
    });
});
