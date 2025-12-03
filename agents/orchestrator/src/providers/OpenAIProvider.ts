/**
 * OpenAI LLM Provider
 *
 * Provider implementation for OpenAI models including GPT-4, GPT-4o,
 * o1-preview, and o1-mini with full tool calling support.
 */

import { BaseLLMProvider } from './BaseLLMProvider.js';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  LLMProviderConfig,
  TokenUsage,
  LLMMessage,
} from '../types/index.js';

// Pricing per 1K tokens (as of 2024)
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4-turbo': { input: 0.01, output: 0.03 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
  'o1-preview': { input: 0.015, output: 0.06 },
  'o1-mini': { input: 0.003, output: 0.012 },
};

export interface OpenAIProviderConfig extends LLMProviderConfig {
  provider: 'gpt' | 'o1';
  model: 'gpt-4-turbo' | 'gpt-4o' | 'gpt-4o-mini' | 'o1-preview' | 'o1-mini';
  organization?: string;
}

export class OpenAIProvider extends BaseLLMProvider {
  private organization?: string;

  constructor(config: OpenAIProviderConfig) {
    super(config);
    this.organization = config.organization;
  }

  get provider(): LLMProvider {
    return this.config.model.startsWith('o1') ? 'o1' : 'gpt';
  }

  get supportedModels(): LLMModel[] {
    return ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'];
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.model;
    const isO1Model = model.startsWith('o1');

    try {
      // Transform messages for OpenAI format
      const messages = this.transformMessages(request.messages, isO1Model);

      // Build request body
      const requestBody: any = {
        model,
        messages,
        max_completion_tokens: request.maxTokens || this.config.maxTokens,
      };

      // o1 models don't support temperature or tools
      if (!isO1Model) {
        requestBody.temperature = request.temperature ?? this.config.temperature;

        // Add tools if provided
        if (request.tools && request.tools.length > 0) {
          requestBody.tools = request.tools;
          requestBody.tool_choice = 'auto';
        }
      }

      // Execute with retry
      const response = await this.executeWithRetry(async () => {
        return this.callOpenAIAPI(requestBody);
      });

      const latencyMs = Date.now() - startTime;
      const usage = this.calculateUsage(response, model as LLMModel);

      this.updateMetrics(true, latencyMs, usage);

      const choice = response.choices[0];

      return {
        id: response.id || this.generateResponseId(),
        model: model as LLMModel,
        provider: this.provider,
        content: choice.message?.content || '',
        toolCalls: choice.message?.tool_calls,
        usage,
        latencyMs,
        cached: false,
        metadata: request.metadata,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      this.updateMetrics(false, latencyMs, { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0 });
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.complete({
        messages: [{ role: 'user', content: 'Hello' }],
        maxTokens: 5,
      });
      return true;
    } catch {
      return false;
    }
  }

  estimateCost(promptTokens: number, completionTokens: number): number {
    const pricing = OPENAI_PRICING[this.config.model] || OPENAI_PRICING['gpt-4o'];
    return (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
  }

  private transformMessages(messages: LLMMessage[], isO1Model: boolean): any[] {
    const transformed: any[] = [];

    for (const msg of messages) {
      // o1 models don't support system messages - convert to user message
      if (msg.role === 'system' && isO1Model) {
        transformed.push({
          role: 'user',
          content: `[System Instructions]\n${msg.content}`,
        });
        continue;
      }

      const transformedMsg: any = {
        role: msg.role,
        content: msg.content,
      };

      if (msg.name) {
        transformedMsg.name = msg.name;
      }

      if (msg.toolCalls) {
        transformedMsg.tool_calls = msg.toolCalls;
      }

      if (msg.toolCallId) {
        transformedMsg.tool_call_id = msg.toolCallId;
      }

      transformed.push(transformedMsg);
    }

    return transformed;
  }

  private async callOpenAIAPI(requestBody: any): Promise<any> {
    const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
    const baseUrl = this.config.baseUrl || 'https://api.openai.com';

    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private calculateUsage(response: any, model: LLMModel): TokenUsage {
    const promptTokens = response.usage?.prompt_tokens || 0;
    const completionTokens = response.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD: this.estimateCost(promptTokens, completionTokens),
    };
  }
}
