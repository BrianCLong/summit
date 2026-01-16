import { postJson } from './base.js';
import type { NormalizedRequest, NormalizedResponse, ProviderAdapter } from '../types.js';

const defaultModel = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-20241022';
const defaultEndpoint = process.env.ANTHROPIC_BASE_URL ?? 'https://api.anthropic.com';

type AnthropicContent = {
  type?: string;
  text?: string;
  name?: string;
  input?: Record<string, unknown> | string;
};

const extractContent = (content: AnthropicContent[]): {
  text?: string;
  toolCalls?: Array<{ name: string; arguments: Record<string, unknown> | string }>;
} => {
  let text = '';
  const toolCalls: Array<{ name: string; arguments: Record<string, unknown> | string }> = [];

  for (const item of content) {
    if (item.type === 'text') {
      text += item.text ?? '';
    }
    if (item.type === 'tool_use') {
      toolCalls.push({
        name: item.name ?? 'unknown',
        arguments: item.input ?? {},
      });
    }
  }

  return {
    text: text.trim(),
    toolCalls: toolCalls.length ? toolCalls : undefined,
  };
};

export const createAnthropicAdapter = (apiKey?: string): ProviderAdapter => {
  return {
    id: 'anthropic',
    supports: {
      toolCalls: true,
    },
    run: async (request: NormalizedRequest): Promise<NormalizedResponse> => {
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is required');
      }

      const body: Record<string, unknown> = {
        model: defaultModel,
        max_tokens: request.maxTokens ?? 64,
        temperature: request.temperature ?? 0,
        system: request.system ?? undefined,
        messages: [{ role: 'user', content: request.prompt }],
        stream: request.stream ?? false,
      };

      if (request.tools?.length) {
        body.tools = request.tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          input_schema: tool.inputSchema,
        }));
      }

      const response = await postJson({
        url: `${defaultEndpoint}/v1/messages`,
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
        request,
      });

      if (request.stream) {
        return response;
      }

      const raw = response.raw as Record<string, unknown>;
      const content = Array.isArray(raw.content) ? (raw.content as AnthropicContent[]) : [];
      const extracted = extractContent(content);

      return {
        ...response,
        text: extracted.text,
        toolCalls: extracted.toolCalls,
      };
    },
  };
};
