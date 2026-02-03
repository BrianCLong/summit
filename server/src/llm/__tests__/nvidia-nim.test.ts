import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { NvidiaNimProvider } from '../providers/nvidia-nim.js';
import { ChatCompletionRequest } from '../types.js';
import { readFileSync } from 'fs';
import { join } from 'path';

const nimTextFixture = JSON.parse(
  readFileSync(join(process.cwd(), 'server/src/llm/__tests__/fixtures/nim_text.json'), 'utf8')
);

describe('NvidiaNimProvider', () => {
  let provider: NvidiaNimProvider;
  const apiKey = 'nvapi-test-key';

  beforeEach(() => {
    provider = new NvidiaNimProvider({
      apiKey,
      modeDefault: 'instant'
    });
    // @ts-ignore
    global.fetch = jest.fn();
  });

  it('EVD-KIMIK25FREEAPI-PROV-001: successful text completion', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => nimTextFixture
    });

    const request: ChatCompletionRequest & { model: string } = {
      tenantId: 'test-tenant',
      purpose: 'other',
      riskLevel: 'low',
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'moonshotai/kimi-k2.5'
    };

    const result = await provider.chat(request);

    expect(result.content).toBe('Hello! How can I help you today?');
    expect(result.provider).toBe('nvidia-nim');
  });

  it('EVD-KIMIK25FREEAPI-PROV-002: instant mode sets thinking disabled', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => nimTextFixture
    });

    const request: ChatCompletionRequest & { model: string } = {
      tenantId: 'test-tenant',
      purpose: 'other',
      riskLevel: 'low',
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'moonshotai/kimi-k2.5',
      mode: 'instant'
    };

    await provider.chat(request);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body as string);
    expect(body.extra_body.thinking.type).toBe('disabled');
  });
});
