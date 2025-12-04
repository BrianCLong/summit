/**
 * Multi-LLM Orchestrator
 *
 * Main orchestrator class that provides resilient multi-LLM chaining
 * with governance gates, hallucination scoring, and fallback routing.
 */

import { EventEmitter } from 'eventemitter3';
import { v4 as uuid } from 'uuid';
import {
  LLMRequest,
  LLMResponse,
  LLMMessage,
  LLMModel,
  ChainConfig,
  ChainStep,
  ChainContext,
  ChainResult,
  StepResult,
  GovernanceGate,
  GovernanceViolation,
  HallucinationScore,
  BudgetConfig,
  OrchestratorEvent,
  OrchestratorEventPayload,
} from './types/index.js';
import {
  ProviderRegistry,
  ProviderFactory,
  BaseLLMProvider,
} from './providers/index.js';
import {
  CircuitBreakerRegistry,
  FallbackRouter,
  RoutingConfig,
} from './routing/index.js';
import { RedisStateManager, RedisStateConfig } from './state/index.js';
import { GovernanceEngine, GovernanceResult } from './governance/index.js';
import { HallucinationScorer } from './scoring/index.js';

export interface MultiLLMOrchestratorConfig {
  redis?: Partial<RedisStateConfig>;
  routing?: Partial<RoutingConfig>;
  budget?: Partial<BudgetConfig>;
  governance?: GovernanceGate[];
  hallucinationScoring?: boolean;
  defaultModel?: LLMModel;
  maxChainDepth?: number;
  enableMetrics?: boolean;
}

export class MultiLLMOrchestrator extends EventEmitter {
  private providerRegistry: ProviderRegistry;
  private circuitRegistry: CircuitBreakerRegistry;
  private stateManager: RedisStateManager;
  private governanceEngine: GovernanceEngine;
  private hallucinationScorer: HallucinationScorer;
  private fallbackRouter: FallbackRouter;
  private config: MultiLLMOrchestratorConfig;
  private chains: Map<string, ChainConfig> = new Map();

  constructor(config: MultiLLMOrchestratorConfig = {}) {
    super();
    this.config = {
      defaultModel: config.defaultModel ?? 'claude-3-5-sonnet-20241022',
      maxChainDepth: config.maxChainDepth ?? 10,
      enableMetrics: config.enableMetrics ?? true,
      hallucinationScoring: config.hallucinationScoring ?? true,
      ...config,
    };

    // Initialize components
    this.providerRegistry = ProviderFactory.createDefaultRegistry();
    this.circuitRegistry = new CircuitBreakerRegistry();
    this.stateManager = new RedisStateManager(config.redis);
    this.governanceEngine = new GovernanceEngine(config.governance);
    this.hallucinationScorer = new HallucinationScorer({
      enabled: this.config.hallucinationScoring,
    });
    this.fallbackRouter = new FallbackRouter(
      this.providerRegistry,
      this.circuitRegistry,
      config.routing,
    );

    this.setupEventForwarding();
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Execute a simple completion request with governance and fallback
   */
  async complete(
    request: LLMRequest,
    options: {
      sessionId?: string;
      userId?: string;
      skipGovernance?: boolean;
      skipHallucinationCheck?: boolean;
    } = {},
  ): Promise<LLMResponse & { governance: GovernanceResult; hallucination?: HallucinationScore }> {
    const sessionId = options.sessionId ?? uuid();
    const userId = options.userId ?? 'anonymous';

    // Create or get session
    let session = await this.stateManager.getSession(sessionId);
    if (!session) {
      session = await this.stateManager.createSession(sessionId, userId);
    }

    // Build context
    const context: ChainContext = {
      chainId: uuid(),
      stepId: 'single-completion',
      sessionId,
      userId,
      startTime: new Date(),
      variables: {},
      history: session.messages,
      metadata: {},
    };

    // Run governance check on input
    let governanceResult: GovernanceResult = { allowed: true, violations: [], warnings: [], score: 1 };
    if (!options.skipGovernance) {
      governanceResult = await this.governanceEngine.evaluateMessages(
        request.messages,
        context,
      );

      if (!governanceResult.allowed) {
        this.emitEvent('governance:blocked', sessionId, context.chainId, undefined, {
          violations: governanceResult.violations,
        });
        throw new GovernanceError('Request blocked by governance', governanceResult.violations);
      }
    }

    // Check budget
    const budgetCheck = await this.stateManager.checkBudget(
      userId,
      this.estimateRequestCost(request),
      {
        daily: this.config.budget?.maxDailyCostUSD ?? 50,
        monthly: this.config.budget?.maxMonthlyCostUSD ?? 500,
      },
    );

    if (!budgetCheck.allowed) {
      this.emitEvent('budget:exceeded', sessionId, context.chainId, undefined, {
        reason: budgetCheck.reason,
      });
      throw new BudgetError(budgetCheck.reason ?? 'Budget exceeded');
    }

    // Route and execute request
    const routingResult = await this.fallbackRouter.route(request, context);

    if (!routingResult.success || !routingResult.response) {
      throw new OrchestratorError(routingResult.error ?? 'All providers failed');
    }

    const response = routingResult.response;

    // Update session state
    await this.stateManager.addMessage(sessionId, {
      role: 'user',
      content: request.messages[request.messages.length - 1].content,
    });
    await this.stateManager.addMessage(sessionId, {
      role: 'assistant',
      content: response.content,
    });
    await this.stateManager.updateUsage(sessionId, response.usage);

    // Record budget usage
    await this.stateManager.recordBudgetUsage(userId, {
      timestamp: new Date(),
      chainId: context.chainId,
      stepId: context.stepId,
      provider: response.provider,
      model: response.model,
      costUSD: response.usage.estimatedCostUSD,
      tokens: response.usage.totalTokens,
    });

    // Run hallucination scoring
    let hallucinationScore: HallucinationScore | undefined;
    if (!options.skipHallucinationCheck && this.config.hallucinationScoring) {
      hallucinationScore = await this.hallucinationScorer.score(
        response,
        context,
        request.messages.map((m) => m.content).join('\n'),
      );
    }

    // Run governance check on output
    if (!options.skipGovernance) {
      const outputGovernance = await this.governanceEngine.evaluate(
        response.content,
        context,
        'response',
      );
      governanceResult.violations.push(...outputGovernance.violations);
      governanceResult.warnings.push(...outputGovernance.warnings);
      governanceResult.score = Math.min(governanceResult.score, outputGovernance.score);
    }

    return {
      ...response,
      governance: governanceResult,
      hallucination: hallucinationScore,
    };
  }

  /**
   * Execute a multi-step chain
   */
  async executeChain(
    chainId: string,
    input: string,
    options: {
      sessionId?: string;
      userId?: string;
      variables?: Record<string, unknown>;
    } = {},
  ): Promise<ChainResult> {
    const chain = this.chains.get(chainId);
    if (!chain) {
      throw new OrchestratorError(`Chain not found: ${chainId}`);
    }

    const sessionId = options.sessionId ?? uuid();
    const userId = options.userId ?? 'anonymous';
    const startTime = Date.now();

    // Create session
    let session = await this.stateManager.getSession(sessionId);
    if (!session) {
      session = await this.stateManager.createSession(sessionId, userId);
    }

    const context: ChainContext = {
      chainId,
      stepId: '',
      sessionId,
      userId,
      startTime: new Date(),
      variables: options.variables ?? {},
      history: session.messages,
      metadata: {},
    };

    this.emitEvent('chain:started', sessionId, chainId, undefined, { input });

    const stepResults: StepResult[] = [];
    const allViolations: GovernanceViolation[] = [];
    let currentInput = input;
    let totalCostUSD = 0;
    let totalTokens = 0;

    try {
      // Execute chain based on strategy
      switch (chain.strategy) {
        case 'sequential':
          for (const step of chain.steps) {
            const result = await this.executeStep(step, currentInput, context);
            stepResults.push(result);

            if (!result.success) {
              throw new OrchestratorError(`Step ${step.id} failed: ${result.error}`);
            }

            currentInput = result.output;
            totalCostUSD += result.costUSD;
            totalTokens += result.tokens.totalTokens;
          }
          break;

        case 'parallel':
          const parallelResults = await Promise.all(
            chain.steps.map((step) => this.executeStep(step, input, context)),
          );
          stepResults.push(...parallelResults);
          currentInput = parallelResults.map((r) => r.output).join('\n\n');
          totalCostUSD = parallelResults.reduce((sum, r) => sum + r.costUSD, 0);
          totalTokens = parallelResults.reduce((sum, r) => sum + r.tokens.totalTokens, 0);
          break;

        case 'fallback':
          for (const step of chain.steps) {
            const result = await this.executeStep(step, input, context);
            stepResults.push(result);

            if (result.success) {
              currentInput = result.output;
              totalCostUSD += result.costUSD;
              totalTokens += result.tokens.totalTokens;
              break;
            }
          }
          break;

        case 'consensus':
          const consensusResults = await Promise.all(
            chain.steps.map((step) => this.executeStep(step, input, context)),
          );
          stepResults.push(...consensusResults);

          // Use hallucination scorer for consensus
          const responses: LLMResponse[] = consensusResults
            .filter((r) => r.success)
            .map((r) => ({
              id: r.stepId,
              model: r.model,
              provider: r.provider,
              content: r.output,
              usage: r.tokens,
              latencyMs: r.latencyMs,
              cached: false,
            }));

          if (responses.length > 0) {
            const consensusScore = await this.hallucinationScorer.scoreConsensus(
              responses,
              context,
              input,
            );

            // Use the response with highest individual quality
            const bestResult = consensusResults
              .filter((r) => r.success)
              .sort((a, b) => (b.hallucinationScore?.overall ?? 0) - (a.hallucinationScore?.overall ?? 0))[0];

            if (bestResult) {
              currentInput = bestResult.output;
            }
          }

          totalCostUSD = consensusResults.reduce((sum, r) => sum + r.costUSD, 0);
          totalTokens = consensusResults.reduce((sum, r) => sum + r.tokens.totalTokens, 0);
          break;
      }

      // Run governance gates
      for (const gate of chain.governanceGates) {
        const result = await this.governanceEngine.evaluate(currentInput, context, 'response');
        allViolations.push(...result.violations);
      }

      // Final hallucination score
      const finalResponse: LLMResponse = {
        id: uuid(),
        model: this.config.defaultModel!,
        provider: 'claude',
        content: currentInput,
        usage: { promptTokens: 0, completionTokens: 0, totalTokens, estimatedCostUSD: totalCostUSD },
        latencyMs: Date.now() - startTime,
        cached: false,
      };

      const hallucinationScore = await this.hallucinationScorer.score(
        finalResponse,
        context,
        input,
      );

      const result: ChainResult = {
        chainId,
        success: stepResults.every((r) => r.success),
        output: currentInput,
        steps: stepResults,
        totalLatencyMs: Date.now() - startTime,
        totalCostUSD,
        totalTokens,
        governanceViolations: allViolations,
        hallucinationScore,
      };

      this.emitEvent('chain:completed', sessionId, chainId, undefined, { result });
      return result;

    } catch (error) {
      this.emitEvent('chain:failed', sessionId, chainId, undefined, {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Register a chain configuration
   */
  registerChain(chain: ChainConfig): void {
    this.chains.set(chain.id, chain);
  }

  /**
   * Create a simple two-step chain (e.g., analyze then synthesize)
   */
  createSimpleChain(
    id: string,
    name: string,
    steps: Array<{
      name: string;
      model: LLMModel;
      systemPrompt: string;
    }>,
  ): ChainConfig {
    const chain: ChainConfig = {
      id,
      name,
      description: `Simple ${steps.length}-step chain`,
      strategy: 'sequential',
      steps: steps.map((s, i) => ({
        id: `${id}-step-${i}`,
        name: s.name,
        provider: s.model.startsWith('claude') ? 'claude' : s.model.startsWith('o1') ? 'o1' : 'gpt',
        model: s.model,
        systemPrompt: s.systemPrompt,
      })),
      governanceGates: [],
      timeout: 120000,
      maxRetries: 2,
      budget: {
        maxRequestCostUSD: 5,
        maxChainCostUSD: 20,
        maxDailyCostUSD: 50,
        maxMonthlyCostUSD: 500,
        warningThreshold: 0.8,
        enforcementMode: 'hard',
      },
    };

    this.registerChain(chain);
    return chain;
  }

  /**
   * Get session history
   */
  async getSessionHistory(sessionId: string): Promise<LLMMessage[]> {
    const session = await this.stateManager.getSession(sessionId);
    return session?.messages ?? [];
  }

  /**
   * Get provider health status
   */
  getHealthStatus(): Record<string, { available: boolean; state: string }> {
    return this.fallbackRouter.getHealthStatus();
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics(): Record<string, unknown> {
    const providerMetrics: Record<string, unknown> = {};

    for (const [key, provider] of this.providerRegistry.getAll()) {
      providerMetrics[key] = provider.getMetrics();
    }

    return {
      providers: providerMetrics,
      circuitBreakers: this.circuitRegistry.getAllStates(),
      chains: Array.from(this.chains.keys()),
    };
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: Record<string, boolean> }> {
    const redisHealthy = await this.stateManager.healthCheck();

    const providerHealth: Record<string, boolean> = {};
    for (const [key, provider] of this.providerRegistry.getAll()) {
      try {
        providerHealth[key] = await provider.healthCheck();
      } catch {
        providerHealth[key] = false;
      }
    }

    const allHealthy = redisHealthy && Object.values(providerHealth).some((h) => h);

    return {
      healthy: allHealthy,
      details: {
        redis: redisHealthy,
        ...providerHealth,
      },
    };
  }

  /**
   * Shutdown orchestrator
   */
  async shutdown(): Promise<void> {
    await this.stateManager.close();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private async executeStep(
    step: ChainStep,
    input: string,
    context: ChainContext,
  ): Promise<StepResult> {
    const stepContext = { ...context, stepId: step.id };
    const startTime = Date.now();

    this.emitEvent('step:started', context.sessionId, context.chainId, step.id, { input });

    try {
      // Apply transform if provided
      let transformedInput = input;
      if (step.transform) {
        transformedInput = step.transform(input, stepContext);
      }

      // Build messages
      const messages: LLMMessage[] = [];
      if (step.systemPrompt) {
        messages.push({ role: 'system', content: step.systemPrompt });
      }
      messages.push({ role: 'user', content: transformedInput });

      // Execute with routing
      const request: LLMRequest = {
        messages,
        model: step.model,
        maxTokens: 4096,
      };

      const routingResult = await this.fallbackRouter.route(request, stepContext);

      if (!routingResult.success || !routingResult.response) {
        // Try fallback if defined
        if (step.fallback) {
          this.emitEvent('step:fallback', context.sessionId, context.chainId, step.id, {
            originalError: routingResult.error,
          });
          return this.executeStep(step.fallback, input, context);
        }

        throw new Error(routingResult.error ?? 'Step execution failed');
      }

      const response = routingResult.response;
      const latencyMs = Date.now() - startTime;

      // Validate output if validator provided
      if (step.validate) {
        const validation = step.validate(response.content, stepContext);
        if (!validation.valid) {
          throw new Error(`Validation failed: ${validation.issues.map((i) => i.message).join(', ')}`);
        }
      }

      // Score for hallucination
      const hallucinationScore = await this.hallucinationScorer.score(
        response,
        stepContext,
        transformedInput,
      );

      const result: StepResult = {
        stepId: step.id,
        stepName: step.name,
        provider: response.provider,
        model: response.model,
        success: true,
        output: response.content,
        latencyMs,
        costUSD: response.usage.estimatedCostUSD,
        tokens: response.usage,
        retries: routingResult.totalAttempts - 1,
        usedFallback: routingResult.fallbacksUsed.length > 0,
        hallucinationScore,
      };

      this.emitEvent('step:completed', context.sessionId, context.chainId, step.id, { result });
      return result;

    } catch (error) {
      const latencyMs = Date.now() - startTime;

      const result: StepResult = {
        stepId: step.id,
        stepName: step.name,
        provider: step.provider,
        model: step.model ?? this.config.defaultModel!,
        success: false,
        output: '',
        latencyMs,
        costUSD: 0,
        tokens: { promptTokens: 0, completionTokens: 0, totalTokens: 0, estimatedCostUSD: 0 },
        error: (error as Error).message,
        retries: 0,
        usedFallback: false,
      };

      this.emitEvent('step:failed', context.sessionId, context.chainId, step.id, {
        error: (error as Error).message,
      });

      return result;
    }
  }

  private estimateRequestCost(request: LLMRequest): number {
    const totalChars = request.messages.reduce((sum, m) => sum + m.content.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    return (estimatedTokens / 1000) * 0.01; // Rough estimate
  }

  private emitEvent(
    event: OrchestratorEvent,
    sessionId: string,
    chainId?: string,
    stepId?: string,
    data: Record<string, unknown> = {},
  ): void {
    const payload: OrchestratorEventPayload = {
      event,
      timestamp: new Date(),
      sessionId,
      chainId,
      stepId,
      data,
    };
    this.emit(event, payload);
    this.emit('event', payload);
  }

  private setupEventForwarding(): void {
    // Forward circuit breaker events
    this.fallbackRouter.on('routing:failure', (data) => {
      this.emit('routing:failure', data);
    });

    this.fallbackRouter.on('routing:success', (data) => {
      this.emit('routing:success', data);
    });

    // Forward governance events
    this.governanceEngine.on('governance:violation', (data) => {
      this.emit('governance:violation', data);
    });

    // Forward hallucination events
    this.hallucinationScorer.on('hallucination:detected', (data) => {
      this.emit('hallucination:detected', data);
    });

    // Forward state manager events
    this.stateManager.on('session:created', (data) => {
      this.emit('session:created', data);
    });
  }
}

// ============================================================================
// Error Classes
// ============================================================================

export class OrchestratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OrchestratorError';
  }
}

export class GovernanceError extends Error {
  constructor(
    message: string,
    public violations: GovernanceViolation[],
  ) {
    super(message);
    this.name = 'GovernanceError';
  }
}

export class BudgetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BudgetError';
  }
}
