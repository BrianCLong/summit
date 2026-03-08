"use strict";
/**
 * OpenAI LLM Provider
 *
 * Provider implementation for OpenAI models including GPT-4, GPT-4o,
 * o1-preview, and o1-mini with full tool calling support.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAIProvider = void 0;
const BaseLLMProvider_js_1 = require("./BaseLLMProvider.js");
// Pricing per 1K tokens (as of 2024)
const OPENAI_PRICING = {
    'gpt-4-turbo': { input: 0.01, output: 0.03 },
    'gpt-4o': { input: 0.005, output: 0.015 },
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
    'o1-preview': { input: 0.015, output: 0.06 },
    'o1-mini': { input: 0.003, output: 0.012 },
};
class OpenAIProvider extends BaseLLMProvider_js_1.BaseLLMProvider {
    organization;
    constructor(config) {
        super(config);
        this.organization = config.organization;
    }
    get provider() {
        return this.config.model.startsWith('o1') ? 'o1' : 'gpt';
    }
    get supportedModels() {
        return ['gpt-4-turbo', 'gpt-4o', 'gpt-4o-mini', 'o1-preview', 'o1-mini'];
    }
    async complete(request) {
        const startTime = Date.now();
        const model = request.model || this.config.model;
        const isO1Model = model.startsWith('o1');
        try {
            // Transform messages for OpenAI format
            const messages = this.transformMessages(request.messages, isO1Model);
            // Build request body
            const requestBody = {
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
            const usage = this.calculateUsage(response, model);
            this.updateMetrics(true, latencyMs, usage);
            const choice = response.choices[0];
            return {
                id: response.id || this.generateResponseId(),
                model: model,
                provider: this.provider,
                content: choice.message?.content || '',
                toolCalls: choice.message?.tool_calls,
                usage,
                latencyMs,
                cached: false,
                metadata: request.metadata,
            };
        }
        catch (error) {
            const latencyMs = Date.now() - startTime;
            this.updateMetrics(false, latencyMs, { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0 });
            throw error;
        }
    }
    async healthCheck() {
        try {
            await this.complete({
                messages: [{ role: 'user', content: 'Hello' }],
                maxTokens: 5,
            });
            return true;
        }
        catch {
            return false;
        }
    }
    estimateCost(promptTokens, completionTokens) {
        const pricing = OPENAI_PRICING[this.config.model] || OPENAI_PRICING['gpt-4o'];
        return (promptTokens / 1000) * pricing.input + (completionTokens / 1000) * pricing.output;
    }
    transformMessages(messages, isO1Model) {
        const transformed = [];
        for (const msg of messages) {
            // o1 models don't support system messages - convert to user message
            if (msg.role === 'system' && isO1Model) {
                transformed.push({
                    role: 'user',
                    content: `[System Instructions]\n${msg.content}`,
                });
                continue;
            }
            const transformedMsg = {
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
    async callOpenAIAPI(requestBody) {
        const apiKey = this.config.apiKey || process.env.OPENAI_API_KEY;
        const baseUrl = this.config.baseUrl || 'https://api.openai.com';
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }
        const headers = {
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
    calculateUsage(response, model) {
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
exports.OpenAIProvider = OpenAIProvider;
