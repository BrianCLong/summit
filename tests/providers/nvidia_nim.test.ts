import { jest, test, expect, describe, beforeEach, afterEach } from '@jest/globals';
import { NvidiaNimProvider } from '../../server/src/llm/providers/nvidia_nim';
import { LLMRequest } from '../../server/src/llm/types';

describe('NvidiaNimProvider', () => {
  let provider: NvidiaNimProvider;
  const mockFetch = jest.fn() as any;
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    provider = new NvidiaNimProvider({ apiKey: 'test-key' });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    mockFetch.mockReset();
  });

  test('EVD-KIMIK25FREEAPI-PROV-001: happy path text completion', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: 'test-id',
        model: 'moonshotai/kimi-k2.5',
        choices: [{ message: { content: 'Hello' } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 }
      })
    });

    const req: LLMRequest = {
      id: 'req-1',
      requestId: 'req-1',
      messages: [{ role: 'user', content: 'Hi' }],
    };

    const res = await provider.generate(req);
    expect(res.text).toBe('Hello');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('https://integrate.api.nvidia.com/v1/chat/completions'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'authorization': 'Bearer test-key'
        })
      })
    );
  });

  test('EVD-KIMIK25FREEAPI-MMOD-001: deny multimodal by default', async () => {
    const req: LLMRequest = {
      id: 'req-2',
      requestId: 'req-2',
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] as any }],
    };

    await expect(provider.generate(req)).rejects.toThrow('Multimodal content not enabled');
  });

  test('EVD-KIMIK25FREEAPI-MMOD-001: allow multimodal when enabled', async () => {
    provider = new NvidiaNimProvider({ apiKey: 'test-key', enableMultimodal: true });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'Image analyzed' } }]
      })
    });

    const req: LLMRequest = {
      id: 'req-3',
      requestId: 'req-3',
      messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: '...' } }] }],
    };

    const res = await provider.generate(req);
    expect(res.text).toBe('Image analyzed');
  });

  test('EVD-KIMIK25FREEAPI-GOV-001: redact secrets in error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => 'Invalid Bearer sk-12345'
    });

    const req: LLMRequest = {
      id: 'req-4',
      requestId: 'req-4',
      messages: [{ role: 'user', content: 'hi' }]
    };

    await expect(provider.generate(req)).rejects.toThrow('[REDACTED]');
    await expect(provider.generate(req)).rejects.not.toThrow('sk-12345');
  });

  test('EVD-KIMIK25FREEAPI-PROV-002: instant mode sets thinking disabled', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Instant' } }] })
    });

    const req: LLMRequest = { id: 'req-5', requestId: 'req-5', messages: [{ role: 'user', content: 'hi' }] };

    // Default mode is instant
    await provider.generate(req);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        body: expect.stringContaining('"thinking":{"type":"disabled"}')
      })
    );

    // Thinking mode
    const thinkingProvider = new NvidiaNimProvider({ apiKey: 'key', modeDefault: 'thinking' });
    await thinkingProvider.generate(req);
    expect(mockFetch).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.not.objectContaining({
         body: expect.stringContaining('"thinking":{"type":"disabled"}')
      })
    );
  });
});
