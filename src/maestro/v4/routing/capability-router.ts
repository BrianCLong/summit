// Capability Router for Maestro v0.4
// Route tool/model by task complexity & residual budget; emit rationale to telemetry

export interface TaskContext {
  tokens: number;
  risk: number;
  complexity?: 'simple' | 'medium' | 'complex';
  requiredCapabilities?: string[];
}

export interface ModelSpec {
  name: string;
  costPerToken: number;
  maxTokens: number;
  capabilities: string[];
}

export interface RoutingDecision {
  selectedModel: string;
  rationale: string;
  estimatedCost: number;
  budgetRemaining: number;
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgResponseTime: number;
}

export class CapabilityRouter {
  private models: ModelSpec[] = [
    {
      name: 'small',
      costPerToken: 0.0001,
      maxTokens: 8192,
      capabilities: ['basic_analysis', 'simple_fixes', 'lint_checks'],
    },
    {
      name: 'medium',
      costPerToken: 0.0005,
      maxTokens: 32768,
      capabilities: [
        'code_review',
        'complex_analysis',
        'refactoring',
        'test_generation',
      ],
    },
    {
      name: 'large',
      costPerToken: 0.002,
      maxTokens: 128000,
      capabilities: [
        'architectural_review',
        'security_analysis',
        'performance_optimization',
        'complex_refactoring',
      ],
    },
  ];

  private promptCache: Map<string, any> = new Map();
  private cacheStats: CacheStats = {
    hitRate: 0,
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgResponseTime: 0,
  };

  constructor(
    private budgetLimits: { maxUsdPerPR: number; maxPromptTokens: number },
  ) {}

  /**
   * Pick the most appropriate model based on task complexity and remaining budget
   */
  pickModel(context: TaskContext, remainingBudget: number): string {
    // Budget-based downshift logic
    if (remainingBudget < 0.1) {
      return 'small';
    }

    // Risk and complexity-based routing
    if (context.risk > 0.7 || context.tokens > 20000) {
      if (remainingBudget >= this.estimateCost('large', context.tokens)) {
        return 'large';
      }
    }

    if (context.risk > 0.4 || context.tokens > 8000) {
      if (remainingBudget >= this.estimateCost('medium', context.tokens)) {
        return 'medium';
      }
    }

    return 'small';
  }

  /**
   * Make routing decision with detailed rationale
   */
  makeRoutingDecision(
    context: TaskContext,
    remainingBudget: number,
  ): RoutingDecision {
    const selectedModel = this.pickModel(context, remainingBudget);
    const estimatedCost = this.estimateCost(selectedModel, context.tokens);

    let rationale = `Selected ${selectedModel} model. `;

    if (remainingBudget < 0.1) {
      rationale += 'Budget constraint: less than $0.10 remaining. ';
    } else if (context.risk > 0.7) {
      rationale += `High risk (${context.risk}) requires advanced model. `;
    } else if (context.tokens > 20000) {
      rationale += `Large context (${context.tokens} tokens) needs capable model. `;
    } else if (context.risk > 0.4) {
      rationale += `Medium risk (${context.risk}) justifies mid-tier model. `;
    } else {
      rationale += 'Low risk and small context allows cost-optimized model. ';
    }

    if (context.requiredCapabilities) {
      const modelSpec = this.models.find((m) => m.name === selectedModel);
      const missingCaps = context.requiredCapabilities.filter(
        (cap) => !modelSpec?.capabilities.includes(cap),
      );
      if (missingCaps.length > 0) {
        rationale += `Warning: Missing capabilities [${missingCaps.join(', ')}]. `;
      }
    }

    return {
      selectedModel,
      rationale,
      estimatedCost,
      budgetRemaining: remainingBudget - estimatedCost,
    };
  }

  /**
   * Check prompt cache for cached response
   */
  async getCachedResponse(prompt: string, model: string): Promise<any | null> {
    this.cacheStats.totalRequests++;

    const cacheKey = this.generateCacheKey(prompt, model);
    const cached = this.promptCache.get(cacheKey);

    if (cached && !this.isCacheExpired(cached)) {
      this.cacheStats.cacheHits++;
      this.updateCacheStats();
      return cached.response;
    }

    this.cacheStats.cacheMisses++;
    this.updateCacheStats();
    return null;
  }

  /**
   * Cache response for future use
   */
  async cacheResponse(
    prompt: string,
    model: string,
    response: any,
  ): Promise<void> {
    const cacheKey = this.generateCacheKey(prompt, model);
    this.promptCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
      model,
      ttl: 3600000, // 1 hour TTL
    });
  }

  /**
   * Get current cache statistics
   */
  async getCacheStats(): Promise<CacheStats> {
    return { ...this.cacheStats };
  }

  /**
   * Estimate cost for a given model and token count
   */
  private estimateCost(modelName: string, tokens: number): number {
    const model = this.models.find((m) => m.name === modelName);
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }
    return model.costPerToken * tokens;
  }

  /**
   * Generate normalized cache key
   */
  private generateCacheKey(prompt: string, model: string): string {
    // Normalize prompt by removing whitespace variations and common variables
    const normalizedPrompt = prompt
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\$\{[^}]+\}/g, '${VAR}') // Replace template variables
      .replace(/\d{4}-\d{2}-\d{2}/g, 'DATE') // Replace dates
      .replace(/[a-f0-9]{40}/g, 'HASH'); // Replace git hashes

    return `${model}:${this.hashString(normalizedPrompt)}`;
  }

  /**
   * Simple hash function for cache keys
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Check if cached entry is expired
   */
  private isCacheExpired(cached: any): boolean {
    return Date.now() - cached.timestamp > cached.ttl;
  }

  /**
   * Update cache hit rate statistics
   */
  private updateCacheStats(): void {
    if (this.cacheStats.totalRequests > 0) {
      this.cacheStats.hitRate =
        (this.cacheStats.cacheHits / this.cacheStats.totalRequests) * 100;
    }
  }

  /**
   * Clean expired cache entries
   */
  async cleanExpiredCache(): Promise<number> {
    let cleaned = 0;
    for (const [key, cached] of this.promptCache.entries()) {
      if (this.isCacheExpired(cached)) {
        this.promptCache.delete(key);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Get router statistics
   */
  async getStats(): Promise<any> {
    return {
      component: 'CapabilityRouter',
      version: '0.4.0',
      modelsAvailable: this.models.length,
      cacheSize: this.promptCache.size,
      cacheStats: this.cacheStats,
      budgetLimits: this.budgetLimits,
    };
  }

  /**
   * Update budget limits
   */
  updateBudgetLimits(limits: {
    maxUsdPerPR?: number;
    maxPromptTokens?: number;
  }): void {
    if (limits.maxUsdPerPR !== undefined) {
      this.budgetLimits.maxUsdPerPR = limits.maxUsdPerPR;
    }
    if (limits.maxPromptTokens !== undefined) {
      this.budgetLimits.maxPromptTokens = limits.maxPromptTokens;
    }
  }
}
