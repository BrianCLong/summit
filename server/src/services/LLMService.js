"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMService = void 0;
// @ts-nocheck
const openai_1 = require("openai");
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const tracing_js_1 = require("../observability/tracing.js");
const metrics_js_1 = require("../observability/metrics.js");
class LLMService {
    config;
    metrics;
    _openai;
    constructor(config = {}) {
        this.config = {
            defaultProvider: process.env.LLM_PROVIDER || 'openai',
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
    get openai() {
        if (!this._openai) {
            // Allow this to throw if API key is missing, but only when accessed
            this._openai = new openai_1.OpenAI({
                apiKey: this.config.apiKey,
            });
        }
        return this._openai;
    }
    /**
     * Execute a completion request
     */
    async complete(prompt, options = {}) {
        return tracing_js_1.tracer.trace('llm.complete', async (span) => {
            const startTime = Date.now();
            const provider = options.provider || this.config.defaultProvider;
            const model = options.model || this.config.defaultModel;
            span.setAttributes({
                'llm.provider': provider,
                'llm.model': model,
                'llm.temperature': options.temperature || this.config.temperature,
            });
            try {
                let response;
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
                return response.text;
            }
            catch (error) {
                this.metrics.errorCount++;
                // Record failure latency/count if needed
                if (metrics_js_1.metrics.llmRequestDuration) {
                    metrics_js_1.metrics.llmRequestDuration.observe({
                        provider,
                        model,
                        status: 'error'
                    }, (Date.now() - startTime) / 1000);
                }
                logger_js_1.default.error('LLM request failed', {
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
    async chat(messages, options = {}) {
        return tracing_js_1.tracer.trace('llm.chat', async (span) => {
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
                return text;
            }
            catch (error) {
                this.metrics.errorCount++;
                if (metrics_js_1.metrics.llmRequestDuration) {
                    metrics_js_1.metrics.llmRequestDuration.observe({
                        provider,
                        model,
                        status: 'error'
                    }, (Date.now() - startTime) / 1000);
                }
                logger_js_1.default.error('LLM chat request failed', {
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
    async callOpenAI(prompt, options) {
        const body = {
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
    async callAnthropic(_prompt, _options) {
        throw new Error('Anthropic provider not implemented');
    }
    /**
     * Google implementation (placeholder)
     */
    async callGoogle(_prompt, _options) {
        throw new Error('Google provider not implemented');
    }
    /**
     * Ollama implementation (placeholder)
     */
    async callOllama(_prompt, _options) {
        throw new Error('Ollama provider not implemented');
    }
    updateMetrics(latency, usage, provider = 'openai', model = 'unknown') {
        this.metrics.totalRequests++;
        this.metrics.totalTokens += usage?.total_tokens || 0;
        this.metrics.averageLatency =
            (this.metrics.averageLatency * (this.metrics.totalRequests - 1) +
                latency) /
                this.metrics.totalRequests;
        // Prometheus Metrics
        if (metrics_js_1.metrics.llmTokensTotal) {
            metrics_js_1.metrics.llmTokensTotal.inc({
                provider,
                model,
                type: 'total'
            }, usage?.total_tokens || 0);
        }
        if (metrics_js_1.metrics.llmRequestDuration) {
            metrics_js_1.metrics.llmRequestDuration.observe({
                provider,
                model,
                status: 'success'
            }, latency / 1000); // Convert to seconds
        }
    }
}
exports.LLMService = LLMService;
exports.default = LLMService;
