"use strict";
// @ts-nocheck
/**
 * Enhanced token counting with provider-aware tokenization, pricing registry, and caching
 * Supports precise tokenization, billing rounding, and post-hoc reconciliation
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.estimateTokensAndCost = estimateTokensAndCost;
exports.reconcileActualUsage = reconcileActualUsage;
exports.getModelPricing = getModelPricing;
exports.getSupportedModels = getSupportedModels;
exports.getCacheStats = getCacheStats;
const lru_cache_1 = __importDefault(require("lru-cache"));
const logger_js_1 = __importDefault(require("../utils/logger.js"));
const budget_tracker_js_1 = require("./resources/budget-tracker.js");
const types_js_1 = require("./resources/types.js");
const budgetTracker = budget_tracker_js_1.BudgetTracker.getInstance();
/**
 * Comprehensive pricing registry with model-specific billing rules
 */
const PRICING_REGISTRY = {
    openai: {
        'gpt-4o': {
            per1k: { prompt: 0.0025, completion: 0.01 },
            maxContextTokens: 128000,
            tier: 'premium',
        },
        'gpt-4o-mini': {
            per1k: { prompt: 0.00015, completion: 0.0006 },
            maxContextTokens: 128000,
            tier: 'standard',
        },
        'gpt-4-turbo': {
            per1k: { prompt: 0.01, completion: 0.03 },
            maxContextTokens: 128000,
            tier: 'premium',
        },
        'gpt-3.5-turbo': {
            per1k: { prompt: 0.0005, completion: 0.0015 },
            maxContextTokens: 16385,
            tier: 'standard',
            deprecationDate: '2024-06-13',
        },
    },
    anthropic: {
        'claude-3-5-sonnet-20241022': {
            per1k: { prompt: 0.003, completion: 0.015 },
            maxContextTokens: 200000,
            tier: 'premium',
        },
        'claude-3-opus': {
            per1k: { prompt: 0.015, completion: 0.075 },
            maxContextTokens: 200000,
            tier: 'enterprise',
        },
        'claude-3-haiku': {
            per1k: { prompt: 0.00025, completion: 0.00125 },
            maxContextTokens: 200000,
            tier: 'standard',
        },
    },
    gemini: {
        'gemini-1.5-pro': {
            per1k: { prompt: 0.00125, completion: 0.005 },
            maxContextTokens: 1048576,
            tier: 'premium',
        },
        'gemini-1.5-flash': {
            per1k: { prompt: 0.000075, completion: 0.0003 },
            maxContextTokens: 1048576,
            tier: 'standard',
        },
    },
};
/**
 * LRU cache for token count estimates (5-minute TTL, 10k entries max)
 */
const tokenCache = new lru_cache_1.default({
    max: 10000,
    ttl: 5 * 60 * 1000, // 5 minutes
    updateAgeOnGet: true,
});
/**
 * Apply provider-specific billing rounding rules
 */
function applyBillingRounding(tokens, rules) {
    if (!rules)
        return tokens;
    let billableTokens = Math.max(tokens, rules.minBillableTokens || 0);
    if (rules.roundingUnit && rules.roundingUnit > 1) {
        billableTokens =
            Math.ceil(billableTokens / rules.roundingUnit) * rules.roundingUnit;
    }
    return billableTokens;
}
/**
 * Precise tokenization using provider-specific tokenizers
 */
async function tokenizePrecise(payload, provider, model) {
    try {
        switch (provider) {
            case 'openai':
                // Use gpt-tokenizer for precise OpenAI counting
                try {
                    const { encode } = await Promise.resolve().then(() => __importStar(require('gpt-tokenizer')));
                    const text = serializePayload(payload);
                    const tokens = encode(text, model).length;
                    return { prompt: tokens, method: 'precise' };
                }
                catch (error) {
                    logger_js_1.default.warn('GPT tokenizer failed, falling back to heuristic', {
                        error: error instanceof Error ? error.message : String(error),
                    });
                    return tokenizeHeuristic(payload, provider);
                }
            case 'anthropic':
                // Anthropic tokenizer would go here when available
                // For now, use calibrated heuristic
                return tokenizeHeuristic(payload, provider);
            case 'gemini':
                // Gemini tokenizer would go here when available
                // For now, use calibrated heuristic
                return tokenizeHeuristic(payload, provider);
            default:
                return tokenizeHeuristic(payload, provider);
        }
    }
    catch (error) {
        logger_js_1.default.error('Precise tokenization failed', {
            provider,
            model,
            error: error instanceof Error ? error.message : String(error),
        });
        return tokenizeHeuristic(payload, provider);
    }
}
/**
 * Heuristic tokenization with provider-specific calibration
 */
function tokenizeHeuristic(payload, provider) {
    const text = serializePayload(payload);
    const baseLength = text.length;
    // Provider-specific heuristics based on empirical data
    let charsPerToken;
    switch (provider) {
        case 'openai':
            charsPerToken = 4.0; // GPT models average ~4 chars/token
            break;
        case 'anthropic':
            charsPerToken = 3.5; // Claude is slightly more efficient
            break;
        case 'gemini':
            charsPerToken = 4.2; // Gemini slightly less efficient
            break;
        default:
            charsPerToken = 4.0;
    }
    // Add overhead for message structure, tool definitions, etc.
    let overhead = 0;
    if (payload.messages) {
        overhead += payload.messages.length * 3; // Role tokens + delimiters
    }
    if (payload.tools) {
        overhead += payload.tools.length * 20; // Tool definition overhead
    }
    if (payload.systemPrompt) {
        overhead += 10; // System prompt formatting
    }
    const estimatedTokens = Math.ceil(baseLength / charsPerToken) + overhead;
    return { prompt: Math.max(1, estimatedTokens), method: 'heuristic' };
}
/**
 * Serialize payload to text for tokenization
 */
function serializePayload(payload) {
    if (typeof payload === 'string') {
        return payload;
    }
    let text = '';
    if (payload.messages && Array.isArray(payload.messages)) {
        text += payload.messages
            .map((msg) => {
            const message = msg;
            return `${message.role || 'user'}: ${message.content || ''}`;
        })
            .join('\n');
    }
    if (payload.input) {
        text +=
            typeof payload.input === 'string'
                ? payload.input
                : JSON.stringify(payload.input);
    }
    if (payload.systemPrompt) {
        text = payload.systemPrompt + '\n' + text;
    }
    if (payload.tools && Array.isArray(payload.tools)) {
        const toolsText = payload.tools
            .map((tool) => JSON.stringify(tool))
            .join('\n');
        text += '\nTools: ' + toolsText;
    }
    return text || JSON.stringify(payload);
}
/**
 * Create cache key for tokenization results
 */
function createCacheKey(payload, provider, model) {
    const payloadHash = Buffer.from(JSON.stringify(payload))
        .toString('base64')
        .slice(0, 32);
    return `${provider}:${model}:${payloadHash}`;
}
/**
 * Get default model for provider
 */
function getDefaultModel(provider) {
    const models = Object.keys(PRICING_REGISTRY[provider]);
    return models[0] || 'unknown';
}
/**
 * Main estimation function with caching and precise tokenization
 */
async function estimateTokensAndCost(input) {
    const provider = input.provider || 'openai';
    const model = input.model || getDefaultModel(provider);
    // Validate model exists
    const pricing = PRICING_REGISTRY[provider]?.[model];
    if (!pricing) {
        throw new Error(`No pricing information available for ${provider}:${model}`);
    }
    // Check cache first
    const cacheKey = createCacheKey(input.payload, provider, model);
    const cached = tokenCache.get(cacheKey);
    let promptTokens;
    let estimationMethod;
    let cacheHit = false;
    if (cached && Date.now() - cached.timestamp < 300000) {
        // 5-minute cache
        promptTokens = cached.tokens;
        estimationMethod = 'cached';
        cacheHit = true;
    }
    else {
        // Perform tokenization
        const tokenResult = await tokenizePrecise(input.payload, provider, model);
        promptTokens = tokenResult.prompt;
        estimationMethod = tokenResult.method;
        // Cache the result
        tokenCache.set(cacheKey, {
            tokens: promptTokens,
            method: estimationMethod,
            timestamp: Date.now(),
        });
    }
    // Estimate completion tokens (if not provided)
    let completionTokens = 0;
    if (input.payload.maxTokens) {
        // Use provided max tokens as completion estimate
        completionTokens = Math.min(input.payload.maxTokens, pricing.maxContextTokens || Infinity);
    }
    else {
        // Default heuristic: 20% of prompt tokens, capped at 1000
        completionTokens = Math.min(Math.ceil(promptTokens * 0.2), 1000);
    }
    // Apply billing rounding
    const billedPromptTokens = applyBillingRounding(promptTokens, pricing);
    const billedCompletionTokens = applyBillingRounding(completionTokens, pricing);
    // Calculate costs
    const promptUSD = (billedPromptTokens / 1000) * pricing.per1k.prompt;
    const completionUSD = (billedCompletionTokens / 1000) * pricing.per1k.completion;
    const totalUSD = +(promptUSD + completionUSD).toFixed(6);
    if (input.tenantId) {
        // Report measurement hook for LLM generation
        budgetTracker.trackCost(input.tenantId, types_js_1.CostDomain.LLM_GENERATION, totalUSD, {
            provider,
            model,
            promptTokens: billedPromptTokens,
            completionTokens: billedCompletionTokens,
            estimated: true // Mark as estimated since this is pre-call
        });
    }
    return {
        provider,
        model,
        promptTokens: billedPromptTokens,
        completionTokens: billedCompletionTokens,
        totalTokens: billedPromptTokens + billedCompletionTokens,
        promptUSD,
        completionUSD,
        totalUSD,
        cacheHit,
        estimationMethod,
    };
}
/**
 * Post-hoc reconciliation with actual provider usage
 */
async function reconcileActualUsage(estimated, actualData) {
    if (!actualData)
        return null;
    try {
        let actualTokens = actualData.tokens;
        let actualCost = actualData.cost;
        let confidence = 1.0;
        // If we have actual token counts, recalculate cost
        if (actualTokens) {
            const pricing = PRICING_REGISTRY[estimated.provider]?.[estimated.model];
            if (pricing) {
                const promptCost = (actualTokens.prompt / 1000) * pricing.per1k.prompt;
                const completionCost = (actualTokens.completion / 1000) * pricing.per1k.completion;
                actualCost = +(promptCost + completionCost).toFixed(6);
            }
        }
        else if (actualCost && actualCost > 0) {
            // Reverse-engineer token counts from cost (less reliable)
            const pricing = PRICING_REGISTRY[estimated.provider]?.[estimated.model];
            if (pricing) {
                // Assume same ratio of prompt/completion as estimated
                const promptRatio = estimated.promptTokens / estimated.totalTokens;
                const completionRatio = estimated.completionTokens / estimated.totalTokens;
                // This is approximate due to rounding and billing complexities
                const totalTokensFromCost = (actualCost * 1000) /
                    (pricing.per1k.prompt * promptRatio +
                        pricing.per1k.completion * completionRatio);
                actualTokens = {
                    prompt: Math.round(totalTokensFromCost * promptRatio),
                    completion: Math.round(totalTokensFromCost * completionRatio),
                };
                confidence = 0.7; // Lower confidence for reverse-engineered data
            }
        }
        if (!actualTokens || !actualCost)
            return null;
        return {
            ...estimated,
            promptTokens: actualTokens.prompt,
            completionTokens: actualTokens.completion,
            totalTokens: actualTokens.prompt + actualTokens.completion,
            promptUSD: (actualTokens.prompt / 1000) *
                PRICING_REGISTRY[estimated.provider][estimated.model].per1k.prompt,
            completionUSD: (actualTokens.completion / 1000) *
                PRICING_REGISTRY[estimated.provider][estimated.model].per1k.completion,
            totalUSD: actualCost,
            reconciliationType: actualData.source,
            reconciliationConfidence: confidence,
            estimationMethod: 'reconciled',
        };
    }
    catch (error) {
        logger_js_1.default.error('Token usage reconciliation failed', {
            error: error instanceof Error ? error.message : String(error),
            estimated,
            actualData,
        });
        return null;
    }
}
/**
 * Get pricing information for a model
 */
function getModelPricing(provider, model) {
    return PRICING_REGISTRY[provider]?.[model] || null;
}
/**
 * List all supported models with their pricing
 */
function getSupportedModels() {
    const models = [];
    for (const [provider, providerModels] of Object.entries(PRICING_REGISTRY)) {
        for (const [model, pricing] of Object.entries(providerModels)) {
            models.push({
                provider: provider,
                model,
                pricing,
            });
        }
    }
    return models;
}
/**
 * Cache statistics for monitoring
 */
function getCacheStats() {
    return {
        size: tokenCache.size,
        maxSize: tokenCache.max,
        hitRate: tokenCache.calculatedSize || 0, // Simplified stat
    };
}
