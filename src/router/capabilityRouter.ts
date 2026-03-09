import { MaestroMemory } from '../memory';

interface ModelCapability {
  model: string;
  provider: 'openai' | 'anthropic' | 'azure' | 'local';
  capabilities: string[];
  cost: {
    inputTokens: number; // Cost per 1K input tokens
    outputTokens: number; // Cost per 1K output tokens
    minCost: number; // Minimum cost per request
  };
  performance: {
    maxTokens: number;
    avgLatency: number; // milliseconds
    reliability: number; // 0-1 score
    qualityScore: number; // 0-1 score based on evaluations
  };
  limits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    tokensPerMinute: number;
  };
  context: {
    maxContextLength: number;
    supportsCaching: boolean;
    supportsStreaming: boolean;
  };
}

interface RequestContext {
  type:
    | 'code-generation'
    | 'analysis'
    | 'review'
    | 'debugging'
    | 'testing'
    | 'documentation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  complexity: 'simple' | 'moderate' | 'complex' | 'advanced';
  budget: {
    maxCost: number;
    timeLimit: number; // milliseconds
  };
  qualityRequirements: {
    minAccuracy: number; // 0-1
    allowExperimental: boolean;
  };
  context: {
    estimatedTokens: number;
    needsReasoning: boolean;
    requiresCreativity: boolean;
  };
}

interface RoutingResult {
  selectedModel: string;
  reason: string;
  estimatedCost: number;
  estimatedLatency: number;
  fallbackModels: string[];
  cacheHit: boolean;
  confidence: number;
}

export class CapabilityRouter {
  private models: Map<string, ModelCapability>;
  private memory: MaestroMemory;
  private budgetLimits: {
    daily: number;
    perRequest: number;
    currentSpent: number;
  };

  constructor(projectRoot: string = process.cwd()) {
    this.memory = MaestroMemory.getInstance(projectRoot);
    this.models = new Map();
    this.budgetLimits = {
      daily: 50.0, // $50 per day default
      perRequest: 5.0, // $5 per request default
      currentSpent: 0,
    };

    this.initializeModels();
  }

  private initializeModels(): void {
    // GPT-4 Turbo - Premium option
    this.models.set('gpt-4-turbo', {
      model: 'gpt-4-turbo',
      provider: 'openai',
      capabilities: [
        'code-generation',
        'analysis',
        'review',
        'debugging',
        'testing',
        'documentation',
        'reasoning',
        'creativity',
      ],
      cost: {
        inputTokens: 0.01, // $0.01 per 1K tokens
        outputTokens: 0.03, // $0.03 per 1K tokens
        minCost: 0.001,
      },
      performance: {
        maxTokens: 4096,
        avgLatency: 2000,
        reliability: 0.95,
        qualityScore: 0.92,
      },
      limits: {
        requestsPerMinute: 500,
        requestsPerDay: 10000,
        tokensPerMinute: 150000,
      },
      context: {
        maxContextLength: 128000,
        supportsCaching: true,
        supportsStreaming: true,
      },
    });

    // GPT-3.5 Turbo - Balanced option
    this.models.set('gpt-3.5-turbo', {
      model: 'gpt-3.5-turbo',
      provider: 'openai',
      capabilities: ['code-generation', 'analysis', 'documentation', 'testing'],
      cost: {
        inputTokens: 0.0005,
        outputTokens: 0.0015,
        minCost: 0.0001,
      },
      performance: {
        maxTokens: 4096,
        avgLatency: 1200,
        reliability: 0.92,
        qualityScore: 0.85,
      },
      limits: {
        requestsPerMinute: 3500,
        requestsPerDay: 200000,
        tokensPerMinute: 90000,
      },
      context: {
        maxContextLength: 16385,
        supportsCaching: false,
        supportsStreaming: true,
      },
    });

    // Claude 3.5 Sonnet - High quality reasoning
    this.models.set('claude-3-5-sonnet', {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      capabilities: [
        'code-generation',
        'analysis',
        'review',
        'debugging',
        'reasoning',
        'creativity',
        'safety',
      ],
      cost: {
        inputTokens: 0.003,
        outputTokens: 0.015,
        minCost: 0.0005,
      },
      performance: {
        maxTokens: 8192,
        avgLatency: 1800,
        reliability: 0.96,
        qualityScore: 0.94,
      },
      limits: {
        requestsPerMinute: 1000,
        requestsPerDay: 50000,
        tokensPerMinute: 40000,
      },
      context: {
        maxContextLength: 200000,
        supportsCaching: true,
        supportsStreaming: true,
      },
    });

    // Claude 3 Haiku - Fast and cheap
    this.models.set('claude-3-haiku', {
      model: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      capabilities: ['code-generation', 'analysis', 'documentation'],
      cost: {
        inputTokens: 0.00025,
        outputTokens: 0.00125,
        minCost: 0.0001,
      },
      performance: {
        maxTokens: 4096,
        avgLatency: 800,
        reliability: 0.9,
        qualityScore: 0.78,
      },
      limits: {
        requestsPerMinute: 2000,
        requestsPerDay: 100000,
        tokensPerMinute: 100000,
      },
      context: {
        maxContextLength: 200000,
        supportsCaching: true,
        supportsStreaming: true,
      },
    });

    // Local model - Free but limited
    this.models.set('local-7b', {
      model: 'codellama-7b-instruct',
      provider: 'local',
      capabilities: ['code-generation', 'documentation'],
      cost: {
        inputTokens: 0,
        outputTokens: 0,
        minCost: 0,
      },
      performance: {
        maxTokens: 2048,
        avgLatency: 5000,
        reliability: 0.75,
        qualityScore: 0.65,
      },
      limits: {
        requestsPerMinute: 10,
        requestsPerDay: 1000,
        tokensPerMinute: 2000,
      },
      context: {
        maxContextLength: 4096,
        supportsCaching: false,
        supportsStreaming: false,
      },
    });
  }

  async route(request: RequestContext): Promise<RoutingResult> {
    console.log(`🧭 Routing request: ${request.type} (${request.complexity})`);

    // Check cache first
    const cacheKey = this.generateCacheKey(request);
    const cached = await this.memory.cache.get(cacheKey);

    if (cached) {
      return {
        selectedModel: cached.model,
        reason: 'Cache hit - using previously successful model',
        estimatedCost: 0,
        estimatedLatency: 0,
        fallbackModels: [],
        cacheHit: true,
        confidence: 0.95,
      };
    }

    // Get candidate models
    const candidates = await this.getCandidateModels(request);

    if (candidates.length === 0) {
      throw new Error('No models available for this request type');
    }

    // Score and rank candidates
    const scored = candidates.map((model) => ({
      model,
      score: this.scoreModel(model, request),
      estimatedCost: this.estimateCost(model, request),
      estimatedLatency: this.estimateLatency(model, request),
    }));

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score.total - a.score.total);

    const selected = scored[0];
    const fallbacks = scored.slice(1, 4).map((s) => s.model.model);

    const result: RoutingResult = {
      selectedModel: selected.model.model,
      reason: this.generateReason(selected.model, selected.score, request),
      estimatedCost: selected.estimatedCost,
      estimatedLatency: selected.estimatedLatency,
      fallbackModels: fallbacks,
      cacheHit: false,
      confidence: selected.score.total,
    };

    // Store routing decision for learning
    await this.storeRoutingDecision(request, result);

    return result;
  }

  private async getCandidateModels(
    request: RequestContext,
  ): Promise<ModelCapability[]> {
    const candidates: ModelCapability[] = [];

    for (const model of this.models.values()) {
      // Check if model supports required capabilities
      if (!model.capabilities.includes(request.type)) continue;

      // Check budget constraints
      const estimatedCost = this.estimateCost(model, request);
      if (estimatedCost > request.budget.maxCost) continue;
      if (estimatedCost > this.budgetLimits.perRequest) continue;

      // Check if we have budget remaining
      if (
        this.budgetLimits.currentSpent + estimatedCost >
        this.budgetLimits.daily
      )
        continue;

      // Check context length requirements
      if (request.context.estimatedTokens > model.context.maxContextLength)
        continue;

      // Check quality requirements
      if (
        model.performance.qualityScore < request.qualityRequirements.minAccuracy
      )
        continue;

      // Check if experimental models are allowed
      if (
        !request.qualityRequirements.allowExperimental &&
        model.performance.reliability < 0.9
      )
        continue;

      candidates.push(model);
    }

    return candidates;
  }

  private scoreModel(
    model: ModelCapability,
    request: RequestContext,
  ): {
    cost: number;
    performance: number;
    reliability: number;
    capability: number;
    total: number;
  } {
    const weights = this.getWeights(request);

    // Cost score (lower cost = higher score)
    const estimatedCost = this.estimateCost(model, request);
    const maxBudget = Math.min(
      request.budget.maxCost,
      this.budgetLimits.perRequest,
    );
    const costScore = Math.max(0, 1 - estimatedCost / maxBudget);

    // Performance score
    const estimatedLatency = this.estimateLatency(model, request);
    const timeScore = Math.max(
      0,
      1 - estimatedLatency / request.budget.timeLimit,
    );
    const performanceScore = (timeScore + model.performance.qualityScore) / 2;

    // Reliability score
    const reliabilityScore = model.performance.reliability;

    // Capability match score
    const requiredCapabilities = this.getRequiredCapabilities(request);
    const matchedCapabilities = requiredCapabilities.filter((cap) =>
      model.capabilities.includes(cap),
    ).length;
    const capabilityScore = matchedCapabilities / requiredCapabilities.length;

    const scores = {
      cost: costScore,
      performance: performanceScore,
      reliability: reliabilityScore,
      capability: capabilityScore,
      total: 0,
    };

    // Weighted total
    scores.total =
      scores.cost * weights.cost +
      scores.performance * weights.performance +
      scores.reliability * weights.reliability +
      scores.capability * weights.capability;

    return scores;
  }

  private getWeights(request: RequestContext): {
    cost: number;
    performance: number;
    reliability: number;
    capability: number;
  } {
    // Adjust weights based on request priority and type
    const baseWeights = {
      cost: 0.3,
      performance: 0.3,
      reliability: 0.2,
      capability: 0.2,
    };

    switch (request.priority) {
      case 'critical':
        return {
          cost: 0.1,
          performance: 0.3,
          reliability: 0.4,
          capability: 0.2,
        };
      case 'high':
        return {
          cost: 0.2,
          performance: 0.3,
          reliability: 0.3,
          capability: 0.2,
        };
      case 'low':
        return {
          cost: 0.5,
          performance: 0.2,
          reliability: 0.1,
          capability: 0.2,
        };
      default:
        return baseWeights;
    }
  }

  private getRequiredCapabilities(request: RequestContext): string[] {
    const capabilities = [request.type];

    if (request.context.needsReasoning) {
      capabilities.push('reasoning');
    }

    if (request.context.requiresCreativity) {
      capabilities.push('creativity');
    }

    return capabilities;
  }

  private estimateCost(
    model: ModelCapability,
    request: RequestContext,
  ): number {
    const inputTokens = request.context.estimatedTokens * 0.7; // 70% input
    const outputTokens = request.context.estimatedTokens * 0.3; // 30% output

    const inputCost = (inputTokens / 1000) * model.cost.inputTokens;
    const outputCost = (outputTokens / 1000) * model.cost.outputTokens;

    return Math.max(model.cost.minCost, inputCost + outputCost);
  }

  private estimateLatency(
    model: ModelCapability,
    request: RequestContext,
  ): number {
    const baseLatency = model.performance.avgLatency;

    // Adjust for token count (more tokens = more latency)
    const tokenMultiplier = 1 + (request.context.estimatedTokens / 10000) * 0.5;

    // Adjust for complexity
    const complexityMultiplier = {
      simple: 1.0,
      moderate: 1.3,
      complex: 1.6,
      advanced: 2.0,
    }[request.complexity];

    return baseLatency * tokenMultiplier * complexityMultiplier;
  }

  private generateReason(
    model: ModelCapability,
    score: any,
    request: RequestContext,
  ): string {
    const reasons: string[] = [];

    if (score.cost > 0.8) {
      reasons.push('cost-effective');
    }

    if (score.performance > 0.8) {
      reasons.push('high performance');
    }

    if (score.reliability > 0.9) {
      reasons.push('reliable');
    }

    if (score.capability === 1.0) {
      reasons.push('perfect capability match');
    }

    const primaryReason =
      reasons.length > 0 ? reasons.join(', ') : 'best available option';

    return `Selected ${model.model} for ${primaryReason} (score: ${score.total.toFixed(2)})`;
  }

  private generateCacheKey(request: RequestContext): string {
    return `route-${request.type}-${request.complexity}-${request.priority}-${request.context.estimatedTokens}`;
  }

  private async storeRoutingDecision(
    request: RequestContext,
    result: RoutingResult,
  ): Promise<void> {
    await this.memory.semantic.store(
      JSON.stringify({
        request: {
          type: request.type,
          complexity: request.complexity,
          priority: request.priority,
        },
        result: {
          selectedModel: result.selectedModel,
          estimatedCost: result.estimatedCost,
          reason: result.reason,
        },
      }),
      'pattern',
      {
        tags: [
          'routing',
          request.type,
          request.complexity,
          result.selectedModel,
        ],
        success: true,
      },
    );
  }

  async recordModelUsage(
    model: string,
    actualCost: number,
    actualLatency: number,
    success: boolean,
    request?: RequestContext,
  ): Promise<void> {
    // Update budget tracking
    this.budgetLimits.currentSpent += actualCost;

    // Record performance for future routing decisions
    const modelInfo = this.models.get(model);
    if (modelInfo && request) {
      // Update model performance metrics (exponential moving average)
      const alpha = 0.1;
      modelInfo.performance.avgLatency =
        (1 - alpha) * modelInfo.performance.avgLatency + alpha * actualLatency;

      if (success) {
        modelInfo.performance.reliability = Math.min(
          1.0,
          (1 - alpha) * modelInfo.performance.reliability + alpha * 1.0,
        );
      } else {
        modelInfo.performance.reliability = Math.max(
          0.0,
          (1 - alpha) * modelInfo.performance.reliability + alpha * 0.0,
        );
      }

      // Store experience in memory
      await this.memory.storeExperience(
        `Used ${model} for ${request.type} task`,
        success ? 'solution' : 'error',
        success,
        {
          model,
          cost: actualCost,
          latency: actualLatency,
          requestType: request.type,
          complexity: request.complexity,
        },
      );
    }
  }

  async getBudgetStatus(): Promise<{
    daily: { limit: number; used: number; remaining: number };
    perRequest: { limit: number };
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    const remaining = this.budgetLimits.daily - this.budgetLimits.currentSpent;
    const usagePercent =
      (this.budgetLimits.currentSpent / this.budgetLimits.daily) * 100;

    if (usagePercent > 80) {
      recommendations.push('High budget usage - consider using cheaper models');
    }

    if (usagePercent > 95) {
      recommendations.push('Budget nearly exhausted - switch to local models');
    }

    if (remaining < this.budgetLimits.perRequest) {
      recommendations.push('Insufficient budget for premium requests');
    }

    return {
      daily: {
        limit: this.budgetLimits.daily,
        used: this.budgetLimits.currentSpent,
        remaining,
      },
      perRequest: {
        limit: this.budgetLimits.perRequest,
      },
      recommendations,
    };
  }

  async updateBudgetLimits(daily?: number, perRequest?: number): Promise<void> {
    if (daily !== undefined) {
      this.budgetLimits.daily = daily;
    }

    if (perRequest !== undefined) {
      this.budgetLimits.perRequest = perRequest;
    }
  }

  async getModelRecommendations(request: RequestContext): Promise<{
    recommended: string[];
    avoided: string[];
    reasons: Record<string, string>;
  }> {
    const candidates = await this.getCandidateModels(request);
    const scored = candidates.map((model) => ({
      model: model.model,
      score: this.scoreModel(model, request),
    }));

    scored.sort((a, b) => b.score.total - a.score.total);

    return {
      recommended: scored.slice(0, 3).map((s) => s.model),
      avoided: Array.from(this.models.keys()).filter(
        (m) => !candidates.find((c) => c.model === m),
      ),
      reasons: scored.reduce(
        (acc, s) => {
          acc[s.model] =
            `Score: ${s.score.total.toFixed(2)} (cost: ${s.score.cost.toFixed(2)}, perf: ${s.score.performance.toFixed(2)})`;
          return acc;
        },
        {} as Record<string, string>,
      ),
    };
  }
}
