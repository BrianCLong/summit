import { DeterministicPromptExecutionCache } from '../cache.js';
import { canonicalDigest, sha256, stableStringify } from '../hash.js';
import type { AdapterResolution, CacheKeyComponents } from '../types.js';

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
  name?: string;
}

export interface OpenAIChatToolDefinition {
  type: string;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAIChatCompletionRequest {
  model: string;
  messages: OpenAIChatMessage[];
  tools?: OpenAIChatToolDefinition[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  seed?: number;
  tokenizer?: string;
  response_format?: Record<string, unknown>;
}

export interface OpenAIChatChoice {
  index: number;
  message: {
    role: 'assistant' | 'tool';
    content: unknown;
    refusal?: unknown;
  };
  finish_reason: string | null;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  created: number;
  model: string;
  choices: OpenAIChatChoice[];
  usage?: Record<string, unknown>;
}

export interface OpenAIChatClient {
  chat: {
    completions: {
      create(request: OpenAIChatCompletionRequest): Promise<OpenAIChatCompletionResponse>;
    };
  };
}

export interface OpenAIAdapterOptions {
  client: OpenAIChatClient;
  cache: DeterministicPromptExecutionCache;
  deriveKey?: (request: OpenAIChatCompletionRequest) => CacheKeyComponents;
}

function defaultKey(request: OpenAIChatCompletionRequest): CacheKeyComponents {
  const tokenizerSource = request.tokenizer ?? request.model;
  const params = buildParams(request);
  return {
    modelHash: sha256(request.model),
    tokenizerHash: sha256(tokenizerSource),
    params,
    toolsGraphHash: sha256(stableStringify(request.tools ?? [])),
    promptHash: sha256(stableStringify(request.messages))
  };
}

function buildParams(request: OpenAIChatCompletionRequest): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const candidate: Array<[keyof OpenAIChatCompletionRequest, string]> = [
    ['temperature', 'temperature'],
    ['top_p', 'top_p'],
    ['max_tokens', 'max_tokens'],
    ['frequency_penalty', 'frequency_penalty'],
    ['presence_penalty', 'presence_penalty'],
    ['stop', 'stop'],
    ['seed', 'seed'],
    ['response_format', 'response_format']
  ];
  for (const [key, alias] of candidate) {
    const value = request[key];
    if (value !== undefined) {
      params[alias] = value;
    }
  }
  return params;
}

export function createOpenAIChatAdapter(
  options: OpenAIAdapterOptions
): (request: OpenAIChatCompletionRequest) => Promise<AdapterResolution<OpenAIChatCompletionResponse>> {
  const derive = options.deriveKey ?? defaultKey;
  return async (request: OpenAIChatCompletionRequest) => {
    const key = derive(request);
    const result = await options.cache.resolve(key, async () => {
      const response = await options.client.chat.completions.create(request);
      return {
        artifact: JSON.stringify(response),
        metadata: {
          adapter: 'openai.chat.completions',
          requestDigest: canonicalDigest(request)
        }
      };
    });
    const response = JSON.parse(result.artifact.toString('utf8')) as OpenAIChatCompletionResponse;
    if (result.type === 'hit') {
      return {
        response,
        hit: true,
        proof: result.proof,
        entry: result.entry
      };
    }
    return {
      response,
      hit: false,
      trace: result.trace,
      evictionProofs: result.evictionProofs,
      entry: result.entry
    };
  };
}
