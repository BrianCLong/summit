/**
 * LLM Provider for Agent Reasoning
 * Unified interface for Claude, GPT-4, and other LLM providers
 */

import { Logger } from 'pino';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export interface LLMOptions {
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stopSequences?: string[];
  tools?: LLMTool[];
}

export interface LLMResponse {
  content: string;
  toolCalls?: Array<{
    name: string;
    arguments: Record<string, any>;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
}

export interface LLMProviderConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey?: string;
  baseURL?: string;
  model: string;
  defaultOptions?: LLMOptions;
}

export abstract class LLMProvider {
  protected config: LLMProviderConfig;
  protected logger: Logger;

  constructor(config: LLMProviderConfig, logger: Logger) {
    this.config = config;
    this.logger = logger.child({ component: 'LLMProvider', provider: config.provider });
  }

  abstract chat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): Promise<LLMResponse>;

  abstract streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown>;

  protected mergeOptions(options?: LLMOptions): LLMOptions {
    return {
      ...this.config.defaultOptions,
      ...options,
    };
  }

  /**
   * Calculate estimated cost for a request
   */
  abstract estimateCost(usage: {
    promptTokens: number;
    completionTokens: number;
  }): number;
}

/**
 * Anthropic Claude Provider
 */
export class AnthropicProvider extends LLMProvider {
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const opts = this.mergeOptions(options);

    // In production, this would call the actual Anthropic API
    // For now, we'll simulate the response
    this.logger.debug({ messages, options: opts }, 'Anthropic API call');

    // Simulate API call
    const response = await this.simulateAPICall(messages, opts);

    return response;
  }

  async *streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown> {
    const opts = this.mergeOptions(options);
    this.logger.debug({ messages, options: opts }, 'Anthropic streaming API call');

    // Simulate streaming response
    const content = 'This is a simulated streaming response from Claude.';
    const words = content.split(' ');

    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async simulateAPICall(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Calculate simulated token usage
    const promptTokens = messages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0,
    );
    const completionTokens = Math.ceil(Math.random() * 500 + 100);

    return {
      content: this.generateMockResponse(messages),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: this.config.model,
      finishReason: 'end_turn',
    };
  }

  private generateMockResponse(messages: LLMMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    return `Analyzed: ${lastMessage.content.substring(0, 50)}... Based on the intelligence data, I've identified several key patterns and potential connections that warrant further investigation.`;
  }

  estimateCost(usage: {
    promptTokens: number;
    completionTokens: number;
  }): number {
    // Claude 3.5 Sonnet pricing (as of 2024)
    const promptCostPer1M = 3.0; // $3 per 1M tokens
    const completionCostPer1M = 15.0; // $15 per 1M tokens

    const promptCost = (usage.promptTokens / 1_000_000) * promptCostPer1M;
    const completionCost = (usage.completionTokens / 1_000_000) * completionCostPer1M;

    return promptCost + completionCost;
  }
}

/**
 * OpenAI GPT Provider
 */
export class OpenAIProvider extends LLMProvider {
  async chat(messages: LLMMessage[], options?: LLMOptions): Promise<LLMResponse> {
    const opts = this.mergeOptions(options);
    this.logger.debug({ messages, options: opts }, 'OpenAI API call');

    // Simulate API call
    const response = await this.simulateAPICall(messages, opts);

    return response;
  }

  async *streamChat(
    messages: LLMMessage[],
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown> {
    const opts = this.mergeOptions(options);
    this.logger.debug({ messages, options: opts }, 'OpenAI streaming API call');

    const content = 'This is a simulated streaming response from GPT-4.';
    const words = content.split(' ');

    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  }

  private async simulateAPICall(
    messages: LLMMessage[],
    options: LLMOptions,
  ): Promise<LLMResponse> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const promptTokens = messages.reduce(
      (sum, msg) => sum + Math.ceil(msg.content.length / 4),
      0,
    );
    const completionTokens = Math.ceil(Math.random() * 500 + 100);

    return {
      content: this.generateMockResponse(messages),
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      model: this.config.model,
      finishReason: 'stop',
    };
  }

  private generateMockResponse(messages: LLMMessage[]): string {
    const lastMessage = messages[messages.length - 1];
    return `Analysis of: ${lastMessage.content.substring(0, 50)}... The data suggests correlations that could indicate coordinated activity worth investigating further.`;
  }

  estimateCost(usage: {
    promptTokens: number;
    completionTokens: number;
  }): number {
    // GPT-4 pricing
    const promptCostPer1M = 5.0;
    const completionCostPer1M = 15.0;

    const promptCost = (usage.promptTokens / 1_000_000) * promptCostPer1M;
    const completionCost = (usage.completionTokens / 1_000_000) * completionCostPer1M;

    return promptCost + completionCost;
  }
}

/**
 * Factory for creating LLM providers
 */
export class LLMProviderFactory {
  static create(config: LLMProviderConfig, logger: Logger): LLMProvider {
    switch (config.provider) {
      case 'anthropic':
        return new AnthropicProvider(config, logger);
      case 'openai':
        return new OpenAIProvider(config, logger);
      case 'local':
        throw new Error('Local LLM provider not yet implemented');
      default:
        throw new Error(`Unknown LLM provider: ${config.provider}`);
    }
  }
}

/**
 * LLM-enabled Agent Mixin
 * Provides LLM capabilities to agents
 */
export class LLMAgentCapability {
  private provider: LLMProvider;
  private conversationHistory: LLMMessage[] = [];
  private systemPrompt?: string;

  constructor(provider: LLMProvider, systemPrompt?: string) {
    this.provider = provider;
    this.systemPrompt = systemPrompt;

    if (systemPrompt) {
      this.conversationHistory.push({
        role: 'system',
        content: systemPrompt,
      });
    }
  }

  /**
   * Send a message and get a response
   */
  async ask(prompt: string, options?: LLMOptions): Promise<LLMResponse> {
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    });

    const response = await this.provider.chat(this.conversationHistory, options);

    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });

    return response;
  }

  /**
   * Stream a response
   */
  async *askStream(
    prompt: string,
    options?: LLMOptions,
  ): AsyncGenerator<string, void, unknown> {
    this.conversationHistory.push({
      role: 'user',
      content: prompt,
    });

    let fullResponse = '';
    for await (const chunk of this.provider.streamChat(
      this.conversationHistory,
      options,
    )) {
      fullResponse += chunk;
      yield chunk;
    }

    this.conversationHistory.push({
      role: 'assistant',
      content: fullResponse,
    });
  }

  /**
   * Clear conversation history (keeping system prompt)
   */
  clearHistory(): void {
    this.conversationHistory = this.systemPrompt
      ? [{ role: 'system', content: this.systemPrompt }]
      : [];
  }

  /**
   * Get conversation history
   */
  getHistory(): LLMMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Set system prompt
   */
  setSystemPrompt(prompt: string): void {
    this.systemPrompt = prompt;
    // Replace or add system message at the beginning
    if (
      this.conversationHistory.length > 0 &&
      this.conversationHistory[0].role === 'system'
    ) {
      this.conversationHistory[0].content = prompt;
    } else {
      this.conversationHistory.unshift({ role: 'system', content: prompt });
    }
  }
}
