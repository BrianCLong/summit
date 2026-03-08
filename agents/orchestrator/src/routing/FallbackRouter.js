"use strict";
/**
 * Fallback Router
 *
 * Intelligent routing with automatic fallback to alternative providers
 * based on circuit breaker state, model capabilities, and cost optimization.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FallbackRouter = void 0;
const eventemitter3_1 = require("eventemitter3");
const index_js_1 = require("../providers/index.js");
class FallbackRouter extends eventemitter3_1.EventEmitter {
    providerRegistry;
    circuitRegistry;
    config;
    constructor(providerRegistry, circuitRegistry, config = {}) {
        super();
        this.providerRegistry = providerRegistry;
        this.circuitRegistry = circuitRegistry;
        this.config = {
            fallbackOrder: config.fallbackOrder ?? [
                'claude-3-5-sonnet-20241022',
                'gpt-4o',
                'claude-3-haiku-20240307',
                'gpt-4o-mini',
                'o1-mini',
            ],
            maxFallbackAttempts: config.maxFallbackAttempts ?? 3,
            costOptimization: config.costOptimization ?? true,
            requireToolSupport: config.requireToolSupport ?? false,
            preferredProvider: config.preferredProvider,
            preferredModel: config.preferredModel,
        };
    }
    /**
     * Route a request with automatic fallback
     */
    async route(request, context) {
        const fallbacksUsed = [];
        let totalAttempts = 0;
        // Get candidate models in priority order
        const candidates = this.getCandidateModels(request);
        for (const model of candidates) {
            if (totalAttempts >= this.config.maxFallbackAttempts) {
                break;
            }
            const capabilities = index_js_1.MODEL_CAPABILITIES[model];
            if (!capabilities)
                continue;
            const providerId = `${capabilities.provider}-${model}`;
            const circuitBreaker = this.circuitRegistry.getOrCreate(providerId);
            if (!circuitBreaker.canExecute()) {
                this.emit('provider:unavailable', { model, providerId, reason: 'circuit-open' });
                continue;
            }
            const provider = this.providerRegistry.getByModel(model);
            if (!provider) {
                this.emit('provider:unavailable', { model, providerId, reason: 'not-registered' });
                continue;
            }
            totalAttempts++;
            const decision = {
                provider: capabilities.provider,
                model,
                reason: totalAttempts === 1 ? 'primary' : 'fallback',
                isFallback: totalAttempts > 1,
                fallbackLevel: totalAttempts - 1,
                estimatedCost: this.estimateCost(model, request),
            };
            try {
                this.emit('routing:attempt', { decision, attempt: totalAttempts });
                const response = await provider.complete({
                    ...request,
                    model,
                });
                circuitBreaker.recordSuccess();
                this.emit('routing:success', { decision, response });
                return {
                    success: true,
                    response,
                    decision,
                    fallbacksUsed,
                    totalAttempts,
                };
            }
            catch (error) {
                circuitBreaker.recordFailure(error);
                fallbacksUsed.push(decision);
                this.emit('routing:failure', {
                    decision,
                    error: error.message,
                    willRetry: totalAttempts < this.config.maxFallbackAttempts,
                });
            }
        }
        return {
            success: false,
            decision: fallbacksUsed[0] || {
                provider: 'claude',
                model: 'claude-3-5-sonnet-20241022',
                reason: 'no-available-providers',
                isFallback: false,
                fallbackLevel: 0,
                estimatedCost: 0,
            },
            fallbacksUsed,
            totalAttempts,
            error: 'All providers exhausted or unavailable',
        };
    }
    /**
     * Get candidate models in priority order
     */
    getCandidateModels(request) {
        const candidates = [];
        // Start with explicitly requested model
        if (request.model) {
            candidates.push(request.model);
        }
        // Add preferred model if configured
        if (this.config.preferredModel && !candidates.includes(this.config.preferredModel)) {
            candidates.push(this.config.preferredModel);
        }
        // Filter fallback order based on requirements
        const filteredFallbacks = this.config.fallbackOrder.filter((model) => {
            if (candidates.includes(model))
                return false;
            const capabilities = index_js_1.MODEL_CAPABILITIES[model];
            if (!capabilities)
                return false;
            // Check tool support requirement
            if (this.config.requireToolSupport && request.tools?.length) {
                if (!capabilities.supportsTools)
                    return false;
            }
            // Check preferred provider
            if (this.config.preferredProvider) {
                // Prefer models from preferred provider
                return capabilities.provider === this.config.preferredProvider;
            }
            return true;
        });
        candidates.push(...filteredFallbacks);
        // Add remaining models if preferred provider didn't work
        const remaining = this.config.fallbackOrder.filter((model) => !candidates.includes(model));
        candidates.push(...remaining);
        return candidates;
    }
    /**
     * Estimate cost for a request
     */
    estimateCost(model, request) {
        // Rough estimation based on message content
        const totalChars = request.messages.reduce((sum, msg) => sum + msg.content.length, 0);
        const estimatedTokens = Math.ceil(totalChars / 4); // ~4 chars per token
        const pricing = {
            'claude-3-5-sonnet-20241022': { input: 0.003, output: 0.015 },
            'claude-3-opus-20240229': { input: 0.015, output: 0.075 },
            'claude-3-haiku-20240307': { input: 0.00025, output: 0.00125 },
            'gpt-4-turbo': { input: 0.01, output: 0.03 },
            'gpt-4o': { input: 0.005, output: 0.015 },
            'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
            'o1-preview': { input: 0.015, output: 0.06 },
            'o1-mini': { input: 0.003, output: 0.012 },
            'local-llama': { input: 0, output: 0 },
        };
        const modelPricing = pricing[model] || { input: 0.01, output: 0.03 };
        const inputCost = (estimatedTokens / 1000) * modelPricing.input;
        const outputCost = ((request.maxTokens || 1000) / 1000) * modelPricing.output;
        return inputCost + outputCost;
    }
    /**
     * Update routing configuration
     */
    updateConfig(config) {
        this.config = { ...this.config, ...config };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Get health status of all providers
     */
    getHealthStatus() {
        const status = {};
        for (const model of this.config.fallbackOrder) {
            const capabilities = index_js_1.MODEL_CAPABILITIES[model];
            if (!capabilities)
                continue;
            const providerId = `${capabilities.provider}-${model}`;
            const circuitBreaker = this.circuitRegistry.get(providerId);
            status[model] = {
                available: circuitBreaker?.canExecute() ?? true,
                state: circuitBreaker?.getState().state ?? 'unknown',
            };
        }
        return status;
    }
}
exports.FallbackRouter = FallbackRouter;
