import { jest } from '@jest/globals';
import fetch from 'node-fetch';

import { buildNvidiaPayload, isNvidiaIntegrateEnabled, routeLLM } from '../../ai/providerRouter';

jest.mock('node-fetch', () => jest.fn());

const mockedFetch = fetch as jest.MockedFunction<typeof fetch>;

const buildResponse = (body: any, ok = true) =>
  ({
    ok,
    json: async () => body,
  }) as any;

describe('providerRouter NVIDIA integration', () => {
  const envSnapshot = { ...process.env };

  beforeEach(() => {
    mockedFetch.mockReset();
    process.env = { ...envSnapshot };
    delete process.env.GROQ_API_KEY;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    process.env.NVIDIA_API_KEY = 'nvidia-test-key';
    process.env.FEATURE_NVIDIA_INTEGRATE = '1';
    process.env.NVIDIA_INTEGRATE_API_ALLOW = '1';
    process.env.NVIDIA_INTEGRATE_ALLOWED_HOSTS = 'integrate.api.nvidia.com';
    process.env.FEATURE_KIMI_THINKING = '0';
  });

  afterAll(() => {
    process.env = envSnapshot;
  });

  it('adds model and thinking template kwargs when thinking flag is enabled', () => {
    const payload = {
      messages: [{ role: 'user', content: 'hello' }],
      chat_template_kwargs: { existing: true },
    };

    const result = buildNvidiaPayload(payload, true);
    expect(result.model).toBe('moonshotai/kimi-k2.5');
    expect(result.chat_template_kwargs).toEqual({ existing: true, thinking: true });
  });

  it('keeps NVIDIA adapter disabled when outbound policy gates are not satisfied', () => {
    process.env.NVIDIA_INTEGRATE_API_ALLOW = '0';
    expect(isNvidiaIntegrateEnabled()).toBe(false);
  });

  it('calls NVIDIA integrate endpoint and passes through OpenAI-compatible tools', async () => {
    process.env.FEATURE_KIMI_THINKING = '1';

    mockedFetch.mockResolvedValue(
      buildResponse({
        model: 'moonshotai/kimi-k2.5',
        usage: { total_tokens: 42 },
        choices: [
          {
            message: {
              content: 'ok',
            },
          },
        ],
      }),
    );

    const payload = {
      messages: [{ role: 'user', content: 'Call tool' }],
      tools: [
        {
          type: 'function',
          function: { name: 'search', description: 'search docs', parameters: { type: 'object' } },
        },
      ],
    };

    const result = await routeLLM(
      {
        tag: 'reason.long',
        inputTokens: 100,
        latencyBudgetMs: 2_000,
        hardCostUsd: 1,
        softWarnUsd: 0.5,
        allowPaid: true,
      },
      payload,
    );

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('nvidia');
    expect(mockedFetch).toHaveBeenCalledTimes(1);
    const [endpoint, request] = mockedFetch.mock.calls[0] as [string, any];
    expect(endpoint).toBe('https://integrate.api.nvidia.com/v1/chat/completions');
    expect(request.headers.Authorization).toBe('Bearer nvidia-test-key');

    const body = JSON.parse(request.body);
    expect(body.model).toBe('moonshotai/kimi-k2.5');
    expect(body.tools).toEqual(payload.tools);
    expect(body.chat_template_kwargs).toEqual({ thinking: true });
  });

  it('parses tool call responses into normalized toolCalls', async () => {
    mockedFetch.mockResolvedValue(
      buildResponse({
        model: 'moonshotai/kimi-k2.5',
        choices: [
          {
            message: {
              tool_calls: [
                {
                  id: 'call_1',
                  type: 'function',
                  function: { name: 'search', arguments: '{"query":"x"}' },
                },
              ],
            },
          },
        ],
      }),
    );

    const result = await routeLLM(
      {
        tag: 'reason.dense',
        inputTokens: 100,
        latencyBudgetMs: 2_000,
        hardCostUsd: 1,
        softWarnUsd: 0.5,
        allowPaid: true,
      },
      { messages: [{ role: 'user', content: 'tools' }] },
    );

    expect(result.ok).toBe(true);
    expect(result.provider).toBe('nvidia');
    expect(result.toolCalls).toEqual([
      {
        id: 'call_1',
        type: 'function',
        function: { name: 'search', arguments: '{"query":"x"}' },
      },
    ]);
  });
});
