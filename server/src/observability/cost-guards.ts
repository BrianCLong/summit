/**
 * Cost Monitoring Guards
 * Implements budget tracking, alerts, and automatic throttling
 */

import logger from '../utils/logger.js';
import {
  costBudgetGauge,
  costBudgetUtilization,
  costAccrued,
  costAlertCounter,
} from './metrics-enhanced.js';

// Cost configuration
interface CostConfig {
  enabled: boolean;
  budgets: {
    daily: number; // USD
    monthly: number; // USD
    perTenant: number; // USD per tenant
  };
  alertThresholds: number[]; // Alert at these utilization percentages
  throttleThreshold: number; // Throttle at this utilization percentage
  blockThreshold: number; // Block at this utilization percentage
}

const DEFAULT_CONFIG: CostConfig = {
  enabled: process.env.COST_GUARDS_ENABLED !== 'false',
  budgets: {
    daily: parseFloat(process.env.DAILY_BUDGET_USD || '1000'),
    monthly: parseFloat(process.env.MONTHLY_BUDGET_USD || '25000'),
    perTenant: parseFloat(process.env.PER_TENANT_BUDGET_USD || '500'),
  },
  alertThresholds: [0.5, 0.75, 0.9, 0.95], // 50%, 75%, 90%, 95%
  throttleThreshold: 0.9, // Throttle at 90%
  blockThreshold: 1.0, // Block at 100%
};

// Resource cost rates (USD)
const COST_RATES = {
  // Database costs per query
  postgres_query: 0.0001,
  neo4j_query: 0.0002,
  timescale_query: 0.00015,

  // Compute costs per second
  cpu_second: 0.00001,
  memory_gb_second: 0.000002,

  // Storage costs per GB-month
  s3_standard: 0.023,
  s3_ia: 0.0125,
  glacier: 0.004,

  // Network costs per GB
  egress: 0.09,

  // AI/ML costs per request
  llm_query: 0.01,
  embedding_generation: 0.0001,
};

interface CostEntry {
  timestamp: Date;
  amount: number;
  resourceType: string;
  operation: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

interface BudgetStatus {
  budgetType: 'daily' | 'monthly' | 'tenant';
  limit: number;
  used: number;
  remaining: number;
  utilization: number; // 0-1
  status: 'ok' | 'warning' | 'throttled' | 'blocked';
}

/**
 * Cost Guard Service
 */
export class CostGuardService {
  private config: CostConfig;
  private costLedger: Map<string, CostEntry[]>; // tenantId -> entries
  private alertsSent: Map<string, Set<number>>; // tenantId -> set of thresholds alerted
  private lastReset: { daily: Date; monthly: Date };

  constructor(config: Partial<CostConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.costLedger = new Map();
    this.alertsSent = new Map();
    this.lastReset = {
      daily: new Date(),
      monthly: new Date(),
    };

    if (this.config.enabled) {
      this.startPeriodicReset();
      logger.info('Cost Guard Service initialized', {
        budgets: this.config.budgets,
        alertThresholds: this.config.alertThresholds,
      });
    }
  }

  /**
   * Record a cost entry
   */
  recordCost(
    resourceType: string,
    operation: string,
    amount: number,
    tenantId: string = 'default',
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) {
      return;
    }

    const entry: CostEntry = {
      timestamp: new Date(),
      amount,
      resourceType,
      operation,
      tenantId,
      metadata,
    };

    // Add to ledger
    const entries = this.costLedger.get(tenantId) || [];
    entries.push(entry);
    this.costLedger.set(tenantId, entries);

    // Update Prometheus metrics
    costAccrued.inc(
      {
        tenant_id: tenantId,
        resource_type: resourceType,
        operation,
      },
      amount
    );

    // Check budgets and trigger alerts
    this.checkBudgets(tenantId);

    logger.debug({
      tenantId,
      resourceType,
      operation,
      amount,
      msg: 'Cost recorded',
    });
  }

  /**
   * Estimate and record database query cost
   */
  recordQueryCost(
    database: 'postgres' | 'neo4j' | 'timescale',
    durationMs: number,
    tenantId: string = 'default'
  ): number {
    const baseCost = COST_RATES[`${database}_query`] || 0.0001;

    // Cost increases with duration (slow queries cost more)
    const durationFactor = Math.min(durationMs / 1000, 10); // Cap at 10x
    const cost = baseCost * (1 + durationFactor);

    this.recordCost(database, 'query', cost, tenantId, {
      durationMs,
    });

    return cost;
  }

  /**
   * Record compute cost
   */
  recordComputeCost(
    cpuSeconds: number,
    memoryGbSeconds: number,
    tenantId: string = 'default'
  ): number {
    const cost =
      cpuSeconds * COST_RATES.cpu_second +
      memoryGbSeconds * COST_RATES.memory_gb_second;

    this.recordCost('compute', 'execution', cost, tenantId, {
      cpuSeconds,
      memoryGbSeconds,
    });

    return cost;
  }

  /**
   * Record storage cost
   */
  recordStorageCost(
    storageGb: number,
    tier: 's3_standard' | 's3_ia' | 'glacier',
    tenantId: string = 'default'
  ): number {
    const monthlyCost = storageGb * COST_RATES[tier];
    const dailyCost = monthlyCost / 30; // Approximate daily cost

    this.recordCost('storage', tier, dailyCost, tenantId, {
      storageGb,
    });

    return dailyCost;
  }

  /**
   * Check if an operation should be allowed based on budget
   */
  async checkBudgetLimit(
    estimatedCost: number,
    tenantId: string = 'default'
  ): Promise<{ allowed: boolean; reason?: string; status: BudgetStatus }> {
    if (!this.config.enabled) {
      return {
        allowed: true,
        status: this.getBudgetStatus(tenantId, 'tenant'),
      };
    }

    const status = this.getBudgetStatus(tenantId, 'tenant');

    // Block if at or over budget
    if (status.utilization >= this.config.blockThreshold) {
      return {
        allowed: false,
        reason: `Budget limit reached (${(status.utilization * 100).toFixed(1)}% utilized)`,
        status,
      };
    }

    // Check if this operation would exceed the budget
    if (status.remaining < estimatedCost) {
      return {
        allowed: false,
        reason: `Insufficient budget (remaining: $${status.remaining.toFixed(4)}, required: $${estimatedCost.toFixed(4)})`,
        status,
      };
    }

    return { allowed: true, status };
  }

  /**
   * Get budget status for a tenant
   */
  getBudgetStatus(
    tenantId: string = 'default',
    budgetType: 'daily' | 'monthly' | 'tenant' = 'tenant'
  ): BudgetStatus {
    const limit = this.config.budgets[budgetType === 'tenant' ? 'perTenant' : budgetType];
    const used = this.getTotalCost(tenantId, budgetType);
    const remaining = Math.max(0, limit - used);
    const utilization = limit > 0 ? used / limit : 0;

    let status: 'ok' | 'warning' | 'throttled' | 'blocked' = 'ok';
    if (utilization >= this.config.blockThreshold) {
      status = 'blocked';
    } else if (utilization >= this.config.throttleThreshold) {
      status = 'throttled';
    } else if (utilization >= this.config.alertThresholds[0]) {
      status = 'warning';
    }

    // Update Prometheus metrics
    costBudgetGauge.set(
      { tenant_id: tenantId, budget_type: budgetType },
      remaining
    );

    costBudgetUtilization.set(
      { tenant_id: tenantId, budget_type: budgetType },
      utilization
    );

    return {
      budgetType,
      limit,
      used,
      remaining,
      utilization,
      status,
    };
  }

  /**
   * Get total cost for a tenant within a time window
   */
  private getTotalCost(
    tenantId: string,
    budgetType: 'daily' | 'monthly' | 'tenant'
  ): number {
    const entries = this.costLedger.get(tenantId) || [];
    const now = new Date();

    let cutoffTime: Date;
    switch (budgetType) {
      case 'daily':
        cutoffTime = new Date(this.lastReset.daily);
        break;
      case 'monthly':
        cutoffTime = new Date(this.lastReset.monthly);
        break;
      case 'tenant':
        // For tenant budget, use monthly window
        cutoffTime = new Date(this.lastReset.monthly);
        break;
    }

    return entries
      .filter((entry) => entry.timestamp >= cutoffTime)
      .reduce((sum, entry) => sum + entry.amount, 0);
  }

  /**
   * Check budgets and send alerts if thresholds are crossed
   */
  private checkBudgets(tenantId: string): void {
    const status = this.getBudgetStatus(tenantId, 'tenant');
    const alertsSent = this.alertsSent.get(tenantId) || new Set();

    // Check each alert threshold
    for (const threshold of this.config.alertThresholds) {
      if (status.utilization >= threshold && !alertsSent.has(threshold)) {
        this.sendCostAlert(tenantId, threshold, status);
        alertsSent.add(threshold);
        this.alertsSent.set(tenantId, alertsSent);
      }
    }
  }

  /**
   * Send a cost alert
   */
  private sendCostAlert(
    tenantId: string,
    threshold: number,
    status: BudgetStatus
  ): void {
    const severity = threshold >= 0.9 ? 'critical' : threshold >= 0.75 ? 'warning' : 'info';

    logger.warn({
      tenantId,
      threshold: `${(threshold * 100).toFixed(0)}%`,
      utilization: `${(status.utilization * 100).toFixed(1)}%`,
      used: `$${status.used.toFixed(2)}`,
      limit: `$${status.limit.toFixed(2)}`,
      remaining: `$${status.remaining.toFixed(2)}`,
      severity,
      msg: 'Cost budget alert triggered',
    });

    // Increment alert counter
    costAlertCounter.inc({
      tenant_id: tenantId,
      alert_type: 'budget_threshold',
      severity,
    });

    // TODO: Send notification to monitoring system (PagerDuty, Slack, etc.)
  }

  /**
   * Get cost breakdown for a tenant
   */
  getCostBreakdown(tenantId: string = 'default'): Record<string, number> {
    const entries = this.costLedger.get(tenantId) || [];
    const breakdown: Record<string, number> = {};

    for (const entry of entries) {
      const key = `${entry.resourceType}.${entry.operation}`;
      breakdown[key] = (breakdown[key] || 0) + entry.amount;
    }

    return breakdown;
  }

  /**
   * Get all tenant budgets
   */
  getAllBudgetStatuses(): Map<string, BudgetStatus> {
    const statuses = new Map<string, BudgetStatus>();

    for (const tenantId of this.costLedger.keys()) {
      statuses.set(tenantId, this.getBudgetStatus(tenantId));
    }

    return statuses;
  }

  /**
   * Reset daily/monthly counters
   */
  private startPeriodicReset(): void {
    // Reset daily counter at midnight
    setInterval(() => {
      const now = new Date();
      const lastMidnight = new Date(now);
      lastMidnight.setHours(0, 0, 0, 0);

      if (this.lastReset.daily < lastMidnight) {
        this.resetDailyBudgets();
        this.lastReset.daily = now;
      }
    }, 60 * 60 * 1000); // Check hourly

    // Reset monthly counter at start of month
    setInterval(() => {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      if (this.lastReset.monthly < firstOfMonth) {
        this.resetMonthlyBudgets();
        this.lastReset.monthly = now;
      }
    }, 24 * 60 * 60 * 1000); // Check daily
  }

  /**
   * Reset daily budgets
   */
  private resetDailyBudgets(): void {
    logger.info('Resetting daily cost budgets');

    // Clear daily alerts
    for (const tenantId of this.costLedger.keys()) {
      const status = this.getBudgetStatus(tenantId, 'daily');
      logger.info({
        tenantId,
        dailyCost: `$${status.used.toFixed(2)}`,
        msg: 'Daily cost summary',
      });
    }

    this.alertsSent.clear();
  }

  /**
   * Reset monthly budgets
   */
  private resetMonthlyBudgets(): void {
    logger.info('Resetting monthly cost budgets');

    // Archive and clear monthly data
    for (const [tenantId, entries] of this.costLedger.entries()) {
      const total = entries.reduce((sum, e) => sum + e.amount, 0);
      logger.info({
        tenantId,
        monthlyCost: `$${total.toFixed(2)}`,
        entries: entries.length,
        msg: 'Monthly cost summary',
      });
    }

    // Clear old entries
    this.costLedger.clear();
    this.alertsSent.clear();
  }

  /**
   * Get cost rates for reference
   */
  static getCostRates() {
    return { ...COST_RATES };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<CostConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Cost Guard configuration updated', this.config);
  }

  /**
   * Get configuration
   */
  getConfig(): CostConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const costGuardService = new CostGuardService();

export default costGuardService;
