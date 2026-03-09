import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OpenAIAdapter } from '../openai-adapter.js';
import { AnthropicAdapter } from '../anthropic-adapter.js';
import { GoogleADKAdapter } from '../google-adk-adapter.js';
import { RateLimitError } from '../base-adapter.js';

describe('Adapters with Mocks', () => {
  const task = { taskId: '1', instruction: 'Hello' };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  describe('OpenAIAdapter', () => {
    it('should invoke successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          choices: [{ message: { content: 'Hi' } }],
          usage: { total_tokens: 10 }
        }),
      };
      const fetchSpy = vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const adapter = new OpenAIAdapter('test-key');
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Hi');
      expect(result.tokensUsed).toBe(10);
    });

    it('should retry on 429', async () => {
      const mock429 = { ok: false, status: 429, headers: new Headers() };
      const mock200 = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          choices: [{ message: { content: 'Success' } }],
          usage: { total_tokens: 5 }
        }),
      };

      const fetchSpy = vi.mocked(global.fetch)
        .mockResolvedValueOnce(mock429 as any)
        .mockResolvedValueOnce(mock200 as any);

      const adapter = new OpenAIAdapter('test-key');
      (adapter as any).baseDelayMs = 1;
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Success');
    });
  });

  describe('AnthropicAdapter', () => {
    it('should invoke successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({
          content: [{ type: 'text', text: 'Hello from Claude' }],
          usage: { total_tokens: 15 }
        }),
      };
      const fetchSpy = vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const adapter = new AnthropicAdapter('test-key');
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Hello from Claude');
    });
  });

  describe('GoogleADKAdapter', () => {
    it('should invoke successfully', async () => {
      const endpoint = 'http://localhost:8080/adk';
      process.env.GOOGLE_ADK_ENDPOINT = endpoint;

      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ output: 'ADK result', tokensUsed: 20 }),
      };
      const fetchSpy = vi.mocked(global.fetch).mockResolvedValue(mockResponse as any);

      const adapter = new GoogleADKAdapter();
      const result = await adapter.invoke(task);
      expect(result.output).toBe('ADK result');
    });
  });

  describe('BaseAdapter Rate Limiting', () => {
    it('should throw RateLimitError when tokens are exhausted', async () => {
      const adapter = new OpenAIAdapter('test-key');
      (adapter as any).tokens = 0;
      (adapter as any).maxRetries = 1;

      await expect(adapter.invoke(task)).rejects.toThrow(RateLimitError);
    });
  });
});
