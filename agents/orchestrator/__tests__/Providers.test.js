"use strict";
/**
 * Provider Tests
 */
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ClaudeProvider_js_1 = require("../src/providers/ClaudeProvider.js");
const OpenAIProvider_js_1 = require("../src/providers/OpenAIProvider.js");
const index_js_1 = require("../src/providers/index.js");
// Mock fetch
const mockFetch = vitest_1.vi.fn();
global.fetch = mockFetch;
(0, vitest_1.describe)('ClaudeProvider', () => {
    let provider;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        provider = new ClaudeProvider_js_1.ClaudeProvider({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            apiKey: 'test-api-key',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
    });
    (0, vitest_1.describe)('provider properties', () => {
        (0, vitest_1.it)('should return correct provider name', () => {
            (0, vitest_1.expect)(provider.provider).toBe('claude');
        });
        (0, vitest_1.it)('should return supported models', () => {
            const models = provider.supportedModels;
            (0, vitest_1.expect)(models).toContain('claude-3-5-sonnet-20241022');
            (0, vitest_1.expect)(models).toContain('claude-3-opus-20240229');
            (0, vitest_1.expect)(models).toContain('claude-3-haiku-20240307');
        });
    });
    (0, vitest_1.describe)('completion', () => {
        (0, vitest_1.it)('should make API request with correct format', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    content: [{ type: 'text', text: 'Hello!' }],
                    usage: { input_tokens: 10, output_tokens: 5 },
                }),
            });
            await provider.complete({
                messages: [{ role: 'user', content: 'Hi' }],
            });
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.anthropic.com/v1/messages', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Content-Type': 'application/json',
                    'x-api-key': 'test-api-key',
                    'anthropic-version': '2023-06-01',
                }),
            }));
        });
        (0, vitest_1.it)('should handle system messages', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    content: [{ type: 'text', text: 'Response' }],
                    usage: { input_tokens: 10, output_tokens: 5 },
                }),
            });
            await provider.complete({
                messages: [
                    { role: 'system', content: 'You are a helpful assistant' },
                    { role: 'user', content: 'Hello' },
                ],
            });
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options.body);
            (0, vitest_1.expect)(body.system).toBe('You are a helpful assistant');
        });
        (0, vitest_1.it)('should return response with usage metrics', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    content: [{ type: 'text', text: 'Test response' }],
                    usage: { input_tokens: 100, output_tokens: 50 },
                }),
            });
            const response = await provider.complete({
                messages: [{ role: 'user', content: 'Test' }],
            });
            (0, vitest_1.expect)(response.content).toBe('Test response');
            (0, vitest_1.expect)(response.usage.promptTokens).toBe(100);
            (0, vitest_1.expect)(response.usage.completionTokens).toBe(50);
            (0, vitest_1.expect)(response.usage.totalTokens).toBe(150);
            (0, vitest_1.expect)(response.usage.estimatedCostUSD).toBeGreaterThan(0);
        });
        (0, vitest_1.it)('should throw error on API failure', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });
            await (0, vitest_1.expect)(provider.complete({ messages: [{ role: 'user', content: 'Test' }] })).rejects.toThrow('Claude API error');
        });
    });
    (0, vitest_1.describe)('cost estimation', () => {
        (0, vitest_1.it)('should estimate cost correctly', () => {
            const cost = provider.estimateCost(1000, 500);
            (0, vitest_1.expect)(cost).toBeGreaterThan(0);
        });
    });
    (0, vitest_1.describe)('metrics', () => {
        (0, vitest_1.it)('should track metrics after requests', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    content: [{ type: 'text', text: 'Response' }],
                    usage: { input_tokens: 10, output_tokens: 5 },
                }),
            });
            await provider.complete({ messages: [{ role: 'user', content: 'Test' }] });
            const metrics = provider.getMetrics();
            (0, vitest_1.expect)(metrics.totalRequests).toBe(1);
            (0, vitest_1.expect)(metrics.successfulRequests).toBe(1);
        });
    });
});
(0, vitest_1.describe)('OpenAIProvider', () => {
    let provider;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        provider = new OpenAIProvider_js_1.OpenAIProvider({
            provider: 'gpt',
            model: 'gpt-4o',
            apiKey: 'test-api-key',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
    });
    (0, vitest_1.describe)('provider properties', () => {
        (0, vitest_1.it)('should return correct provider name for GPT models', () => {
            (0, vitest_1.expect)(provider.provider).toBe('gpt');
        });
        (0, vitest_1.it)('should return o1 provider for o1 models', () => {
            const o1Provider = new OpenAIProvider_js_1.OpenAIProvider({
                provider: 'o1',
                model: 'o1-preview',
                apiKey: 'test-key',
                maxTokens: 32768,
                temperature: 1,
                timeout: 120000,
                retries: 2,
            });
            (0, vitest_1.expect)(o1Provider.provider).toBe('o1');
        });
        (0, vitest_1.it)('should return supported models', () => {
            const models = provider.supportedModels;
            (0, vitest_1.expect)(models).toContain('gpt-4o');
            (0, vitest_1.expect)(models).toContain('gpt-4-turbo');
            (0, vitest_1.expect)(models).toContain('o1-preview');
        });
    });
    (0, vitest_1.describe)('completion', () => {
        (0, vitest_1.it)('should make API request with correct format', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    id: 'test',
                    choices: [{ message: { content: 'Hello!' } }],
                    usage: { prompt_tokens: 10, completion_tokens: 5 },
                }),
            });
            await provider.complete({
                messages: [{ role: 'user', content: 'Hi' }],
            });
            (0, vitest_1.expect)(mockFetch).toHaveBeenCalledWith('https://api.openai.com/v1/chat/completions', vitest_1.expect.objectContaining({
                method: 'POST',
                headers: vitest_1.expect.objectContaining({
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer test-api-key',
                }),
            }));
        });
        (0, vitest_1.it)('should handle o1 model constraints', async () => {
            const o1Provider = new OpenAIProvider_js_1.OpenAIProvider({
                provider: 'o1',
                model: 'o1-preview',
                apiKey: 'test-key',
                maxTokens: 32768,
                temperature: 1,
                timeout: 120000,
                retries: 2,
            });
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    choices: [{ message: { content: 'Response' } }],
                    usage: { prompt_tokens: 100, completion_tokens: 500 },
                }),
            });
            await o1Provider.complete({
                messages: [
                    { role: 'system', content: 'Be helpful' },
                    { role: 'user', content: 'Think deeply' },
                ],
            });
            const [, options] = mockFetch.mock.calls[0];
            const body = JSON.parse(options.body);
            // o1 should not have temperature
            (0, vitest_1.expect)(body.temperature).toBeUndefined();
            // System message should be converted for o1
            (0, vitest_1.expect)(body.messages[0].content).toContain('System Instructions');
        });
    });
});
(0, vitest_1.describe)('ProviderFactory', () => {
    (0, vitest_1.it)('should create Claude provider', () => {
        const provider = index_js_1.ProviderFactory.create({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
        (0, vitest_1.expect)(provider).toBeInstanceOf(ClaudeProvider_js_1.ClaudeProvider);
    });
    (0, vitest_1.it)('should create OpenAI provider', () => {
        const provider = index_js_1.ProviderFactory.create({
            provider: 'gpt',
            model: 'gpt-4o',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
        (0, vitest_1.expect)(provider).toBeInstanceOf(OpenAIProvider_js_1.OpenAIProvider);
    });
    (0, vitest_1.it)('should create default registry', () => {
        const registry = index_js_1.ProviderFactory.createDefaultRegistry();
        (0, vitest_1.expect)(registry.size).toBeGreaterThan(0);
    });
});
(0, vitest_1.describe)('ProviderRegistry', () => {
    let registry;
    (0, vitest_1.beforeEach)(() => {
        registry = new index_js_1.ProviderRegistry();
    });
    (0, vitest_1.it)('should register and retrieve providers', () => {
        const provider = new ClaudeProvider_js_1.ClaudeProvider({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
        registry.register('claude-sonnet', provider);
        (0, vitest_1.expect)(registry.get('claude-sonnet')).toBe(provider);
    });
    (0, vitest_1.it)('should set and get default provider', () => {
        const provider = new ClaudeProvider_js_1.ClaudeProvider({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
        registry.register('claude', provider, true);
        (0, vitest_1.expect)(registry.getDefault()).toBe(provider);
    });
    (0, vitest_1.it)('should find provider by model', () => {
        const provider = new ClaudeProvider_js_1.ClaudeProvider({
            provider: 'claude',
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 4096,
            temperature: 0.7,
            timeout: 30000,
            retries: 2,
        });
        registry.register('claude', provider);
        const found = registry.getByModel('claude-3-5-sonnet-20241022');
        (0, vitest_1.expect)(found).toBe(provider);
    });
});
(0, vitest_1.describe)('MODEL_CAPABILITIES', () => {
    (0, vitest_1.it)('should have capabilities for all models', () => {
        const models = [
            'claude-3-5-sonnet-20241022',
            'gpt-4o',
            'o1-preview',
        ];
        for (const model of models) {
            (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES[model]).toBeDefined();
            (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES[model].maxContextTokens).toBeGreaterThan(0);
        }
    });
    (0, vitest_1.it)('should indicate o1 models do not support tools', () => {
        (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES['o1-preview'].supportsTools).toBe(false);
        (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES['o1-mini'].supportsTools).toBe(false);
    });
    (0, vitest_1.it)('should indicate Claude/GPT models support tools', () => {
        (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES['claude-3-5-sonnet-20241022'].supportsTools).toBe(true);
        (0, vitest_1.expect)(index_js_1.MODEL_CAPABILITIES['gpt-4o'].supportsTools).toBe(true);
    });
});
