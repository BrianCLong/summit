// server/src/conductor/premium-routing/premium-model-router.ts

import logger from '../../config/logger.js';

export interface PremiumModel {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'azure' | 'cohere' | 'groq';
  modelType: 'chat' | 'completion' | 'embedding' | 'reasoning' | 'code' | 'vision';
  tier: 'premium' | 'enterprise' | 'flagship';
  capabilities: string[];
  costPerToken: number;
  maxTokens: number;
  contextWindow: number;
  apiEndpoint: string;
  qualityScore: number;
  speedScore: number;
  reliabilityScore: number;
  specializations: string[];
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    concurrent: number;
  };
}

export interface RoutingRequest {
  query: string;
  context: {
    userId: string;
    tenantId: string;
    taskType: string;
    complexity: number;
    budget: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    qualityRequirement: number;
    expectedOutputLength: number;
  };
  constraints: {
    maxCost?: number;
    maxLatency?: number;
    requiredCapabilities?: string[];
    preferredProviders?: string[];
    excludedModels?: string[];
  };
}

export interface RoutingDecision {
  selectedModel: PremiumModel;
  confidence: number;
  reasoning: string;
  expectedCost: number;
  expectedLatency: number;
  fallbackModels: PremiumModel[];
  routingStrategy: string;
  optimizationTarget: 'cost' | 'quality' | 'speed' | 'balanced';
}

export class PremiumModelRouter {
  private availableModels: PremiumModel[];
  private operatingMode: 'advanced' | 'basic';
  private performanceHistory: Map<string, { successRate: number; samples: number }>;

  constructor() {
    this.availableModels = this.loadDefaultModels();
    this.operatingMode = this.determineMode();
    this.performanceHistory = new Map();
  }

  /**
   * Initialize external clients when available.
   * Fail-open into basic mode when configuration is missing or clients are unreachable.
   */
  async connect(): Promise<void> {
    if (this.operatingMode !== 'basic') {
      logger.info('PremiumModelRouter initialized in advanced mode (in-memory only for now)');
    } else {
      logger.warn('PremiumModelRouter operating in basic mode (no external stores configured)');
    }
  }

  /**
   * Primary routing entrypoint used by orchestration-service.ts.
   * Always returns a safe decision; errors are converted into a deterministic fallback.
   */
  async routeToOptimalModel(request: RoutingRequest): Promise<RoutingDecision> {
    try {
      if (this.operatingMode === 'basic') {
        const fallback = this.availableModels[0];
        return {
          selectedModel: fallback,
          confidence: 0.5,
          reasoning: 'Basic mode: selected default premium model due to missing configuration.',
          expectedCost: this.estimateCost(fallback, request),
          expectedLatency: this.estimateLatency(fallback, request),
          fallbackModels: this.availableModels.slice(1),
          routingStrategy: 'basic-default',
          optimizationTarget: this.resolveOptimizationTarget(request),
        };
      }

      const candidates = this.filterCandidates(request);
      const ranked = this.rankCandidates(candidates, request);
      const top = ranked[0];
      const selection = top?.model ?? this.availableModels[0];
      this.recordMetrics(selection, request);

      return {
        selectedModel: selection,
        confidence: top?.score ?? 0.5,
        reasoning: this.operatingMode === 'advanced'
          ? 'Selected using heuristic scoring across quality, speed, and cost.'
          : 'Basic mode: selected default premium model due to missing configuration.',
        expectedCost: this.estimateCost(selection, request),
        expectedLatency: this.estimateLatency(selection, request),
        fallbackModels: ranked.slice(1, 3).map((r) => r.model),
        routingStrategy: this.operatingMode === 'advanced' ? 'weighted-score' : 'basic-default',
        optimizationTarget: this.resolveOptimizationTarget(request),
      };
    } catch (error) {
      const fallback = this.availableModels[0];
      logger.warn('Premium routing fell back to default model', { error: (error as Error).message });
      return {
        selectedModel: fallback,
        confidence: 0.4,
        reasoning: 'Recovered from routing error by returning default premium model.',
        expectedCost: this.estimateCost(fallback, request),
        expectedLatency: this.estimateLatency(fallback, request),
        fallbackModels: this.availableModels.slice(1),
        routingStrategy: 'basic-default',
        optimizationTarget: 'balanced',
      };
    }
  }

  /**
   * Record execution outcomes without throwing. In basic mode this is in-memory only.
   */
  async recordExecutionResult(
    modelId: string,
    taskType: string,
    result: { success: boolean; actualCost?: number; actualLatency?: number; qualityScore?: number },
  ): Promise<void> {
    const key = `${modelId}:${taskType}`;
    const current = this.performanceHistory.get(key) ?? { successRate: 0, samples: 0 };
    const samples = current.samples + 1;
    const successRate = (current.successRate * current.samples + (result.success ? 1 : 0)) / samples;
    this.performanceHistory.set(key, { successRate, samples });

    logger.debug?.('Recorded premium execution result', {
      modelId,
      taskType,
      success: result.success,
    });
  }

  private determineMode(): 'advanced' | 'basic' {
    return process?.env?.DATABASE_URL && process?.env?.REDIS_URL ? 'advanced' : 'basic';
  }

  private loadDefaultModels(): PremiumModel[] {
    return [
      {
        id: 'gpt-4o',
        name: 'GPT-4o',
        provider: 'openai',
        modelType: 'chat',
        tier: 'flagship',
        capabilities: ['reasoning', 'analysis', 'code', 'vision'],
        costPerToken: 0.00002,
        maxTokens: 4096,
        contextWindow: 128000,
        apiEndpoint: 'https://api.openai.com/v1/chat/completions',
        qualityScore: 0.92,
        speedScore: 0.7,
        reliabilityScore: 0.9,
        specializations: ['analysis', 'synthesis'],
        rateLimits: { requestsPerMinute: 100, tokensPerMinute: 120000, concurrent: 5 },
      },
      {
        id: 'claude-3-5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: 'anthropic',
        modelType: 'chat',
        tier: 'premium',
        capabilities: ['reasoning', 'analysis'],
        costPerToken: 0.000015,
        maxTokens: 4096,
        contextWindow: 200000,
        apiEndpoint: 'https://api.anthropic.com/v1/messages',
        qualityScore: 0.9,
        speedScore: 0.75,
        reliabilityScore: 0.92,
        specializations: ['analysis', 'summarization'],
        rateLimits: { requestsPerMinute: 80, tokensPerMinute: 80000, concurrent: 4 },
      },
    ];
  }

  private filterCandidates(request: RoutingRequest): PremiumModel[] {
    return this.availableModels.filter((model) => {
      if (request.constraints.excludedModels?.includes(model.id)) return false;
      if (
        request.constraints.requiredCapabilities &&
        !request.constraints.requiredCapabilities.every((cap) => model.capabilities.includes(cap))
      ) {
        return false;
      }
      if (
        request.constraints.preferredProviders &&
        !request.constraints.preferredProviders.includes(model.provider)
      ) {
        return false;
      }
      const estimatedCost = this.estimateCost(model, request);
      if (request.constraints.maxCost && estimatedCost > request.constraints.maxCost) {
        return false;
      }
      const estimatedTokens = Math.ceil(request.query.length / 4) + request.context.expectedOutputLength;
      return estimatedTokens <= model.contextWindow;
    });
  }

  private rankCandidates(
    models: PremiumModel[],
    request: RoutingRequest,
  ): Array<{ model: PremiumModel; score: number }> {
    if (models.length === 0) {
      return [{ model: this.availableModels[0], score: 0.4 }];
    }

    return models
      .map((model) => {
        const quality = model.qualityScore;
        const speed = model.speedScore;
        const reliability = model.reliabilityScore;
        const cost = 1 / Math.max(this.estimateCost(model, request), 0.00001);
        const urgencyWeight = request.context.urgency === 'critical' ? 0.35 : 0.25;

        const score =
          quality * 0.35 +
          speed * urgencyWeight +
          reliability * 0.2 +
          cost * 0.2;

        return { model, score: Number(score.toFixed(3)) };
      })
      .sort((a, b) => b.score - a.score);
  }

  private estimateCost(model: PremiumModel, request: RoutingRequest): number {
    const estimatedTokens = Math.ceil(request.query.length / 4) + request.context.expectedOutputLength;
    return Number((estimatedTokens * model.costPerToken).toFixed(4));
  }

  private estimateLatency(model: PremiumModel, request: RoutingRequest): number {
    const base = model.speedScore > 0 ? 800 / model.speedScore : 1200;
    const urgencyFactor = request.context.urgency === 'critical' ? 0.8 : 1;
    return Math.round(base * urgencyFactor);
  }

  private resolveOptimizationTarget(request: RoutingRequest): RoutingDecision['optimizationTarget'] {
    if (request.constraints.maxCost && request.constraints.maxCost < request.context.budget * 0.5) {
      return 'cost';
    }
    if (request.context.qualityRequirement > 0.85) {
      return 'quality';
    }
    if (request.context.urgency === 'critical') {
      return 'speed';
    }
    return 'balanced';
  }

  private recordMetrics(model: PremiumModel, request: RoutingRequest): void {
    logger.debug?.('Premium routing metrics', {
      model: model.id,
      tenantId: request.context.tenantId,
      taskType: request.context.taskType,
      mode: this.operatingMode,
    });
  }
}
