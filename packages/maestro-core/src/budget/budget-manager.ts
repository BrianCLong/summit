/**
 * Budget Manager
 * Enforces spending limits and circuit breakers for workflow executions
 */

import { EventEmitter } from 'events';

export interface BudgetLimits {
  max_cost_usd?: number;
  max_duration_ms?: number;
  max_steps?: number;
  max_llm_tokens?: number;
  max_api_calls?: number;
}

export interface BudgetUsage {
  cost_usd: number;
  duration_ms: number;
  steps_completed: number;
  llm_tokens_used: number;
  api_calls_made: number;
  updated_at: Date;
}

export interface BudgetConfig {
  tenant_id: string;
  run_id?: string;
  limits: BudgetLimits;
  soft_limit_threshold: number; // Percentage (0.8 = 80%)
  hard_limit_action: 'stop' | 'alert' | 'continue';
  alert_webhooks?: string[];
}

export interface BudgetAlert {
  type: 'soft_limit' | 'hard_limit' | 'rate_spike';
  tenant_id: string;
  run_id?: string;
  metric: string;
  current_usage: number;
  limit: number;
  percentage: number;
  message: string;
  timestamp: Date;
}

export interface CircuitBreakerConfig {
  failure_threshold: number; // Number of failures to trip breaker
  recovery_timeout_ms: number; // Time to wait before attempting recovery
  rate_spike_threshold: number; // Percentage increase to trigger spike detection
  lookback_window_ms: number; // Window for calculating rates
}

export class BudgetManager extends EventEmitter {
  private budgets = new Map<string, BudgetConfig>();
  private usage = new Map<string, BudgetUsage>();
  private circuitBreakers = new Map<
    string,
    {
      state: 'closed' | 'open' | 'half-open';
      failures: number;
      last_failure: Date;
      config: CircuitBreakerConfig;
    }
  >();

  private defaultCircuitBreakerConfig: CircuitBreakerConfig = {
    failure_threshold: 5,
    recovery_timeout_ms: 60000, // 1 minute
    rate_spike_threshold: 200, // 200% spike
    lookback_window_ms: 300000, // 5 minutes
  };

  constructor() {
    super();
    this.startMonitoringLoop();
  }

  setBudget(config: BudgetConfig): void {
    const key = this.getBudgetKey(config.tenant_id, config.run_id);
    this.budgets.set(key, config);

    // Initialize usage tracking
    if (!this.usage.has(key)) {
      this.usage.set(key, {
        cost_usd: 0,
        duration_ms: 0,
        steps_completed: 0,
        llm_tokens_used: 0,
        api_calls_made: 0,
        updated_at: new Date(),
      });
    }

    this.emit('budget:set', {
      tenant_id: config.tenant_id,
      run_id: config.run_id,
      config,
    });
  }

  async checkBudget(
    tenant_id: string,
    run_id?: string,
    proposed_usage?: Partial<BudgetUsage>,
  ): Promise<{
    allowed: boolean;
    reason?: string;
    current_usage: BudgetUsage;
    limits: BudgetLimits;
  }> {
    const key = this.getBudgetKey(tenant_id, run_id);
    const budget = this.budgets.get(key);
    const current_usage = this.usage.get(key);

    if (!budget || !current_usage) {
      return {
        allowed: true,
        reason: 'No budget configured',
        current_usage: current_usage || this.getEmptyUsage(),
        limits: {},
      };
    }

    // Calculate projected usage if proposed usage is provided
    const projected_usage = proposed_usage
      ? {
          cost_usd: current_usage.cost_usd + (proposed_usage.cost_usd || 0),
          duration_ms:
            current_usage.duration_ms + (proposed_usage.duration_ms || 0),
          steps_completed:
            current_usage.steps_completed +
            (proposed_usage.steps_completed || 0),
          llm_tokens_used:
            current_usage.llm_tokens_used +
            (proposed_usage.llm_tokens_used || 0),
          api_calls_made:
            current_usage.api_calls_made + (proposed_usage.api_calls_made || 0),
          updated_at: new Date(),
        }
      : current_usage;

    // Check each limit
    const violations = this.checkLimitViolations(
      projected_usage,
      budget.limits,
    );

    if (violations.length > 0) {
      const violation = violations[0]; // Report first violation

      // Check if this is a hard limit violation
      const isHardLimit = this.isHardLimitViolation(
        projected_usage,
        current_usage,
        budget,
      );

      if (isHardLimit && budget.hard_limit_action === 'stop') {
        this.emitBudgetAlert({
          type: 'hard_limit',
          tenant_id,
          run_id,
          metric: violation.metric,
          current_usage: violation.current,
          limit: violation.limit,
          percentage: (violation.current / violation.limit) * 100,
          message: `Hard limit exceeded for ${violation.metric}: ${violation.current} >= ${violation.limit}`,
          timestamp: new Date(),
        });

        return {
          allowed: false,
          reason: `Budget hard limit exceeded for ${violation.metric}: ${violation.current} >= ${violation.limit}`,
          current_usage,
          limits: budget.limits,
        };
      }

      // Check for soft limit warning
      const percentage = (violation.current / violation.limit) * 100;
      if (percentage >= budget.soft_limit_threshold * 100) {
        this.emitBudgetAlert({
          type: 'soft_limit',
          tenant_id,
          run_id,
          metric: violation.metric,
          current_usage: violation.current,
          limit: violation.limit,
          percentage,
          message: `Soft limit threshold reached for ${violation.metric}: ${percentage.toFixed(1)}% of ${violation.limit}`,
          timestamp: new Date(),
        });
      }
    }

    return {
      allowed: true,
      current_usage,
      limits: budget.limits,
    };
  }

  updateUsage(
    tenant_id: string,
    run_id: string | undefined,
    usage_delta: Partial<BudgetUsage>,
  ): void {
    const key = this.getBudgetKey(tenant_id, run_id);
    const current = this.usage.get(key) || this.getEmptyUsage();

    const updated: BudgetUsage = {
      cost_usd: current.cost_usd + (usage_delta.cost_usd || 0),
      duration_ms: current.duration_ms + (usage_delta.duration_ms || 0),
      steps_completed:
        current.steps_completed + (usage_delta.steps_completed || 0),
      llm_tokens_used:
        current.llm_tokens_used + (usage_delta.llm_tokens_used || 0),
      api_calls_made:
        current.api_calls_made + (usage_delta.api_calls_made || 0),
      updated_at: new Date(),
    };

    this.usage.set(key, updated);

    // Check for rate spikes
    this.checkRateSpikes(tenant_id, run_id, usage_delta);

    this.emit('budget:usage_updated', {
      tenant_id,
      run_id,
      usage: updated,
      delta: usage_delta,
    });
  }

  getBudgetUsage(tenant_id: string, run_id?: string): BudgetUsage | null {
    const key = this.getBudgetKey(tenant_id, run_id);
    return this.usage.get(key) || null;
  }

  getAllTenantUsage(
    tenant_id: string,
  ): Array<{ run_id?: string; usage: BudgetUsage }> {
    const results: Array<{ run_id?: string; usage: BudgetUsage }> = [];

    for (const [key, usage] of this.usage.entries()) {
      if (key.startsWith(`${tenant_id}:`)) {
        const run_id = key.split(':')[1] || undefined;
        results.push({ run_id, usage });
      }
    }

    return results;
  }

  setCircuitBreaker(
    tenant_id: string,
    config: Partial<CircuitBreakerConfig> = {},
  ): void {
    this.circuitBreakers.set(tenant_id, {
      state: 'closed',
      failures: 0,
      last_failure: new Date(),
      config: { ...this.defaultCircuitBreakerConfig, ...config },
    });
  }

  checkCircuitBreaker(tenant_id: string): {
    allowed: boolean;
    reason?: string;
    state: string;
  } {
    const breaker = this.circuitBreakers.get(tenant_id);

    if (!breaker) {
      return { allowed: true, state: 'none' };
    }

    const now = Date.now();
    const timeSinceFailure = now - breaker.last_failure.getTime();

    switch (breaker.state) {
      case 'closed':
        return { allowed: true, state: 'closed' };

      case 'open':
        if (timeSinceFailure >= breaker.config.recovery_timeout_ms) {
          // Transition to half-open
          breaker.state = 'half-open';
          this.emit('circuit_breaker:half_open', { tenant_id });
          return { allowed: true, state: 'half-open' };
        }
        return {
          allowed: false,
          reason: `Circuit breaker open for ${tenant_id}`,
          state: 'open',
        };

      case 'half-open':
        return { allowed: true, state: 'half-open' };

      default:
        return { allowed: true, state: 'unknown' };
    }
  }

  recordFailure(tenant_id: string, error: Error): void {
    const breaker = this.circuitBreakers.get(tenant_id);

    if (!breaker) {
      return; // No circuit breaker configured
    }

    breaker.failures++;
    breaker.last_failure = new Date();

    if (breaker.state === 'half-open') {
      // Failure during half-open, go back to open
      breaker.state = 'open';
      this.emit('circuit_breaker:opened', { tenant_id, error: error.message });
    } else if (
      breaker.failures >= breaker.config.failure_threshold &&
      breaker.state === 'closed'
    ) {
      // Trip the breaker
      breaker.state = 'open';
      this.emit('circuit_breaker:tripped', {
        tenant_id,
        failures: breaker.failures,
        error: error.message,
      });
    }
  }

  recordSuccess(tenant_id: string): void {
    const breaker = this.circuitBreakers.get(tenant_id);

    if (!breaker) {
      return;
    }

    if (breaker.state === 'half-open') {
      // Success during half-open, close the breaker
      breaker.state = 'closed';
      breaker.failures = 0;
      this.emit('circuit_breaker:closed', { tenant_id });
    }
  }

  clearBudget(tenant_id: string, run_id?: string): void {
    const key = this.getBudgetKey(tenant_id, run_id);
    this.budgets.delete(key);
    this.usage.delete(key);

    this.emit('budget:cleared', { tenant_id, run_id });
  }

  private getBudgetKey(tenant_id: string, run_id?: string): string {
    return `${tenant_id}:${run_id || 'tenant'}`;
  }

  private getEmptyUsage(): BudgetUsage {
    return {
      cost_usd: 0,
      duration_ms: 0,
      steps_completed: 0,
      llm_tokens_used: 0,
      api_calls_made: 0,
      updated_at: new Date(),
    };
  }

  private checkLimitViolations(
    usage: BudgetUsage,
    limits: BudgetLimits,
  ): Array<{
    metric: string;
    current: number;
    limit: number;
  }> {
    const violations = [];

    if (limits.max_cost_usd && usage.cost_usd >= limits.max_cost_usd) {
      violations.push({
        metric: 'cost_usd',
        current: usage.cost_usd,
        limit: limits.max_cost_usd,
      });
    }

    if (limits.max_duration_ms && usage.duration_ms >= limits.max_duration_ms) {
      violations.push({
        metric: 'duration_ms',
        current: usage.duration_ms,
        limit: limits.max_duration_ms,
      });
    }

    if (limits.max_steps && usage.steps_completed >= limits.max_steps) {
      violations.push({
        metric: 'steps',
        current: usage.steps_completed,
        limit: limits.max_steps,
      });
    }

    if (
      limits.max_llm_tokens &&
      usage.llm_tokens_used >= limits.max_llm_tokens
    ) {
      violations.push({
        metric: 'llm_tokens',
        current: usage.llm_tokens_used,
        limit: limits.max_llm_tokens,
      });
    }

    if (limits.max_api_calls && usage.api_calls_made >= limits.max_api_calls) {
      violations.push({
        metric: 'api_calls',
        current: usage.api_calls_made,
        limit: limits.max_api_calls,
      });
    }

    return violations;
  }

  private isHardLimitViolation(
    projected: BudgetUsage,
    current: BudgetUsage,
    budget: BudgetConfig,
  ): boolean {
    // A hard limit violation is when we exceed 100% of any limit
    const violations = this.checkLimitViolations(projected, budget.limits);
    return violations.length > 0;
  }

  private checkRateSpikes(
    tenant_id: string,
    run_id: string | undefined,
    delta: Partial<BudgetUsage>,
  ): void {
    const breaker = this.circuitBreakers.get(tenant_id);

    if (!breaker || !delta.cost_usd || delta.cost_usd === 0) {
      return;
    }

    // Simple rate spike detection based on cost increase
    const key = this.getBudgetKey(tenant_id, run_id);
    const budget = this.budgets.get(key);

    if (!budget || !budget.limits.max_cost_usd) {
      return;
    }

    // If this single delta is more than 10% of total budget, consider it a spike
    const spikeThreshold = budget.limits.max_cost_usd * 0.1;

    if (delta.cost_usd > spikeThreshold) {
      this.emitBudgetAlert({
        type: 'rate_spike',
        tenant_id,
        run_id,
        metric: 'cost_usd_rate',
        current_usage: delta.cost_usd,
        limit: spikeThreshold,
        percentage: (delta.cost_usd / spikeThreshold) * 100,
        message: `Cost rate spike detected: $${delta.cost_usd} in single operation (threshold: $${spikeThreshold})`,
        timestamp: new Date(),
      });
    }
  }

  private emitBudgetAlert(alert: BudgetAlert): void {
    this.emit('budget:alert', alert);

    // Send to configured webhooks
    const key = this.getBudgetKey(alert.tenant_id, alert.run_id);
    const budget = this.budgets.get(key);

    if (budget?.alert_webhooks) {
      for (const webhook of budget.alert_webhooks) {
        this.sendWebhookAlert(webhook, alert).catch(console.error);
      }
    }
  }

  private async sendWebhookAlert(
    webhook: string,
    alert: BudgetAlert,
  ): Promise<void> {
    try {
      const axios = require('axios');
      await axios.post(webhook, alert, {
        timeout: 5000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Maestro-Budget-Manager/1.0',
        },
      });
    } catch (error) {
      console.error(
        `Failed to send budget alert webhook to ${webhook}:`,
        error,
      );
    }
  }

  private startMonitoringLoop(): void {
    // Monitor budget usage and circuit breaker states every minute
    setInterval(() => {
      this.emit('budget:monitoring_tick', {
        budgets: this.budgets.size,
        active_usage: this.usage.size,
        circuit_breakers: this.circuitBreakers.size,
      });
    }, 60000);
  }
}
