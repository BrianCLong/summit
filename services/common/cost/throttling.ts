/**
 * Cost Guardrails & Auto-Throttling
 * Sprint 27E: Model cost management with graceful degradation
 */

import EventEmitter from 'events';

export interface CostBudget {
  period: 'minute' | 'hour' | 'day' | 'month';
  limit: number; // in dollars
  current: number;
  resetTime: Date;
}

export interface ThrottleConfig {
  enabled: boolean;
  softLimit: number; // 0.0 - 1.0 (percentage of budget)
  hardLimit: number; // 0.0 - 1.0 (percentage of budget)
  gracefulDegradation: boolean;
  circuitBreakerThreshold: number;
}

export interface ModelCosts {
  [model: string]: {
    inputTokenCost: number; // per 1K tokens
    outputTokenCost: number; // per 1K tokens
    requestCost: number; // per request
  };
}

export interface UsageMetrics {
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  timestamp: Date;
}

export class CostGuardrails extends EventEmitter {
  private budgets = new Map<string, CostBudget>();
  private usage = new Map<string, UsageMetrics[]>();
  private circuitBreakers = new Map<
    string,
    {
      failures: number;
      lastFailure: Date;
      state: 'closed' | 'open' | 'half-open';
    }
  >();

  constructor(
    private throttleConfig: ThrottleConfig,
    private modelCosts: ModelCosts,
  ) {
    super();
    this.startBudgetResetScheduler();
  }

  /**
   * Set budget for a specific period
   */
  setBudget(period: CostBudget['period'], limit: number): void {
    const resetTime = this.calculateResetTime(period);

    this.budgets.set(period, {
      period,
      limit,
      current: 0,
      resetTime,
    });

    this.emit('budget_set', { period, limit, resetTime });
  }

  /**
   * Check if request should be allowed based on cost
   */
  async checkRequest(
    model: string,
    estimatedInputTokens: number,
    estimatedOutputTokens: number = 0,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    estimatedCost: number;
    budgetStatus: Record<
      string,
      { used: number; remaining: number; percentage: number }
    >;
  }> {
    const estimatedCost = this.calculateCost(
      model,
      estimatedInputTokens,
      estimatedOutputTokens,
    );
    const budgetStatus = this.getBudgetStatus();

    // Check circuit breaker
    const circuitBreaker = this.circuitBreakers.get(model);
    if (circuitBreaker?.state === 'open') {
      const timeSinceFailure =
        Date.now() - circuitBreaker.lastFailure.getTime();
      if (timeSinceFailure < 60000) {
        // 1 minute cooldown
        return {
          allowed: false,
          reason: 'Circuit breaker open - model temporarily unavailable',
          estimatedCost,
          budgetStatus,
        };
      } else {
        // Transition to half-open
        circuitBreaker.state = 'half-open';
      }
    }

    // Check hard limits
    for (const [period, budget] of this.budgets.entries()) {
      const projectedCost = budget.current + estimatedCost;
      const hardLimitThreshold = budget.limit * this.throttleConfig.hardLimit;

      if (projectedCost > hardLimitThreshold) {
        this.emit('hard_limit_exceeded', {
          period,
          current: budget.current,
          projected: projectedCost,
          limit: budget.limit,
          model,
        });

        return {
          allowed: false,
          reason: `Hard limit exceeded for ${period} budget`,
          estimatedCost,
          budgetStatus,
        };
      }
    }

    // Check soft limits and apply throttling
    const throttleDecision = this.shouldThrottle(estimatedCost);
    if (throttleDecision.throttle) {
      this.emit('soft_limit_warning', {
        estimatedCost,
        budgetStatus,
        throttleReason: throttleDecision.reason,
      });

      // Apply graceful degradation if configured
      if (this.throttleConfig.gracefulDegradation) {
        return {
          allowed: true,
          reason: `Throttled - ${throttleDecision.reason}`,
          estimatedCost: estimatedCost * 0.5, // Use cheaper alternatives
          budgetStatus,
        };
      }

      return {
        allowed: false,
        reason: throttleDecision.reason,
        estimatedCost,
        budgetStatus,
      };
    }

    return {
      allowed: true,
      estimatedCost,
      budgetStatus,
    };
  }

  /**
   * Record actual usage after request completion
   */
  recordUsage(
    model: string,
    actualInputTokens: number,
    actualOutputTokens: number,
    success: boolean,
  ): void {
    const actualCost = this.calculateCost(
      model,
      actualInputTokens,
      actualOutputTokens,
    );

    // Update budgets
    for (const budget of this.budgets.values()) {
      budget.current += actualCost;
    }

    // Record usage metrics
    const usage: UsageMetrics = {
      requests: 1,
      inputTokens: actualInputTokens,
      outputTokens: actualOutputTokens,
      cost: actualCost,
      timestamp: new Date(),
    };

    if (!this.usage.has(model)) {
      this.usage.set(model, []);
    }

    this.usage.get(model)!.push(usage);

    // Update circuit breaker
    this.updateCircuitBreaker(model, success);

    // Cleanup old usage data (keep last 24 hours)
    this.cleanupOldUsage();

    this.emit('usage_recorded', {
      model,
      usage,
      budgetStatus: this.getBudgetStatus(),
    });
  }

  /**
   * Get current budget status
   */
  getBudgetStatus(): Record<
    string,
    { used: number; remaining: number; percentage: number }
  > {
    const status: Record<string, any> = {};

    for (const [period, budget] of this.budgets.entries()) {
      status[period] = {
        used: budget.current,
        remaining: budget.limit - budget.current,
        percentage: (budget.current / budget.limit) * 100,
      };
    }

    return status;
  }

  /**
   * Get usage statistics
   */
  getUsageStats(
    model?: string,
    hours = 24,
  ): {
    totalRequests: number;
    totalCost: number;
    averageCostPerRequest: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    costByModel: Record<string, number>;
  } {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let totalRequests = 0;
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const costByModel: Record<string, number> = {};

    const modelsToCheck = model ? [model] : Array.from(this.usage.keys());

    for (const modelName of modelsToCheck) {
      const modelUsage = this.usage.get(modelName) || [];
      const recentUsage = modelUsage.filter((u) => u.timestamp > cutoff);

      costByModel[modelName] = 0;

      for (const usage of recentUsage) {
        totalRequests += usage.requests;
        totalCost += usage.cost;
        totalInputTokens += usage.inputTokens;
        totalOutputTokens += usage.outputTokens;
        costByModel[modelName] += usage.cost;
      }
    }

    return {
      totalRequests,
      totalCost,
      averageCostPerRequest: totalRequests > 0 ? totalCost / totalRequests : 0,
      totalInputTokens,
      totalOutputTokens,
      costByModel,
    };
  }

  /**
   * Force reset budget
   */
  resetBudget(period: CostBudget['period']): void {
    const budget = this.budgets.get(period);
    if (budget) {
      budget.current = 0;
      budget.resetTime = this.calculateResetTime(period);
      this.emit('budget_reset', { period, resetTime: budget.resetTime });
    }
  }

  /**
   * Emergency stop - disable all model usage
   */
  emergencyStop(reason: string): void {
    this.throttleConfig.enabled = false;

    // Open all circuit breakers
    for (const model of this.circuitBreakers.keys()) {
      this.circuitBreakers.set(model, {
        failures: this.throttleConfig.circuitBreakerThreshold + 1,
        lastFailure: new Date(),
        state: 'open',
      });
    }

    this.emit('emergency_stop', { reason, timestamp: new Date() });
  }

  /**
   * Resume normal operations
   */
  resume(): void {
    this.throttleConfig.enabled = true;
    this.circuitBreakers.clear();
    this.emit('operations_resumed', { timestamp: new Date() });
  }

  private calculateCost(
    model: string,
    inputTokens: number,
    outputTokens: number,
  ): number {
    const costs = this.modelCosts[model];
    if (!costs) {
      console.warn(`No cost data for model: ${model}`);
      return 0;
    }

    const inputCost = (inputTokens / 1000) * costs.inputTokenCost;
    const outputCost = (outputTokens / 1000) * costs.outputTokenCost;
    const requestCost = costs.requestCost;

    return inputCost + outputCost + requestCost;
  }

  private shouldThrottle(estimatedCost: number): {
    throttle: boolean;
    reason?: string;
  } {
    if (!this.throttleConfig.enabled) {
      return { throttle: false };
    }

    for (const [period, budget] of this.budgets.entries()) {
      const projectedCost = budget.current + estimatedCost;
      const softLimitThreshold = budget.limit * this.throttleConfig.softLimit;

      if (projectedCost > softLimitThreshold) {
        const percentageUsed = (projectedCost / budget.limit) * 100;
        return {
          throttle: true,
          reason: `Soft limit exceeded for ${period} budget (${percentageUsed.toFixed(1)}% used)`,
        };
      }
    }

    return { throttle: false };
  }

  private updateCircuitBreaker(model: string, success: boolean): void {
    if (!this.circuitBreakers.has(model)) {
      this.circuitBreakers.set(model, {
        failures: 0,
        lastFailure: new Date(0),
        state: 'closed',
      });
    }

    const circuitBreaker = this.circuitBreakers.get(model)!;

    if (success) {
      // Reset failures on success
      if (circuitBreaker.state === 'half-open') {
        circuitBreaker.state = 'closed';
        circuitBreaker.failures = 0;
      }
    } else {
      circuitBreaker.failures++;
      circuitBreaker.lastFailure = new Date();

      if (
        circuitBreaker.failures >= this.throttleConfig.circuitBreakerThreshold
      ) {
        circuitBreaker.state = 'open';
        this.emit('circuit_breaker_opened', {
          model,
          failures: circuitBreaker.failures,
          timestamp: circuitBreaker.lastFailure,
        });
      }
    }
  }

  private calculateResetTime(period: CostBudget['period']): Date {
    const now = new Date();

    switch (period) {
      case 'minute':
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours(),
          now.getMinutes() + 1,
        );
      case 'hour':
        return new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          now.getHours() + 1,
        );
      case 'day':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'month':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 60000); // Default to 1 minute
    }
  }

  private startBudgetResetScheduler(): void {
    setInterval(() => {
      const now = new Date();

      for (const [period, budget] of this.budgets.entries()) {
        if (now >= budget.resetTime) {
          budget.current = 0;
          budget.resetTime = this.calculateResetTime(period);
          this.emit('budget_auto_reset', {
            period,
            resetTime: budget.resetTime,
          });
        }
      }
    }, 60000); // Check every minute
  }

  private cleanupOldUsage(): void {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    for (const [model, usageArray] of this.usage.entries()) {
      const filteredUsage = usageArray.filter((u) => u.timestamp > cutoff);
      this.usage.set(model, filteredUsage);
    }
  }
}

// Default model costs (example values)
export const DEFAULT_MODEL_COSTS: ModelCosts = {
  'gpt-4': {
    inputTokenCost: 0.03, // $0.03 per 1K input tokens
    outputTokenCost: 0.06, // $0.06 per 1K output tokens
    requestCost: 0.001, // $0.001 per request
  },
  'gpt-3.5-turbo': {
    inputTokenCost: 0.0015,
    outputTokenCost: 0.002,
    requestCost: 0.0005,
  },
  'claude-3-sonnet': {
    inputTokenCost: 0.003,
    outputTokenCost: 0.015,
    requestCost: 0.001,
  },
};

// Default throttle configuration
export const DEFAULT_THROTTLE_CONFIG: ThrottleConfig = {
  enabled: true,
  softLimit: 0.8, // 80% of budget
  hardLimit: 0.95, // 95% of budget
  gracefulDegradation: true,
  circuitBreakerThreshold: 5, // 5 consecutive failures
};
