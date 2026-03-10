import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { OpenAIAdapter } from '../openai-adapter.js';
import { AnthropicAdapter } from '../anthropic-adapter.js';
import { GoogleADKAdapter } from '../google-adk-adapter.js';
import { RateLimitError } from '../base-adapter.js';

describe('Adapters with Nock', () => {
  const task = { taskId: '1', instruction: 'Hello' };

  beforeEach(() => {
    if (!nock.isActive()) nock.activate();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.restore();
  });

  describe('OpenAIAdapter', () => {
    it('should invoke successfully', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          choices: [{ message: { content: 'Hi' } }],
          usage: { total_tokens: 10 },
        });

      const adapter = new OpenAIAdapter('test-key');
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Hi');
      expect(result.tokensUsed).toBe(10);
    });

    it('should retry on 429', async () => {
      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(429);

      nock('https://api.openai.com')
        .post('/v1/chat/completions')
        .reply(200, {
          choices: [{ message: { content: 'Success' } }],
          usage: { total_tokens: 5 },
        });

      const adapter = new OpenAIAdapter('test-key');
      // @ts-expect-error accessing private for test
      adapter.baseDelayMs = 1;
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Success');
    });
  });

  describe('AnthropicAdapter', () => {
    it('should invoke successfully', async () => {
      nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, {
          content: [{ type: 'text', text: 'Hello from Claude' }],
          usage: { total_tokens: 15 },
        });

      const adapter = new AnthropicAdapter('test-key');
      const result = await adapter.invoke(task);
      expect(result.output).toBe('Hello from Claude');
    });
  });

  describe('GoogleADKAdapter', () => {
    it('should invoke successfully', async () => {
      const endpoint = 'http://localhost:8080';
      process.env.GOOGLE_ADK_ENDPOINT = `${endpoint}/adk`;

      nock(endpoint)
        .post('/adk')
        .reply(200, { output: 'ADK result', tokensUsed: 20 });

      const adapter = new GoogleADKAdapter();
      const result = await adapter.invoke(task);
      expect(result.output).toBe('ADK result');
    });
  });

  describe('BaseAdapter Rate Limiting', () => {
    it('should throw RateLimitError when tokens are exhausted', async () => {
      const adapter = new OpenAIAdapter('test-key');
      // @ts-expect-error accessing private for test
      adapter.tokens = 0;
      // @ts-expect-error accessing private for test
      adapter.maxRetries = 1;

      await expect(adapter.invoke(task)).rejects.toThrow(RateLimitError);
    });
  });
});
