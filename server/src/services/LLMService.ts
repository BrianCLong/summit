// @ts-nocheck
import { OpenAI } from 'openai';
import logger from '../utils/logger.js';
import { getTracer } from '../observability/tracer.js';
import { metrics as prometheusMetrics } from '../observability/metrics.js';

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
  prompt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export class LLMService {
  private config: LLMConfig;
  private metrics: LLMMetrics;
  private _openai?: OpenAI;

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

    // OpenAI client is initialized lazily
  }

  private get openai(): OpenAI {
    if (!this._openai) {
      // Allow this to throw if API key is missing, but only when accessed
      this._openai = new OpenAI({
        apiKey: this.config.apiKey,
      });
    }
    return this._openai;
  }

  /**
   * Execute a completion request
   */
  async complete(prompt: string, options: CompletionOptions = {}): Promise<string> {
    return getTracer().trace('llm.complete', async (span: any) => {
      const startTime = Date.now();
      const provider = options.provider || this.config.defaultProvider;
      const model = options.model || this.config.defaultModel;

      span.setAttributes({
        'llm.provider': provider,
        'llm.model': model,
        'llm.temperature': options.temperature || this.config.temperature,
      });

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

        this.updateMetrics(Date.now() - startTime, response.usage, provider, model);

        if (response.usage) {
          span.setAttributes({
            'llm.usage.prompt_tokens': response.usage.prompt_tokens,
            'llm.usage.completion_tokens': response.usage.completion_tokens,
            'llm.usage.total_tokens': response.usage.total_tokens,
          });
        }

        return response.text;
      } catch (error: any) {
        this.metrics.errorCount++;
        // Record failure latency/count if needed
        if (prometheusMetrics.llmRequestDuration) {
          prometheusMetrics.llmRequestDuration.observe({
            provider,
            model,
            status: 'error'
          }, (Date.now() - startTime) / 1000);
        }
        logger.error('LLM request failed', {
          provider,
          model,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  }

  /**
   * Chat completion (multi-turn)
   */
  async chat(messages: ChatMessage[], options: CompletionOptions = {}): Promise<string> {
    return getTracer().trace('llm.chat', async (span: any) => {
      const startTime = Date.now();
      const provider = options.provider || this.config.defaultProvider;
      const model = options.model || this.config.defaultModel;

      span.setAttributes({
        'llm.provider': provider,
        'llm.model': model,
        'llm.message_count': messages.length,
      });

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

        this.updateMetrics(Date.now() - startTime, response.usage, provider, model);

        if (response.usage) {
          span.setAttributes({
            'llm.usage.prompt_tokens': response.usage.prompt_tokens,
            'llm.usage.completion_tokens': response.usage.completion_tokens,
            'llm.usage.total_tokens': response.usage.total_tokens,
          });
        }

        return text;

      } catch (error: any) {
        this.metrics.errorCount++;
        if (prometheusMetrics.llmRequestDuration) {
          prometheusMetrics.llmRequestDuration.observe({
            provider,
            model,
            status: 'error'
          }, (Date.now() - startTime) / 1000);
        }
        logger.error('LLM chat request failed', {
          provider,
          model,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    });
  }

  /**
   * OpenAI implementation
   */
  private async callOpenAI(prompt: string, options: CompletionOptions): Promise<{ text: string; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number }; provider: string }> {
    const body: {
      model: string;
      messages: { role: string; content: string }[];
      temperature: number;
      max_tokens?: number;
      response_format?: { type: string };
    } = {
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
  private async callAnthropic(_prompt: string, _options: CompletionOptions): Promise<{ text: string; usage?: unknown; provider: string }> {
    throw new Error('Anthropic provider not implemented');
  }

  /**
   * Google implementation (placeholder)
   */
  private async callGoogle(_prompt: string, _options: CompletionOptions): Promise<{ text: string; usage?: unknown; provider: string }> {
    throw new Error('Google provider not implemented');
  }

  /**
   * Ollama implementation (placeholder)
   */
  private async callOllama(_prompt: string, _options: CompletionOptions): Promise<{ text: string; usage?: unknown; provider: string }> {
    throw new Error('Ollama provider not implemented');
  }

  private updateMetrics(latency: number, usage: { total_tokens?: number; prompt_tokens?: number; completion_tokens?: number } | undefined, provider: string = 'openai', model: string = 'unknown'): void {
    this.metrics.totalRequests++;
    this.metrics.totalTokens += usage?.total_tokens || 0;
    this.metrics.averageLatency =
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) +
        latency) /
      this.metrics.totalRequests;

    // Prometheus Metrics
    if (prometheusMetrics.llmTokensTotal) {
      prometheusMetrics.llmTokensTotal.inc({
        provider,
        model,
        type: 'total'
      }, usage?.total_tokens || 0);
    }

    if (prometheusMetrics.llmRequestDuration) {
      prometheusMetrics.llmRequestDuration.observe({
        provider,
        model,
        status: 'success'
      }, latency / 1000); // Convert to seconds
    }
  }
}

export default LLMService;
