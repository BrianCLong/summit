import { postJson } from './base.js';
import type { NormalizedRequest, NormalizedResponse, ProviderAdapter } from '../types.js';

type OpenAIToolCall = {
  function?: {
    name?: string;
    arguments?: string;
  };
};

type OpenAIMessage = {
  content?: string;
  tool_calls?: OpenAIToolCall[];
};

type OpenAIChoice = {
  message?: OpenAIMessage;
};

const defaultModel = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const defaultEndpoint = process.env.OPENAI_BASE_URL ?? 'https://api.openai.com';

const mapToolCalls = (response: Record<string, unknown>): NormalizedResponse => {
  const choices = Array.isArray(response.choices) ? (response.choices as OpenAIChoice[]) : [];
  const choice = choices[0]?.message;
  const toolCalls = choice?.tool_calls?.map((toolCall) => ({
    name: toolCall.function?.name ?? 'unknown',
    arguments: toolCall.function?.arguments ?? {},
  }));

  return {
    status: response.status ?? 200,
    headers: response.headers ?? {},
    durationMs: response.durationMs ?? 0,
    text: choice?.content ?? '',
    toolCalls,
    raw: response.raw ?? response,
  };
};

export const createOpenAIAdapter = (apiKey?: string): ProviderAdapter => {
  return {
    id: 'openai',
    supports: {
      toolCalls: true,
      jsonMode: true,
    },
    run: async (request: NormalizedRequest): Promise<NormalizedResponse> => {
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY is required');
      }

      const body: Record<string, unknown> = {
        model: process.env.OPENAI_MODEL ?? defaultModel,
        messages: [
          request.system ? { role: 'system', content: request.system } : null,
          { role: 'user', content: request.prompt },
        ].filter(Boolean),
        max_tokens: request.maxTokens,
        temperature: request.temperature ?? 0,
        stream: request.stream ?? false,
      };

      if (request.tools?.length) {
        body.tools = request.tools.map((tool) => ({
          type: 'function',
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.inputSchema,
          },
        }));
      }

      if (request.jsonSchema) {
        body.response_format = {
          type: 'json_schema',
          json_schema: {
            name: 'conformance_schema',
            schema: request.jsonSchema,
          },
        };
      }

      const response = await postJson({
        url: `${defaultEndpoint}/v1/chat/completions`,
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        body,
        request,
      });

      if (request.stream) {
        return response;
      }

      const raw = response.raw as Record<string, unknown>;
      return mapToolCalls({
        ...response,
        raw,
      });
    },
  };
};
