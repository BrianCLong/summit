import { OpenAI } from 'openai';
import logger from '../utils/logger.js';
import { applicationErrors } from '../monitoring/metrics.js';

export interface LLMConfig {
  defaultProvider: 'openai' | 'anthropic' | 'google' | 'ollama';
  defaultModel: string;
  maxRetries: number;
  timeout: number;
  temperature: number;
  apiKey?: string;
}

export interface LLMMetrics {
  totalRequests: number;
  totalTokens: number;
  errorCount: number;
  averageLatency: number;
}

export interface CompletionOptions {
  provider?: 'openai' | 'anthropic' | 'google' | 'ollama';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'json' | 'text';
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMService {
  private config: LLMConfig;
  private metrics: LLMMetrics;
  private openai: OpenAI;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = {
      defaultProvider: (process.env.LLM_PROVIDER as 'openai' | 'anthropic' | 'google' | 'ollama') || 'openai',
      defaultModel: process.env.LLM_MODEL || 'gpt-4-turbo-preview',
      maxRetries: parseInt(process.env.LLM_MAX_RETRIES || '3'),
      timeout: parseInt(process.env.LLM_TIMEOUT || '60000'),
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      apiKey: process.env.OPENAI_API_KEY,
      ...config,
    };

    this.metrics = {
      totalRequests: 0,
      totalTokens: 0,
      errorCount: 0,
      averageLatency: 0,
    };

    this.openai = new OpenAI({
      apiKey: this.config.apiKey,
    });
  }

  /**
   * Execute a completion request
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    const startTime = Date.now();
    const provider = options.provider || this.config.defaultProvider;
    const model = options.model || this.config.defaultModel;

    try {
      let response: { text: string; usage?: any; provider: string };

      switch (provider) {
        case 'openai':
          response = await this.callOpenAI(prompt, options);
          break;
        case 'anthropic':
          response = await this.callAnthropic(prompt, options);
          break;
        case 'google':
          response = await this.callGoogle(prompt, options);
          break;
        case 'ollama':
          response = await this.callOllama(prompt, options);
          break;
        default:
          throw new Error(`Unsupported LLM provider: ${provider}`);
      }

      this.updateMetrics(Date.now() - startTime, response.usage);

      return response.text;
    } catch (error: any) {
      this.metrics.errorCount++;
      logger.error('LLM request failed', {
        provider,
        model,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Chat completion (multi-turn)
   */
  async chat(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    const startTime = Date.now();
    const provider = options.provider || this.config.defaultProvider;
    const model = options.model || this.config.defaultModel;

    try {
      // Currently defaulting to OpenAI for chat as well, can be expanded
      if (provider !== 'openai') {
        throw new Error(`Provider ${provider} not fully implemented for chat`);
      }

      const response = await this.openai.chat.completions.create({
        messages: messages,
        model: model,
        temperature: options.temperature || this.config.temperature,
        max_tokens: options.maxTokens,
      });

      const text = response.choices[0].message.content || '';

      this.updateMetrics(Date.now() - startTime, response.usage);

      return text;

    } catch (error: any) {
      this.metrics.errorCount++;
      logger.error('LLM chat request failed', {
        provider,
        model,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * OpenAI implementation
   */
  private async callOpenAI(prompt: string, options: CompletionOptions) {
    const body: any = {
      model: options.model || this.config.defaultModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: options.temperature || this.config.temperature,
      max_tokens: options.maxTokens,
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    const response = await this.openai.chat.completions.create(body);

    return {
      text: response.choices[0].message.content || '',
      usage: response.usage,
      provider: 'openai',
    };
  }

  /**
   * Anthropic implementation (placeholder)
   */
  private async callAnthropic(prompt: string, options: CompletionOptions): Promise<any> {
    throw new Error('Anthropic provider not implemented');
  }

  /**
   * Google implementation (placeholder)
   */
  private async callGoogle(prompt: string, options: CompletionOptions): Promise<any> {
    throw new Error('Google provider not implemented');
  }

  /**
   * Ollama implementation (placeholder)
   */
  private async callOllama(prompt: string, options: CompletionOptions): Promise<any> {
    throw new Error('Ollama provider not implemented');
  }

  private updateMetrics(latency: number, usage: any) {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += usage?.total_tokens || 0;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) +
        latency) /
      this.metrics.totalRequests;
  }
}

export default LLMService;
