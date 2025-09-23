/**
 * Large Language Model Service
 * Supports multiple LLM providers for text generation and completion
 */

import logger from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { applicationErrors } from '../monitoring/metrics.js';
import { otelService } from '../monitoring/opentelemetry.js';
import { routeLLM } from './providerRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_MASTER_PROMPT_PATH = path.resolve(
  __dirname,
  '../prompts/master-orchestration-prompt.txt',
);

class LLMService {
  constructor(config = {}) {
    const provider = config.provider ?? process.env.LLM_PROVIDER ?? 'openai';
    const providerTag = config.providerTag ?? process.env.LLM_PROVIDER_TAG ?? 'reason.dense';
    const maxTokensEnv = process.env.LLM_MAX_TOKENS;
    const timeoutEnv = process.env.LLM_TIMEOUT;
    const maxRetriesEnv = process.env.LLM_MAX_RETRIES;
    const latencyBudgetEnv = process.env.LLM_LATENCY_BUDGET_MS;
    const hardCostEnv = process.env.LLM_HARD_COST_USD;
    const softWarnEnv = process.env.LLM_SOFT_WARN_USD;
    const envUseMasterPrompt = process.env.LLM_USE_MASTER_PROMPT;
    const envRouterFallback = process.env.LLM_ROUTER_FALLBACK;

    const routerFallbackEnabled =
      config.routerFallbackEnabled ?? envRouterFallback !== 'false';

    const useMasterPrompt =
      config.useMasterPrompt ??
      (envUseMasterPrompt !== undefined
        ? envUseMasterPrompt === 'true'
        : provider === 'router');

    this.config = {
      provider,
      providerTag,
      apiKey: config.apiKey ?? process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY,
      model: config.model ?? process.env.LLM_MODEL ?? 'gpt-3.5-turbo',
      maxTokens:
        config.maxTokens ??
        (maxTokensEnv !== undefined ? parseInt(maxTokensEnv, 10) : 2000),
      temperature:
        config.temperature ??
        (process.env.LLM_TEMPERATURE !== undefined
          ? parseFloat(process.env.LLM_TEMPERATURE)
          : 0.3),
      timeout:
        config.timeout ?? (timeoutEnv !== undefined ? parseInt(timeoutEnv, 10) : 60000),
      maxRetries:
        config.maxRetries ??
        (maxRetriesEnv !== undefined ? parseInt(maxRetriesEnv, 10) : 3),
      routerLatencyBudgetMs:
        config.routerLatencyBudgetMs ??
        (latencyBudgetEnv !== undefined ? parseInt(latencyBudgetEnv, 10) : 1500),
      routerHardCostUsd:
        config.routerHardCostUsd ?? (hardCostEnv !== undefined ? parseFloat(hardCostEnv) : 0),
      routerSoftWarnUsd:
        config.routerSoftWarnUsd ??
        (softWarnEnv !== undefined ? parseFloat(softWarnEnv) : 0.5),
      routerAllowPaid:
        config.routerAllowPaid ?? process.env.LLM_ALLOW_PAID === 'true',
      routerFallbackEnabled,
      useMasterPrompt,
      masterPromptPath:
        config.masterPromptPath ??
        process.env.MASTER_ORCHESTRATION_PROMPT_PATH ??
        DEFAULT_MASTER_PROMPT_PATH,
      ...config,
    };

    this.logger = logger;
    this.metrics = {
      totalCompletions: 0,
      averageLatency: 0,
      errorCount: 0,
      totalTokensGenerated: 0,
      averageTokensPerCompletion: 0,
    };

    this.masterPrompt = this.config.useMasterPrompt ? this.loadMasterPrompt() : null;
  }

  loadMasterPrompt() {
    if (!this.config.useMasterPrompt) {
      return null;
    }
    const promptPath = this.config.masterPromptPath || DEFAULT_MASTER_PROMPT_PATH;
    try {
      const content = fs.readFileSync(promptPath, 'utf8');
      if (content && content.trim().length > 0) {
        return content;
      }
    } catch (error) {
      logger.warn('Master orchestration prompt unavailable', {
        path: promptPath,
        error: error.message,
      });
    }
    return null;
  }

  getDefaultSystemMessage() {
    if (!this.config.useMasterPrompt) {
      return null;
    }
    if (!this.masterPrompt) {
      this.masterPrompt = this.loadMasterPrompt();
    }
    return this.masterPrompt;
  }

  estimateTokensFromMessages(messages) {
    const text = messages.map((message) => message?.content || '').join(' ');
    return Math.max(1, Math.ceil(text.length / 4));
  }

  buildRouterOptions(tag, inputTokens) {
    return {
      tag: tag || this.config.providerTag || 'reason.dense',
      inputTokens,
      latencyBudgetMs: this.config.routerLatencyBudgetMs,
      hardCostUsd: this.config.routerHardCostUsd,
      softWarnUsd: this.config.routerSoftWarnUsd,
      allowPaid: this.config.routerAllowPaid,
    };
  }

  async routerCompletion({
    prompt,
    systemMessage,
    maxTokens,
    temperature,
    stream,
    providerTag,
  }) {
    const messages = [];
    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }
    messages.push({ role: 'user', content: prompt });

    const payload = {
      messages,
      temperature,
      stream,
    };
    if (typeof maxTokens === 'number') {
      payload.max_tokens = maxTokens;
    }

    const routerOptions = this.buildRouterOptions(
      providerTag,
      this.estimateTokensFromMessages(messages),
    );
    const result = await routeLLM(routerOptions, payload);

    if (!result.ok || !result.text) {
      throw new Error(result.error || 'No eligible provider within budgets. Add keys or relax caps.');
    }

    return {
      content: result.text,
      usage: result.usage || {},
      provider: result.provider,
      model: result.model,
      usedModelTag: routerOptions.tag,
    };
  }

  async routerChat(messages, options) {
    const payload = {
      messages,
      temperature: options.temperature,
      stream: false,
    };
    if (typeof options.maxTokens === 'number') {
      payload.max_tokens = options.maxTokens;
    }

    const routerOptions = this.buildRouterOptions(
      options.providerTag,
      this.estimateTokensFromMessages(messages),
    );
    const result = await routeLLM(routerOptions, payload);

    if (!result.ok || !result.text) {
      throw new Error(result.error || 'No eligible provider within budgets. Add keys or relax caps.');
    }

    return {
      content: result.text,
      usage: result.usage || {},
      provider: result.provider,
      model: result.model,
      usedModelTag: routerOptions.tag,
    };
  }

  /**
   * Generate text completion
   */
  async complete(params) {
    const {
      prompt,
      model = this.config.model,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature,
      systemMessage: overrideSystemMessage,
      stream = false,
      providerTag,
    } = params;

    const systemMessage = overrideSystemMessage ?? this.getDefaultSystemMessage();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    const startTime = Date.now();
    let attempt = 0;
    let lastError = null;
    const allowRouterFallback =
      this.config.routerFallbackEnabled && this.config.provider !== 'router';
    let fallbackAttempted = false;

    while (attempt < this.config.maxRetries) {
      try {
        let response;

        switch (this.config.provider) {
          case 'router':
            response = await this.routerCompletion({
              prompt,
              systemMessage,
              maxTokens,
              temperature,
              stream,
              providerTag,
            });
            break;
          case 'openai':
            response = await this.openAICompletion({
              prompt,
              model,
              maxTokens,
              temperature,
              systemMessage,
              stream,
            });
            break;
          case 'anthropic':
            response = await this.anthropicCompletion(params);
            break;
          case 'local':
            response = await this.localCompletion(params);
            break;
          default:
            throw new Error(`Unsupported LLM provider: ${this.config.provider}`);
        }

        const latency = Date.now() - startTime;
        this.updateMetrics(latency, response.usage);

        logger.debug('LLM completion successful', {
          provider: response.provider || this.config.provider,
          model,
          promptLength: prompt.length,
          responseLength: response.content.length,
          latency,
          tokensUsed: response.usage,
          fallback: fallbackAttempted,
        });

        return response.content;
      } catch (error) {
        lastError = error;
        attempt++;

        if (allowRouterFallback && !fallbackAttempted) {
          fallbackAttempted = true;

          try {
            const fallbackStart = Date.now();
            const fallbackResponse = await this.routerCompletion({
              prompt,
              systemMessage,
              maxTokens,
              temperature,
              stream,
              providerTag,
            });
            const fallbackLatency = Date.now() - fallbackStart;
            this.updateMetrics(fallbackLatency, fallbackResponse.usage);

            logger.warn('Primary LLM provider failed, routed via orchestrator', {
              provider: this.config.provider,
              fallbackProvider: fallbackResponse.provider,
              attempt,
              error: error.message,
            });

            logger.debug('LLM completion successful', {
              provider: fallbackResponse.provider || 'router',
              model,
              promptLength: prompt.length,
              responseLength: fallbackResponse.content.length,
              latency: fallbackLatency,
              tokensUsed: fallbackResponse.usage,
              fallback: true,
            });

            return fallbackResponse.content;
          } catch (routerError) {
            lastError = routerError;
          }
        }

        if (attempt >= this.config.maxRetries) {
          this.metrics.errorCount++;
          applicationErrors.labels('llm_service', 'CompletionError', 'error').inc();

          logger.error('LLM completion failed after retries', {
            provider: this.config.provider,
            model,
            attempt,
            error: lastError?.message || String(lastError),
          });

          if (lastError instanceof Error) {
            throw lastError;
          }
          throw new Error(String(lastError));
        }

        logger.warn('LLM completion failed, retrying', {
          provider: this.config.provider,
          attempt,
          error: lastError?.message || String(lastError),
        });

        // Exponential backoff
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }

    if (lastError instanceof Error) {
      throw lastError;
    }
    throw new Error('LLM completion failed');
  }

  /**
   * Generate chat completion (multi-turn conversation)
   */
  async chat(messages, options = {}) {
    const {
      model = this.config.model,
      maxTokens = this.config.maxTokens,
      temperature = this.config.temperature,
      providerTag,
    } = options;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('Messages array is required');
    }

    let chatMessages = [...messages];
    const hasSystem = chatMessages[0]?.role === 'system';
    const defaultSystem = this.getDefaultSystemMessage();
    if (!hasSystem && defaultSystem) {
      chatMessages = [{ role: 'system', content: defaultSystem }, ...chatMessages];
    }

    const startTime = Date.now();
    const allowRouterFallback =
      this.config.routerFallbackEnabled && this.config.provider !== 'router';
    let fallbackAttempted = false;

    try {
      let response;

      switch (this.config.provider) {
        case 'router':
          response = await this.routerChat(chatMessages, {
            maxTokens,
            temperature,
            providerTag,
          });
          break;
        case 'openai':
          response = await this.openAIChat(chatMessages, {
            model,
            maxTokens,
            temperature,
          });
          break;
        default:
          throw new Error(`Chat not supported for provider: ${this.config.provider}`);
      }

      const latency = Date.now() - startTime;
      this.updateMetrics(latency, response.usage);

      return response.content;
    } catch (error) {
      let finalError = error instanceof Error ? error : new Error(String(error));

      if (allowRouterFallback && !fallbackAttempted) {
        fallbackAttempted = true;

        try {
          const fallbackStart = Date.now();
          const fallbackResponse = await this.routerChat(chatMessages, {
            maxTokens,
            temperature,
            providerTag,
          });
          const fallbackLatency = Date.now() - fallbackStart;
          this.updateMetrics(fallbackLatency, fallbackResponse.usage);

          logger.warn('Primary LLM chat provider failed, routed via orchestrator', {
            provider: this.config.provider,
            fallbackProvider: fallbackResponse.provider,
            error: finalError.message,
          });

          return fallbackResponse.content;
        } catch (routerError) {
          finalError = routerError instanceof Error ? routerError : new Error(String(routerError));
        }
      }

      this.metrics.errorCount++;
      applicationErrors.labels('llm_service', 'ChatError', 'error').inc();

      logger.error('LLM chat failed', {
        provider: this.config.provider,
        messageCount: messages.length,
        error: finalError.message,
      });

      throw finalError;
    }
  }

  /**
   * OpenAI completion implementation
   */
  async openAICompletion(params) {
    const { prompt, model, maxTokens, temperature } = params;
    let { systemMessage } = params;

    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const messages = [];

    // Optional research-only system prompt injection (feature-gated)
    if (!systemMessage && process.env.RESEARCH_PROMPT_ENABLED === 'true') {
      try {
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const defaultPath = path.resolve(__dirname, '../maestro/prompts/research_system_prompt.txt');
        const p = process.env.RESEARCH_PROMPT_PATH || defaultPath;
        systemMessage = fs.readFileSync(p, 'utf8');
      } catch (_) {
        // ignore
      }
    }

    if (systemMessage) {
      messages.push({ role: 'system', content: systemMessage });
    }

    messages.push({ role: 'user', content: prompt });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(otelService.getCurrentTraceContext()
          ? { traceparent: otelService.getCurrentTraceContext() }
          : {}),
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
        stream: false,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      throw new Error('No completion returned from OpenAI');
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }

  /**
   * OpenAI chat implementation
   */
  async openAIChat(messages, options) {
    const { model, maxTokens, temperature } = options;

    // Inject research-only system prompt if enabled and not present
    if (process.env.RESEARCH_PROMPT_ENABLED === 'true') {
      const hasSystem = Array.isArray(messages) && messages.length > 0 && messages[0]?.role === 'system';
      if (!hasSystem) {
        try {
          const __filename = fileURLToPath(import.meta.url);
          const __dirname = path.dirname(__filename);
          const defaultPath = path.resolve(__dirname, '../maestro/prompts/research_system_prompt.txt');
          const p = process.env.RESEARCH_PROMPT_PATH || defaultPath;
          const sys = fs.readFileSync(p, 'utf8');
          messages = [{ role: 'system', content: sys }, ...messages];
        } catch (_) {
          // ignore
        }
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
        ...(otelService.getCurrentTraceContext()
          ? { traceparent: otelService.getCurrentTraceContext() }
          : {}),
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        max_tokens: maxTokens,
        temperature: temperature,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`OpenAI Chat API error: ${response.status} - ${errorData}`);
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  }

  /**
   * Anthropic completion (placeholder)
   */
  async anthropicCompletion(params) {
    throw new Error('Anthropic provider not yet implemented');
  }

  /**
   * Local completion (placeholder)
   */
  async localCompletion(params) {
    throw new Error('Local provider not yet implemented');
  }

  /**
   * Summarize text
   */
  async summarize(text, options = {}) {
    const { maxLength = 100, style = 'concise', model = this.config.model } = options;

    const prompt = `Please provide a ${style} summary of the following text in no more than ${maxLength} words:

${text}

Summary:`;

    return this.complete({
      prompt,
      model,
      maxTokens: Math.min(maxLength * 2, 500), // Rough token estimation
      temperature: 0.3,
      providerTag: 'fast.summarize',
    });
  }

  /**
   * Extract key information
   */
  async extract(text, entities, options = {}) {
    const { model = this.config.model } = options;

    const entityList = Array.isArray(entities) ? entities.join(', ') : entities;

    const prompt = `Extract the following types of information from the text: ${entityList}

Text: ${text}

Please format your response as JSON with the entity types as keys and extracted values as arrays.

Response:`;

    const response = await this.complete({
      prompt,
      model,
      temperature: 0.1,
      providerTag: 'reason.dense',
    });

    try {
      return JSON.parse(response);
    } catch (error) {
      logger.warn('Failed to parse extraction response as JSON', {
        response,
        error: error.message,
      });
      return { raw_response: response };
    }
  }

  /**
   * Answer questions about text
   */
  async questionAnswer(context, question, options = {}) {
    const { model = this.config.model } = options;

    const prompt = `Context: ${context}

Question: ${question}

Based on the context provided above, please answer the question. If the context doesn't contain enough information to answer the question, please state that clearly.

Answer:`;

    return this.complete({
      prompt,
      model,
      temperature: 0.2,
      providerTag: 'reason.dense',
    });
  }

  /**
   * Update metrics
   */
  updateMetrics(latency, usage = {}) {
    this.metrics.totalCompletions++;

    const currentLatency = this.metrics.averageLatency;
    this.metrics.averageLatency = currentLatency ? (currentLatency + latency) / 2 : latency;

    if (usage.total_tokens) {
      this.metrics.totalTokensGenerated += usage.total_tokens;

      const currentAvgTokens = this.metrics.averageTokensPerCompletion;
      this.metrics.averageTokensPerCompletion = currentAvgTokens
        ? (currentAvgTokens + usage.total_tokens) / 2
        : usage.total_tokens;
    }
  }

  /**
   * Health check
   */
  getHealth() {
    return {
      status: 'healthy',
      provider: this.config.provider,
      model: this.config.model,
      metrics: {
        totalCompletions: this.metrics.totalCompletions,
        averageLatency: Math.round(this.metrics.averageLatency),
        errorCount: this.metrics.errorCount,
        totalTokensGenerated: this.metrics.totalTokensGenerated,
        averageTokensPerCompletion: Math.round(this.metrics.averageTokensPerCompletion),
        successRate:
          this.metrics.totalCompletions > 0
            ? (
                ((this.metrics.totalCompletions - this.metrics.errorCount) /
                  this.metrics.totalCompletions) *
                100
              ).toFixed(1) + '%'
            : '100%',
      },
    };
  }

  /**
   * Test completion
   */
  async test() {
    try {
      const response = await this.complete({
        prompt: 'What is 2+2?',
        maxTokens: 50,
        providerTag: 'reason.dense',
      });

      return {
        success: true,
        response: response.substring(0, 100), // Truncate for logging
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

export default LLMService;
