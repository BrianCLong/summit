/**
 * Provider Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeProvider } from '../src/providers/ClaudeProvider.js';
import { OpenAIProvider } from '../src/providers/OpenAIProvider.js';
import { ProviderFactory, ProviderRegistry, MODEL_CAPABILITIES } from '../src/providers/index.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClaudeProvider', () => {
  let provider: ClaudeProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new ClaudeProvider({
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      apiKey: 'test-api-key',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });
  });

  describe('provider properties', () => {
    it('should return correct provider name', () => {
      expect(provider.provider).toBe('claude');
    });

    it('should return supported models', () => {
      const models = provider.supportedModels;
      expect(models).toContain('claude-3-5-sonnet-20241022');
      expect(models).toContain('claude-3-opus-20240229');
      expect(models).toContain('claude-3-haiku-20240307');
    });
  });

  describe('completion', () => {
    it('should make API request with correct format', async () => {
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

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.anthropic.com/v1/messages',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'x-api-key': 'test-api-key',
            'anthropic-version': '2023-06-01',
          }),
        }),
      );
    });

    it('should handle system messages', async () => {
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
      expect(body.system).toBe('You are a helpful assistant');
    });

    it('should return response with usage metrics', async () => {
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

      expect(response.content).toBe('Test response');
      expect(response.usage.promptTokens).toBe(100);
      expect(response.usage.completionTokens).toBe(50);
      expect(response.usage.totalTokens).toBe(150);
      expect(response.usage.estimatedCostUSD).toBeGreaterThan(0);
    });

    it('should throw error on API failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: async () => 'Internal Server Error',
      });

      await expect(
        provider.complete({ messages: [{ role: 'user', content: 'Test' }] }),
      ).rejects.toThrow('Claude API error');
    });
  });

  describe('cost estimation', () => {
    it('should estimate cost correctly', () => {
      const cost = provider.estimateCost(1000, 500);
      expect(cost).toBeGreaterThan(0);
    });
  });

  describe('metrics', () => {
    it('should track metrics after requests', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ type: 'text', text: 'Response' }],
          usage: { input_tokens: 10, output_tokens: 5 },
        }),
      });

      await provider.complete({ messages: [{ role: 'user', content: 'Test' }] });

      const metrics = provider.getMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.successfulRequests).toBe(1);
    });
  });
});

describe('OpenAIProvider', () => {
  let provider: OpenAIProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new OpenAIProvider({
      provider: 'gpt',
      model: 'gpt-4o',
      apiKey: 'test-api-key',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });
  });

  describe('provider properties', () => {
    it('should return correct provider name for GPT models', () => {
      expect(provider.provider).toBe('gpt');
    });

    it('should return o1 provider for o1 models', () => {
      const o1Provider = new OpenAIProvider({
        provider: 'o1',
        model: 'o1-preview',
        apiKey: 'test-key',
        maxTokens: 32768,
        temperature: 1,
        timeout: 120000,
        retries: 2,
      });
      expect(o1Provider.provider).toBe('o1');
    });

    it('should return supported models', () => {
      const models = provider.supportedModels;
      expect(models).toContain('gpt-4o');
      expect(models).toContain('gpt-4-turbo');
      expect(models).toContain('o1-preview');
    });
  });

  describe('completion', () => {
    it('should make API request with correct format', async () => {
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

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-api-key',
          }),
        }),
      );
    });

    it('should handle o1 model constraints', async () => {
      const o1Provider = new OpenAIProvider({
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
      expect(body.temperature).toBeUndefined();

      // System message should be converted for o1
      expect(body.messages[0].content).toContain('System Instructions');
    });
  });
});

describe('ProviderFactory', () => {
  it('should create Claude provider', () => {
    const provider = ProviderFactory.create({
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });

    expect(provider).toBeInstanceOf(ClaudeProvider);
  });

  it('should create OpenAI provider', () => {
    const provider = ProviderFactory.create({
      provider: 'gpt',
      model: 'gpt-4o',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });

    expect(provider).toBeInstanceOf(OpenAIProvider);
  });

  it('should create default registry', () => {
    const registry = ProviderFactory.createDefaultRegistry();
    expect(registry.size).toBeGreaterThan(0);
  });
});

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  it('should register and retrieve providers', () => {
    const provider = new ClaudeProvider({
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });

    registry.register('claude-sonnet', provider);
    expect(registry.get('claude-sonnet')).toBe(provider);
  });

  it('should set and get default provider', () => {
    const provider = new ClaudeProvider({
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });

    registry.register('claude', provider, true);
    expect(registry.getDefault()).toBe(provider);
  });

  it('should find provider by model', () => {
    const provider = new ClaudeProvider({
      provider: 'claude',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.7,
      timeout: 30000,
      retries: 2,
    });

    registry.register('claude', provider);
    const found = registry.getByModel('claude-3-5-sonnet-20241022');
    expect(found).toBe(provider);
  });
});

describe('MODEL_CAPABILITIES', () => {
  it('should have capabilities for all models', () => {
    const models = [
      'claude-3-5-sonnet-20241022',
      'gpt-4o',
      'o1-preview',
    ];

    for (const model of models) {
      expect(MODEL_CAPABILITIES[model]).toBeDefined();
      expect(MODEL_CAPABILITIES[model].maxContextTokens).toBeGreaterThan(0);
    }
  });

  it('should indicate o1 models do not support tools', () => {
    expect(MODEL_CAPABILITIES['o1-preview'].supportsTools).toBe(false);
    expect(MODEL_CAPABILITIES['o1-mini'].supportsTools).toBe(false);
  });

  it('should indicate Claude/GPT models support tools', () => {
    expect(MODEL_CAPABILITIES['claude-3-5-sonnet-20241022'].supportsTools).toBe(true);
    expect(MODEL_CAPABILITIES['gpt-4o'].supportsTools).toBe(true);
  });
});
