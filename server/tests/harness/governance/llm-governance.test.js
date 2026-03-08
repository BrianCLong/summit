"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const router_js_1 = require("../llm/router.js");
const mock_js_1 = require("../llm/providers/mock.js");
const index_js_1 = require("../llm/policies/index.js");
class FastProvider extends mock_js_1.MockProvider {
    name = 'mock';
    constructor() {
        super();
        this.capabilities = [
            {
                name: 'mock-fast',
                contextWindow: 4000,
                inputCostPer1k: 0,
                outputCostPer1k: 0,
                tags: ['fast'],
                avgLatencyMs: 20,
            },
        ];
    }
    async generate(request) {
        return {
            id: 'fast-resp',
            requestId: request.id,
            provider: this.name,
            model: 'mock-fast',
            text: 'fast-ok',
            usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15, cost: 0 },
            latencyMs: 10,
            cached: false,
            ok: true,
        };
    }
}
class PremiumProvider extends mock_js_1.MockProvider {
    name = 'openai';
    constructor() {
        super();
        this.capabilities = [
            {
                name: 'mock-premium',
                contextWindow: 4000,
                inputCostPer1k: 1,
                outputCostPer1k: 1,
                tags: ['premium'],
                avgLatencyMs: 100,
            },
        ];
    }
    estimateCost() {
        return 5;
    }
    async generate(request) {
        return {
            id: 'premium-resp',
            requestId: request.id,
            provider: this.name,
            model: 'mock-premium',
            text: 'premium-ok',
            usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 5 },
            latencyMs: 50,
            cached: false,
            ok: true,
        };
    }
}
const baseRequest = {
    tenantId: 'test',
    messages: [{ role: 'user', content: 'hi' }],
    budget: { maxCost: 0.05 },
};
(0, globals_1.describe)('LLM governance router', () => {
    (0, globals_1.it)('routes to the cheapest provider within budget', async () => {
        const router = new router_js_1.LLMRouter({
            providers: [new FastProvider(), new PremiumProvider()],
            policies: [new index_js_1.CostControlPolicy()],
        });
        const response = await router.route({ ...baseRequest, id: 'policy-ok' });
        (0, globals_1.expect)(response.ok).toBe(true);
        (0, globals_1.expect)(response.provider).toBe('mock');
    });
    (0, globals_1.it)('routes to premium when requested via tags and budget allows', async () => {
        const router = new router_js_1.LLMRouter({
            providers: [new FastProvider(), new PremiumProvider()],
            policies: [new index_js_1.CostControlPolicy(10)],
        });
        const response = await router.route({
            ...baseRequest,
            id: 'premium-ok',
            tags: ['premium'],
            budget: { maxCost: 10 },
        });
        (0, globals_1.expect)(response.ok).toBe(true);
        (0, globals_1.expect)(response.provider).toBe('openai');
    });
    (0, globals_1.it)('rejects when all providers are filtered by budget', async () => {
        const router = new router_js_1.LLMRouter({
            providers: [new PremiumProvider()],
            policies: [new index_js_1.CostControlPolicy(0.1)],
        });
        await (0, globals_1.expect)(router.route({
            ...baseRequest,
            id: 'budget-blocked',
            tags: ['premium'],
            budget: { maxCost: 0 },
        })).rejects.toThrow('All providers filtered out by policies');
    });
});
