/**
 * Claude LLM Provider
 *
 * Provider implementation for Anthropic's Claude models
 * with support for Claude 3.5 Sonnet, Claude 3 Opus, and Claude 3 Haiku.
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
const CLAUDE_PRICING: Record<string, { input: number; output: number }> = {
  'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
  'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
  'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
};

export interface ClaudeProviderConfig extends LLMProviderConfig {
  provider: 'claude';
  model: 'claude-3-5-sonnet-20241022' | 'claude-3-opus-20240229' | 'claude-3-haiku-20240307';
}

export class ClaudeProvider extends BaseLLMProvider {
  private client: any; // Anthropic SDK client

  constructor(config: ClaudeProviderConfig) {
    super(config);
  }

  get provider(): LLMProvider {
    return 'claude';
  }

  get supportedModels(): LLMModel[] {
    return ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'];
  }

  async complete(request: LLMRequest): Promise<LLMResponse> {
    const startTime = Date.now();
    const model = request.model || this.config.model;

    try {
      // Transform messages for Anthropic format
      const { systemPrompt, messages } = this.transformMessages(request.messages);

      // Build request body
      const requestBody = {
        model,
        max_tokens: request.maxTokens || this.config.maxTokens,
        temperature: request.temperature ?? this.config.temperature,
        system: systemPrompt,
        messages,
      };

      // Add tools if provided
      if (request.tools && request.tools.length > 0) {
        (requestBody as any).tools = request.tools.map((tool) => ({
          name: tool.function.name,
          description: tool.function.description,
          input_schema: tool.function.parameters,
        }));
      }

      // Execute with retry
      const response = await this.executeWithRetry(async () => {
        return this.callClaudeAPI(requestBody);
      });

      const latencyMs = Date.now() - startTime;
      const usage = this.calculateUsage(response, model as LLMModel);

      this.updateMetrics(true, latencyMs, usage);

      return {
        id: this.generateResponseId(),
        model: model as LLMModel,
        provider: 'claude',
        content: this.extractContent(response),
        toolCalls: this.extractToolCalls(response),
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
    const pricing = CLAUDE_PRICING[this.config.model] || CLAUDE_PRICING['claude-3-5-sonnet-20241022'];
    return (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
  }

  private transformMessages(messages: LLMMessage[]): { systemPrompt: string; messages: any[] } {
    let systemPrompt = '';
    const transformedMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n\n' : '') + msg.content;
      } else if (msg.role === 'tool') {
        transformedMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.toolCallId,
              content: msg.content,
            },
          ],
        });
      } else {
        transformedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content,
        });
      }
    }

    return { systemPrompt, messages: transformedMessages };
  }

  private async callClaudeAPI(requestBody: any): Promise<any> {
    const apiKey = this.config.apiKey || process.env.ANTHROPIC_API_KEY;
    const baseUrl = this.config.baseUrl || 'https://api.anthropic.com';

    if (!apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  private extractContent(response: any): string {
    if (!response.content || response.content.length === 0) {
      return '';
    }

    return response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');
  }

  private extractToolCalls(response: any): any[] | undefined {
    if (!response.content) return undefined;

    const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');

    if (toolUseBlocks.length === 0) return undefined;

    return toolUseBlocks.map((block: any) => ({
      id: block.id,
      type: 'function' as const,
      function: {
        name: block.name,
        arguments: JSON.stringify(block.input),
      },
    }));
  }

  private calculateUsage(response: any, model: LLMModel): TokenUsage {
    const promptTokens = response.usage?.input_tokens || 0;
    const completionTokens = response.usage?.output_tokens || 0;
    const totalTokens = promptTokens + completionTokens;

    return {
      promptTokens,
      completionTokens,
      totalTokens,
      estimatedCostUSD: this.estimateCost(promptTokens, completionTokens),
    };
  }
}
