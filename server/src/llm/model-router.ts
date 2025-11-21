/**
 * LLM Model Router with Circuit Breaker and Fallbacks
 *
 * Features:
 * - Intelligent model routing based on task type
 * - Circuit breaker pattern for fault tolerance
 * - Automatic fallback to backup models
 * - Load balancing across providers
 * - Health monitoring and recovery
 * - Cost optimization routing
 */

import { Logger } from '../observability/logger.js';
import { Metrics } from '../observability/metrics.js';

const logger = new Logger('LLMModelRouter');
const metrics = new Metrics();

export type ModelProvider = 'openai' | 'anthropic' | 'google' | 'local';

export interface ModelConfig {
  id: string;
  provider: ModelProvider;
  name: string;
  maxTokens: number;
  costPer1kTokens: number;
  latencyMs: number;
  capabilities: string[];
  priority: number;
  fallbackTo?: string;
}

export interface CircuitBreakerState {
  status: 'closed' | 'open' | 'half-open';
  failures: number;
  lastFailure: number;
  successCount: number;
}

export interface RouteResult {
  model: ModelConfig;
  fallbackChain: ModelConfig[];
  estimatedCost: number;
  estimatedLatency: number;
}

export interface RoutingContext {
  taskType: 'completion' | 'chat' | 'embedding' | 'summarization' | 'extraction' | 'code';
  estimatedTokens: number;
  maxLatencyMs?: number;
  maxCost?: number;
  requiredCapabilities?: string[];
  preferredProvider?: ModelProvider;
  userId?: string;
  priority?: 'low' | 'normal' | 'high';
}

/**
 * Model registry with configurations
 */
const MODEL_REGISTRY: Record<string, ModelConfig> = {
  'gpt-4o': {
    id: 'gpt-4o',
    provider: 'openai',
    name: 'gpt-4o',
    maxTokens: 128000,
    costPer1kTokens: 0.005,
    latencyMs: 500,
    capabilities: ['chat', 'completion', 'code', 'reasoning', 'vision'],
    priority: 1,
    fallbackTo: 'gpt-4-turbo',
  },
  'gpt-4-turbo': {
    id: 'gpt-4-turbo',
    provider: 'openai',
    name: 'gpt-4-turbo-preview',
    maxTokens: 128000,
    costPer1kTokens: 0.01,
    latencyMs: 800,
    capabilities: ['chat', 'completion', 'code', 'reasoning'],
    priority: 2,
    fallbackTo: 'gpt-3.5-turbo',
  },
  'gpt-3.5-turbo': {
    id: 'gpt-3.5-turbo',
    provider: 'openai',
    name: 'gpt-3.5-turbo',
    maxTokens: 16385,
    costPer1kTokens: 0.0005,
    latencyMs: 200,
    capabilities: ['chat', 'completion', 'summarization'],
    priority: 3,
  },
  'claude-3-opus': {
    id: 'claude-3-opus',
    provider: 'anthropic',
    name: 'claude-3-opus-20240229',
    maxTokens: 200000,
    costPer1kTokens: 0.015,
    latencyMs: 1000,
    capabilities: ['chat', 'completion', 'code', 'reasoning', 'analysis'],
    priority: 1,
    fallbackTo: 'claude-3-sonnet',
  },
  'claude-3-sonnet': {
    id: 'claude-3-sonnet',
    provider: 'anthropic',
    name: 'claude-3-sonnet-20240229',
    maxTokens: 200000,
    costPer1kTokens: 0.003,
    latencyMs: 500,
    capabilities: ['chat', 'completion', 'code', 'reasoning'],
    priority: 2,
    fallbackTo: 'claude-3-haiku',
  },
  'claude-3-haiku': {
    id: 'claude-3-haiku',
    provider: 'anthropic',
    name: 'claude-3-haiku-20240307',
    maxTokens: 200000,
    costPer1kTokens: 0.00025,
    latencyMs: 150,
    capabilities: ['chat', 'completion', 'summarization'],
    priority: 3,
  },
  'gemini-pro': {
    id: 'gemini-pro',
    provider: 'google',
    name: 'gemini-pro',
    maxTokens: 32000,
    costPer1kTokens: 0.00025,
    latencyMs: 300,
    capabilities: ['chat', 'completion', 'reasoning'],
    priority: 2,
  },
};

/**
 * Task type to capability mapping
 */
const TASK_CAPABILITIES: Record<string, string[]> = {
  completion: ['completion'],
  chat: ['chat'],
  embedding: ['embedding'],
  summarization: ['summarization', 'completion'],
  extraction: ['extraction', 'completion'],
  code: ['code', 'completion'],
};

/**
 * Circuit Breaker for model fault tolerance
 */
export class CircuitBreaker {
  private states: Map<string, CircuitBreakerState> = new Map();

  private readonly failureThreshold = 5;
  private readonly recoveryTimeout = 30000; // 30 seconds
  private readonly halfOpenSuccessThreshold = 3;

  getState(modelId: string): CircuitBreakerState {
    let state = this.states.get(modelId);
    if (!state) {
      state = {
        status: 'closed',
        failures: 0,
        lastFailure: 0,
        successCount: 0,
      };
      this.states.set(modelId, state);
    }
    return state;
  }

  isAvailable(modelId: string): boolean {
    const state = this.getState(modelId);
    const now = Date.now();

    switch (state.status) {
      case 'closed':
        return true;

      case 'open':
        // Check if recovery timeout has passed
        if (now - state.lastFailure > this.recoveryTimeout) {
          state.status = 'half-open';
          state.successCount = 0;
          logger.info('Circuit breaker half-open', { modelId });
          return true;
        }
        return false;

      case 'half-open':
        return true;
    }
  }

  recordSuccess(modelId: string): void {
    const state = this.getState(modelId);

    if (state.status === 'half-open') {
      state.successCount++;
      if (state.successCount >= this.halfOpenSuccessThreshold) {
        state.status = 'closed';
        state.failures = 0;
        logger.info('Circuit breaker closed', { modelId });
        metrics.counter('llm_circuit_breaker_recovered', { model: modelId });
      }
    } else if (state.status === 'closed') {
      // Decay failures on success
      state.failures = Math.max(0, state.failures - 1);
    }
  }

  recordFailure(modelId: string, error: Error): void {
    const state = this.getState(modelId);
    state.failures++;
    state.lastFailure = Date.now();

    if (state.status === 'half-open') {
      // Any failure in half-open trips back to open
      state.status = 'open';
      logger.warn('Circuit breaker reopened', { modelId, error: error.message });
      metrics.counter('llm_circuit_breaker_reopened', { model: modelId });
    } else if (state.failures >= this.failureThreshold) {
      state.status = 'open';
      logger.error('Circuit breaker opened', {
        modelId,
        failures: state.failures,
        error: error.message,
      });
      metrics.counter('llm_circuit_breaker_opened', { model: modelId });
    }
  }

  reset(modelId: string): void {
    this.states.delete(modelId);
    logger.info('Circuit breaker reset', { modelId });
  }

  getAllStates(): Record<string, CircuitBreakerState> {
    const result: Record<string, CircuitBreakerState> = {};
    for (const [id, state] of this.states.entries()) {
      result[id] = { ...state };
    }
    return result;
  }
}

/**
 * LLM Model Router
 */
export class LLMModelRouter {
  private circuitBreaker = new CircuitBreaker();
  private modelHealth: Map<string, { healthy: boolean; lastCheck: number }> = new Map();
  private loadBalancer: Map<string, number> = new Map();

  constructor() {
    // Start health check interval
    setInterval(() => this.healthCheck(), 60000);
    logger.info('LLM Model Router initialized');
  }

  /**
   * Route to the best available model
   */
  async route(context: RoutingContext): Promise<RouteResult> {
    const { taskType, estimatedTokens, maxLatencyMs, maxCost, requiredCapabilities } = context;

    // Get required capabilities for task
    const capabilities = requiredCapabilities || TASK_CAPABILITIES[taskType] || ['completion'];

    // Find eligible models
    const eligibleModels = this.findEligibleModels({
      capabilities,
      maxTokens: estimatedTokens,
      maxLatencyMs,
      maxCost,
      preferredProvider: context.preferredProvider,
    });

    if (eligibleModels.length === 0) {
      throw new Error(`No eligible models found for task: ${taskType}`);
    }

    // Sort by priority and availability
    const sortedModels = this.sortModels(eligibleModels, context);

    // Select primary model
    const primary = sortedModels[0];

    // Build fallback chain
    const fallbackChain = this.buildFallbackChain(primary, sortedModels);

    const result: RouteResult = {
      model: primary,
      fallbackChain,
      estimatedCost: (estimatedTokens / 1000) * primary.costPer1kTokens,
      estimatedLatency: primary.latencyMs,
    };

    logger.debug('Route selected', {
      primary: primary.id,
      fallbacks: fallbackChain.map((m) => m.id),
      context,
    });

    metrics.counter('llm_route_selected', {
      model: primary.id,
      task: taskType,
      priority: context.priority || 'normal',
    });

    return result;
  }

  /**
   * Execute with automatic fallback
   */
  async executeWithFallback<T>(
    route: RouteResult,
    executor: (model: ModelConfig) => Promise<T>
  ): Promise<{ result: T; model: ModelConfig; attempts: number }> {
    const allModels = [route.model, ...route.fallbackChain];
    let lastError: Error | null = null;
    let attempts = 0;

    for (const model of allModels) {
      attempts++;

      if (!this.circuitBreaker.isAvailable(model.id)) {
        logger.debug('Model circuit breaker open, skipping', { model: model.id });
        continue;
      }

      try {
        const startTime = Date.now();
        const result = await executor(model);
        const latency = Date.now() - startTime;

        this.circuitBreaker.recordSuccess(model.id);
        this.updateLoadBalancer(model.id, latency);

        metrics.histogram('llm_execution_latency_ms', latency, { model: model.id });
        metrics.counter('llm_execution_success', { model: model.id });

        if (attempts > 1) {
          logger.info('Fallback succeeded', {
            model: model.id,
            attempts,
            originalModel: route.model.id,
          });
          metrics.counter('llm_fallback_success', {
            from: route.model.id,
            to: model.id,
          });
        }

        return { result, model, attempts };
      } catch (error) {
        lastError = error as Error;
        this.circuitBreaker.recordFailure(model.id, lastError);

        logger.warn('Model execution failed', {
          model: model.id,
          error: lastError.message,
          attempts,
          hasMoreFallbacks: attempts < allModels.length,
        });

        metrics.counter('llm_execution_failure', {
          model: model.id,
          error: lastError.name,
        });
      }
    }

    metrics.counter('llm_all_fallbacks_exhausted');
    throw new Error(`All models failed. Last error: ${lastError?.message}`);
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): ModelConfig | undefined {
    return MODEL_REGISTRY[modelId];
  }

  /**
   * List all available models
   */
  listModels(): ModelConfig[] {
    return Object.values(MODEL_REGISTRY).filter((m) =>
      this.circuitBreaker.isAvailable(m.id)
    );
  }

  /**
   * Get router health status
   */
  getHealth(): {
    healthy: boolean;
    availableModels: number;
    totalModels: number;
    circuitBreakers: Record<string, CircuitBreakerState>;
  } {
    const availableModels = this.listModels().length;
    const totalModels = Object.keys(MODEL_REGISTRY).length;

    return {
      healthy: availableModels > 0,
      availableModels,
      totalModels,
      circuitBreakers: this.circuitBreaker.getAllStates(),
    };
  }

  private findEligibleModels(criteria: {
    capabilities: string[];
    maxTokens: number;
    maxLatencyMs?: number;
    maxCost?: number;
    preferredProvider?: ModelProvider;
  }): ModelConfig[] {
    const { capabilities, maxTokens, maxLatencyMs, maxCost, preferredProvider } = criteria;

    return Object.values(MODEL_REGISTRY).filter((model) => {
      // Check capacity
      if (model.maxTokens < maxTokens) return false;

      // Check capabilities
      const hasCapabilities = capabilities.some((cap) =>
        model.capabilities.includes(cap)
      );
      if (!hasCapabilities) return false;

      // Check latency constraint
      if (maxLatencyMs && model.latencyMs > maxLatencyMs) return false;

      // Check cost constraint
      if (maxCost) {
        const estimatedCost = (maxTokens / 1000) * model.costPer1kTokens;
        if (estimatedCost > maxCost) return false;
      }

      // Prefer specific provider if requested (but don't exclude others)
      // This is handled in sorting

      return true;
    });
  }

  private sortModels(models: ModelConfig[], context: RoutingContext): ModelConfig[] {
    const { preferredProvider, priority } = context;

    return models.sort((a, b) => {
      // Preferred provider gets bonus
      const aPreferred = preferredProvider && a.provider === preferredProvider ? -10 : 0;
      const bPreferred = preferredProvider && b.provider === preferredProvider ? -10 : 0;

      // Circuit breaker health
      const aHealthy = this.circuitBreaker.isAvailable(a.id) ? 0 : 100;
      const bHealthy = this.circuitBreaker.isAvailable(b.id) ? 0 : 100;

      // Load balancing score
      const aLoad = this.loadBalancer.get(a.id) || 0;
      const bLoad = this.loadBalancer.get(b.id) || 0;

      // Priority (lower is better for high priority tasks)
      let aPriority = a.priority;
      let bPriority = b.priority;

      // High priority tasks prefer best models
      if (priority === 'high') {
        aPriority = a.priority;
        bPriority = b.priority;
      } else if (priority === 'low') {
        // Low priority prefers cheaper models
        aPriority = a.costPer1kTokens * 1000;
        bPriority = b.costPer1kTokens * 1000;
      }

      const aScore = aPreferred + aHealthy + aLoad * 0.1 + aPriority;
      const bScore = bPreferred + bHealthy + bLoad * 0.1 + bPriority;

      return aScore - bScore;
    });
  }

  private buildFallbackChain(primary: ModelConfig, allModels: ModelConfig[]): ModelConfig[] {
    const chain: ModelConfig[] = [];
    const seen = new Set<string>([primary.id]);

    // Add explicit fallback
    if (primary.fallbackTo && MODEL_REGISTRY[primary.fallbackTo]) {
      const fallback = MODEL_REGISTRY[primary.fallbackTo];
      if (!seen.has(fallback.id)) {
        chain.push(fallback);
        seen.add(fallback.id);
      }
    }

    // Add remaining models as fallbacks (up to 3 total fallbacks)
    for (const model of allModels) {
      if (chain.length >= 3) break;
      if (!seen.has(model.id)) {
        chain.push(model);
        seen.add(model.id);
      }
    }

    return chain;
  }

  private updateLoadBalancer(modelId: string, latency: number): void {
    const current = this.loadBalancer.get(modelId) || 0;
    // Exponential moving average
    const alpha = 0.3;
    this.loadBalancer.set(modelId, current * (1 - alpha) + latency * alpha);
  }

  private async healthCheck(): Promise<void> {
    logger.debug('Running model health check');

    for (const modelId of Object.keys(MODEL_REGISTRY)) {
      const state = this.circuitBreaker.getState(modelId);

      // If open for too long, try to recover
      if (state.status === 'open') {
        const timeSinceFailure = Date.now() - state.lastFailure;
        if (timeSinceFailure > 60000) {
          // 1 minute
          logger.info('Attempting circuit breaker recovery', { modelId });
        }
      }

      this.modelHealth.set(modelId, {
        healthy: this.circuitBreaker.isAvailable(modelId),
        lastCheck: Date.now(),
      });
    }
  }
}

// Export singleton
export const llmRouter = new LLMModelRouter();
