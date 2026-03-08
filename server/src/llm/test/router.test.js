"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const globals_1 = require("@jest/globals");
const router_js_1 = require("../router.js");
const mock_js_1 = require("../providers/mock.js");
const index_js_1 = require("../policies/index.js");
const fs_1 = __importDefault(require("fs"));
(0, globals_1.describe)('LLMRouter', () => {
    const logDir = 'logs/llm_test_jest';
    (0, globals_1.beforeAll)(() => {
        if (!fs_1.default.existsSync(logDir)) {
            fs_1.default.mkdirSync(logDir, { recursive: true });
        }
    });
    (0, globals_1.afterAll)(() => {
        fs_1.default.rmSync(logDir, { recursive: true, force: true });
    });
    (0, globals_1.afterEach)(() => {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('Policy Ordering', () => {
        (0, globals_1.it)('should prefer cheaper provider with CostControlPolicy', async () => {
            // Setup providers
            const cheapProvider = new mock_js_1.MockProvider();
            cheapProvider.name = 'mock'; // default
            // Mock capabilities
            globals_1.jest.spyOn(cheapProvider, 'estimateCost').mockReturnValue(0.01);
            globals_1.jest.spyOn(cheapProvider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'mock', model: 'mock-model',
                text: 'cheap', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });
            const expensiveProvider = new mock_js_1.MockProvider();
            expensiveProvider.name = 'openai'; // pretend
            globals_1.jest.spyOn(expensiveProvider, 'estimateCost').mockReturnValue(0.10);
            globals_1.jest.spyOn(expensiveProvider, 'generate').mockResolvedValue({
                id: '2', requestId: 'req1', provider: 'openai', model: 'mock-model',
                text: 'expensive', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });
            const router = new router_js_1.LLMRouter({
                providers: [expensiveProvider, cheapProvider], // Expensive first in list
                policies: [new index_js_1.CostControlPolicy(0.05)], // Should filter out expensive
                logDir
            });
            const req = {
                messages: [{ role: 'user', content: 'test' }],
                tags: ['test']
            };
            const res = await router.route(req);
            // Should be the cheap one
            (0, globals_1.expect)(res.text).toBe('cheap');
            (0, globals_1.expect)(cheapProvider.generate).toHaveBeenCalled();
            // Expensive one might be filtered out before generate is called, or if generate called it means policy failed.
            // CostControlPolicy filters out providers > maxCost.
            // So expensiveProvider should NOT be called.
            (0, globals_1.expect)(expensiveProvider.generate).not.toHaveBeenCalled();
        });
        (0, globals_1.it)('should prefer faster provider with LatencyPolicy', async () => {
            // Setup providers
            const fastProvider = new mock_js_1.MockProvider();
            fastProvider.name = 'groq';
            fastProvider.capabilities[0].avgLatencyMs = 50;
            globals_1.jest.spyOn(fastProvider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'groq', model: 'mock-model',
                text: 'fast', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 50, cached: false
            });
            const slowProvider = new mock_js_1.MockProvider();
            slowProvider.name = 'openai';
            slowProvider.capabilities[0].avgLatencyMs = 500;
            globals_1.jest.spyOn(slowProvider, 'generate').mockResolvedValue({
                id: '2', requestId: 'req1', provider: 'openai', model: 'mock-model',
                text: 'slow', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 500, cached: false
            });
            const router = new router_js_1.LLMRouter({
                providers: [slowProvider, fastProvider], // Slow first
                policies: [new index_js_1.LatencyPolicy()], // Should reorder to [fast, slow]
                logDir
            });
            const req = {
                messages: [{ role: 'user', content: 'test' }],
                model: 'mock-model'
            };
            const res = await router.route(req);
            // Should be the fast one because it was moved to front of line
            (0, globals_1.expect)(res.text).toBe('fast');
            (0, globals_1.expect)(fastProvider.generate).toHaveBeenCalled();
            (0, globals_1.expect)(slowProvider.generate).not.toHaveBeenCalled();
        });
    });
    (0, globals_1.describe)('Caching', () => {
        (0, globals_1.it)('should return cached response on second call', async () => {
            const provider = new mock_js_1.MockProvider();
            globals_1.jest.spyOn(provider, 'generate').mockResolvedValue({
                id: '1', requestId: 'req1', provider: 'mock', model: 'mock-model',
                text: 'fresh', usage: { promptTokens: 1, completionTokens: 1, totalTokens: 2 },
                latencyMs: 10, cached: false
            });
            const router = new router_js_1.LLMRouter({
                providers: [provider],
                cacheTTL: 1000,
                logDir
            });
            const req = {
                messages: [{ role: 'user', content: 'cache me' }],
                model: 'mock-model'
            };
            // First call
            const res1 = await router.route(req);
            (0, globals_1.expect)(res1.cached).toBe(false);
            (0, globals_1.expect)(res1.text).toBe('fresh');
            (0, globals_1.expect)(provider.generate).toHaveBeenCalledTimes(1);
            // Second call
            const res2 = await router.route(req);
            (0, globals_1.expect)(res2.cached).toBe(true);
            (0, globals_1.expect)(res2.text).toBe('fresh');
            // Provider should NOT be called again
            (0, globals_1.expect)(provider.generate).toHaveBeenCalledTimes(1);
        });
    });
});
