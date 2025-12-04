/**
 * Fallback Router
 *
 * Intelligent routing with automatic fallback to alternative providers
 * based on circuit breaker state, model capabilities, and cost optimization.
 */

import { EventEmitter } from 'eventemitter3';
import { CircuitBreaker, CircuitBreakerRegistry } from './CircuitBreaker.js';
import { BaseLLMProvider, ProviderRegistry, MODEL_CAPABILITIES } from '../providers/index.js';
import {
  LLMProvider,
  LLMModel,
  LLMRequest,
  LLMResponse,
  ChainContext,
} from '../types/index.js';

export interface RoutingConfig {
  preferredProvider?: LLMProvider;
  preferredModel?: LLMModel;
  fallbackOrder: LLMModel[];
  maxFallbackAttempts: number;
  costOptimization: boolean;
  requireToolSupport: boolean;
}

export interface RoutingDecision {
  provider: LLMProvider;
  model: LLMModel;
  reason: string;
  isFallback: boolean;
  fallbackLevel: number;
  estimatedCost: number;
}

export interface RoutingResult {
  success: boolean;
  response?: LLMResponse;
  decision: RoutingDecision;
  fallbacksUsed: RoutingDecision[];
  totalAttempts: number;
  error?: string;
}

export class FallbackRouter extends EventEmitter {
  private providerRegistry: ProviderRegistry;
  private circuitRegistry: CircuitBreakerRegistry;
  private config: RoutingConfig;

  constructor(
    providerRegistry: ProviderRegistry,
    circuitRegistry: CircuitBreakerRegistry,
    config: Partial<RoutingConfig> = {},
  ) {
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
  async route(request: LLMRequest, context?: ChainContext): Promise<RoutingResult> {
    const fallbacksUsed: RoutingDecision[] = [];
    let totalAttempts = 0;

    // Get candidate models in priority order
    const candidates = this.getCandidateModels(request);

    for (const model of candidates) {
      if (totalAttempts >= this.config.maxFallbackAttempts) {
        break;
      }

      const capabilities = MODEL_CAPABILITIES[model];
      if (!capabilities) continue;

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
      const decision: RoutingDecision = {
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
      } catch (error) {
        circuitBreaker.recordFailure(error as Error);
        fallbacksUsed.push(decision);

        this.emit('routing:failure', {
          decision,
          error: (error as Error).message,
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
  private getCandidateModels(request: LLMRequest): LLMModel[] {
    const candidates: LLMModel[] = [];

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
      if (candidates.includes(model)) return false;

      const capabilities = MODEL_CAPABILITIES[model];
      if (!capabilities) return false;

      // Check tool support requirement
      if (this.config.requireToolSupport && request.tools?.length) {
        if (!capabilities.supportsTools) return false;
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
    const remaining = this.config.fallbackOrder.filter(
      (model) => !candidates.includes(model),
    );
    candidates.push(...remaining);

    return candidates;
  }

  /**
   * Estimate cost for a request
   */
  private estimateCost(model: LLMModel, request: LLMRequest): number {
    // Rough estimation based on message content
    const totalChars = request.messages.reduce(
      (sum, msg) => sum + msg.content.length,
      0,
    );
    const estimatedTokens = Math.ceil(totalChars / 4); // ~4 chars per token

    const pricing: Record<string, { input: number; output: number }> = {
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
  updateConfig(config: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }

  /**
   * Get health status of all providers
   */
  getHealthStatus(): Record<string, { available: boolean; state: string }> {
    const status: Record<string, { available: boolean; state: string }> = {};

    for (const model of this.config.fallbackOrder) {
      const capabilities = MODEL_CAPABILITIES[model];
      if (!capabilities) continue;

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
