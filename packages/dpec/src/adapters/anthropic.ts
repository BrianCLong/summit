import { DeterministicPromptExecutionCache } from '../cache.js';
import { canonicalDigest, sha256, stableStringify } from '../hash.js';
import type { AdapterResolution, CacheKeyComponents } from '../types.js';

export interface AnthropicMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: unknown;
}

export interface AnthropicToolDefinition {
  name: string;
  description?: string;
  input_schema?: Record<string, unknown>;
}

export interface AnthropicMessagesRequest {
  model: string;
  messages: AnthropicMessage[];
  system?: string;
  tools?: AnthropicToolDefinition[];
  max_tokens: number;
  temperature?: number;
  top_k?: number;
  top_p?: number;
  stop_sequences?: string[];
  tokenizer?: string;
}

export interface AnthropicMessageResponse {
  id: string;
  model: string;
  content: unknown;
  usage?: Record<string, unknown>;
}

export interface AnthropicClient {
  messages: {
    create(request: AnthropicMessagesRequest): Promise<AnthropicMessageResponse>;
  };
}

export interface AnthropicAdapterOptions {
  client: AnthropicClient;
  cache: DeterministicPromptExecutionCache;
  deriveKey?: (request: AnthropicMessagesRequest) => CacheKeyComponents;
}

function defaultKey(request: AnthropicMessagesRequest): CacheKeyComponents {
  const tokenizerSource = request.tokenizer ?? request.model;
  const params = buildParams(request);
  return {
    modelHash: sha256(request.model),
    tokenizerHash: sha256(tokenizerSource),
    params,
    toolsGraphHash: sha256(stableStringify(request.tools ?? [])),
    promptHash: sha256(
      stableStringify({
        system: request.system ?? null,
        messages: request.messages
      })
    )
  };
}

function buildParams(request: AnthropicMessagesRequest): Record<string, unknown> {
  const params: Record<string, unknown> = {
    max_tokens: request.max_tokens
  };
  const candidate: Array<[keyof AnthropicMessagesRequest, string]> = [
    ['temperature', 'temperature'],
    ['top_k', 'top_k'],
    ['top_p', 'top_p'],
    ['stop_sequences', 'stop_sequences']
  ];
  for (const [key, alias] of candidate) {
    const value = request[key];
    if (value !== undefined) {
      params[alias] = value;
    }
  }
  return params;
}

export function createAnthropicMessagesAdapter(
  options: AnthropicAdapterOptions
): (request: AnthropicMessagesRequest) => Promise<AdapterResolution<AnthropicMessageResponse>> {
  const derive = options.deriveKey ?? defaultKey;
  return async (request: AnthropicMessagesRequest) => {
    const key = derive(request);
    const result = await options.cache.resolve(key, async () => {
      const response = await options.client.messages.create(request);
      return {
        artifact: JSON.stringify(response),
        metadata: {
          adapter: 'anthropic.messages.create',
          requestDigest: canonicalDigest(request)
        }
      };
    });
    const response = JSON.parse(result.artifact.toString('utf8')) as AnthropicMessageResponse;
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
