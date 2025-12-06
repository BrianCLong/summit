/**
 * Cost Tracking and Attribution Service
 *
 * Tracks and attributes AI/LLM costs across the ChatOps service:
 * - Token usage tracking per model
 * - Cost calculation with model-specific pricing
 * - Attribution to sessions, users, tenants
 * - Budget enforcement and alerts
 * - Usage analytics and reporting
 *
 * Dimensions:
 * - Model (Claude, GPT-4, etc.)
 * - Operation (intent routing, agent execution, embedding, etc.)
 * - Session/User/Tenant
 * - Investigation
 */

import { Pool } from 'pg';
import Redis from 'ioredis';
import { EventEmitter } from 'events';

// =============================================================================
// TYPES
// =============================================================================

export interface CostTrackerConfig {
  postgres: Pool;
  redis: Redis;
  modelPricing: ModelPricing[];
  budgets?: BudgetConfig[];
  alertThresholds?: AlertThreshold[];
  aggregationIntervalMs?: number;
}

export interface ModelPricing {
  modelId: string;
  provider: string;
  costPer1kInputTokens: number;
  costPer1kOutputTokens: number;
  costPerEmbedding?: number;
  effectiveDate: Date;
  currency: string;
}

export interface BudgetConfig {
  id: string;
  type: 'tenant' | 'user' | 'investigation' | 'global';
  entityId?: string;
  limitUsd: number;
  period: 'daily' | 'weekly' | 'monthly';
  alertAt: number[]; // Percentages to alert at (e.g., [50, 75, 90, 100])
  hardLimit: boolean;
}

export interface AlertThreshold {
  type: 'usage_spike' | 'rate_increase' | 'budget_warning';
  threshold: number;
  windowMinutes: number;
}

export interface UsageRecord {
  id: string;
  timestamp: Date;
  modelId: string;
  provider: string;
  operation: Operation;
  inputTokens: number;
  outputTokens: number;
  embeddingCount?: number;
  costUsd: number;
  latencyMs: number;
  sessionId?: string;
  userId: string;
  tenantId: string;
  investigationId?: string;
  traceId?: string;
  metadata?: Record<string, unknown>;
}

export type Operation =
  | 'intent_routing'
  | 'agent_thought'
  | 'agent_synthesis'
  | 'context_compression'
  | 'fact_extraction'
  | 'embedding'
  | 'guardrail_check'
  | 'nl2cypher'
  | 'enrichment'
  | 'report_generation'
  | 'other';

export interface UsageSummary {
  period: {
    start: Date;
    end: Date;
  };
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  byModel: Record<string, {
    costUsd: number;
    inputTokens: number;
    outputTokens: number;
    requests: number;
  }>;
  byOperation: Record<string, {
    costUsd: number;
    requests: number;
  }>;
  byUser?: Record<string, { costUsd: number; requests: number }>;
  byTenant?: Record<string, { costUsd: number; requests: number }>;
}

export interface BudgetStatus {
  budgetId: string;
  entityType: string;
  entityId?: string;
  limitUsd: number;
  usedUsd: number;
  remainingUsd: number;
  percentUsed: number;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  alertsSent: number[];
  isExceeded: boolean;
}

// =============================================================================
// COST TRACKER
// =============================================================================

export class CostTracker extends EventEmitter {
  private config: CostTrackerConfig;
  private postgres: Pool;
  private redis: Redis;
  private pricingCache: Map<string, ModelPricing> = new Map();
  private aggregationBuffer: UsageRecord[] = [];
  private aggregationTimeout?: NodeJS.Timeout;

  constructor(config: CostTrackerConfig) {
    super();
    this.config = {
      aggregationIntervalMs: 5000,
      ...config,
    };
    this.postgres = config.postgres;
    this.redis = config.redis;

    // Initialize pricing cache
    for (const pricing of config.modelPricing) {
      this.pricingCache.set(pricing.modelId, pricing);
    }

    this.startAggregation();
  }

  // ===========================================================================
  // USAGE RECORDING
  // ===========================================================================

  async recordUsage(params: {
    modelId: string;
    provider: string;
    operation: Operation;
    inputTokens: number;
    outputTokens: number;
    embeddingCount?: number;
    latencyMs: number;
    sessionId?: string;
    userId: string;
    tenantId: string;
    investigationId?: string;
    traceId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<UsageRecord> {
    // Calculate cost
    const costUsd = this.calculateCost(
      params.modelId,
      params.inputTokens,
      params.outputTokens,
      params.embeddingCount
    );

    const record: UsageRecord = {
      id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...params,
      costUsd,
    };

    // Add to aggregation buffer
    this.aggregationBuffer.push(record);

    // Update real-time counters in Redis
    await this.updateRealtimeCounters(record);

    // Check budgets
    await this.checkBudgets(record);

    this.emit('usage:recorded', record);

    return record;
  }

  async recordBatchUsage(records: Array<Omit<UsageRecord, 'id' | 'timestamp' | 'costUsd'>>): Promise<void> {
    for (const params of records) {
      const costUsd = this.calculateCost(
        params.modelId,
        params.inputTokens,
        params.outputTokens,
        params.embeddingCount
      );

      const record: UsageRecord = {
        id: `usage-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ...params,
        costUsd,
      };

      this.aggregationBuffer.push(record);
    }
  }

  // ===========================================================================
  // COST CALCULATION
  // ===========================================================================

  calculateCost(
    modelId: string,
    inputTokens: number,
    outputTokens: number,
    embeddingCount?: number
  ): number {
    const pricing = this.pricingCache.get(modelId);

    if (!pricing) {
      console.warn(`No pricing found for model: ${modelId}`);
      return 0;
    }

    let cost = 0;

    // Token costs
    cost += (inputTokens / 1000) * pricing.costPer1kInputTokens;
    cost += (outputTokens / 1000) * pricing.costPer1kOutputTokens;

    // Embedding costs
    if (embeddingCount && pricing.costPerEmbedding) {
      cost += embeddingCount * pricing.costPerEmbedding;
    }

    return Math.round(cost * 1000000) / 1000000; // 6 decimal places
  }

  estimateCost(params: {
    modelId: string;
    estimatedInputTokens: number;
    estimatedOutputTokens: number;
  }): number {
    return this.calculateCost(
      params.modelId,
      params.estimatedInputTokens,
      params.estimatedOutputTokens
    );
  }

  // ===========================================================================
  // REAL-TIME COUNTERS
  // ===========================================================================

  private async updateRealtimeCounters(record: UsageRecord): Promise<void> {
    const now = new Date();
    const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
    const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;

    const pipeline = this.redis.pipeline();

    // Global counters
    pipeline.incrbyfloat(`cost:global:hour:${hourKey}`, record.costUsd);
    pipeline.incrbyfloat(`cost:global:day:${dayKey}`, record.costUsd);
    pipeline.expire(`cost:global:hour:${hourKey}`, 86400); // 24h
    pipeline.expire(`cost:global:day:${dayKey}`, 604800); // 7 days

    // Tenant counters
    pipeline.incrbyfloat(`cost:tenant:${record.tenantId}:hour:${hourKey}`, record.costUsd);
    pipeline.incrbyfloat(`cost:tenant:${record.tenantId}:day:${dayKey}`, record.costUsd);
    pipeline.expire(`cost:tenant:${record.tenantId}:hour:${hourKey}`, 86400);
    pipeline.expire(`cost:tenant:${record.tenantId}:day:${dayKey}`, 604800);

    // User counters
    pipeline.incrbyfloat(`cost:user:${record.userId}:hour:${hourKey}`, record.costUsd);
    pipeline.incrbyfloat(`cost:user:${record.userId}:day:${dayKey}`, record.costUsd);
    pipeline.expire(`cost:user:${record.userId}:hour:${hourKey}`, 86400);
    pipeline.expire(`cost:user:${record.userId}:day:${dayKey}`, 604800);

    // Model counters
    pipeline.incrbyfloat(`cost:model:${record.modelId}:day:${dayKey}`, record.costUsd);
    pipeline.incrby(`tokens:model:${record.modelId}:day:${dayKey}`, record.inputTokens + record.outputTokens);

    // Investigation counters
    if (record.investigationId) {
      pipeline.incrbyfloat(`cost:investigation:${record.investigationId}`, record.costUsd);
    }

    // Session counters
    if (record.sessionId) {
      pipeline.incrbyfloat(`cost:session:${record.sessionId}`, record.costUsd);
    }

    await pipeline.exec();
  }

  // ===========================================================================
  // BUDGET MANAGEMENT
  // ===========================================================================

  private async checkBudgets(record: UsageRecord): Promise<void> {
    if (!this.config.budgets?.length) return;

    for (const budget of this.config.budgets) {
      let applies = false;
      let entityId: string | undefined;

      switch (budget.type) {
        case 'tenant':
          applies = budget.entityId === record.tenantId;
          entityId = record.tenantId;
          break;
        case 'user':
          applies = budget.entityId === record.userId;
          entityId = record.userId;
          break;
        case 'investigation':
          applies = budget.entityId === record.investigationId;
          entityId = record.investigationId;
          break;
        case 'global':
          applies = true;
          break;
      }

      if (!applies) continue;

      const status = await this.getBudgetStatus(budget, entityId);

      // Check for alerts
      for (const alertPercent of budget.alertAt) {
        if (status.percentUsed >= alertPercent && !status.alertsSent.includes(alertPercent)) {
          this.emit('budget:alert', {
            budget,
            status,
            alertPercent,
            record,
          });

          // Mark alert as sent
          await this.redis.sadd(`budget:${budget.id}:alerts:${status.periodStart.toISOString()}`, alertPercent);
        }
      }

      // Check hard limit
      if (budget.hardLimit && status.isExceeded) {
        this.emit('budget:exceeded', { budget, status, record });
      }
    }
  }

  async getBudgetStatus(budget: BudgetConfig, entityId?: string): Promise<BudgetStatus> {
    const { start, end } = this.getPeriodBounds(budget.period);

    // Get usage for period
    const usedUsd = await this.getUsageForPeriod(budget.type, entityId, start, end);

    // Get sent alerts
    const alertsKey = `budget:${budget.id}:alerts:${start.toISOString()}`;
    const alertsSent = (await this.redis.smembers(alertsKey)).map(Number);

    const percentUsed = (usedUsd / budget.limitUsd) * 100;

    return {
      budgetId: budget.id,
      entityType: budget.type,
      entityId,
      limitUsd: budget.limitUsd,
      usedUsd,
      remainingUsd: Math.max(0, budget.limitUsd - usedUsd),
      percentUsed,
      period: budget.period,
      periodStart: start,
      periodEnd: end,
      alertsSent,
      isExceeded: usedUsd >= budget.limitUsd,
    };
  }

  private getPeriodBounds(period: BudgetConfig['period']): { start: Date; end: Date } {
    const now = new Date();
    let start: Date;
    let end: Date;

    switch (period) {
      case 'daily':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        end = new Date(start.getTime() + 86400000);
        break;
      case 'weekly':
        const dayOfWeek = now.getUTCDay();
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - dayOfWeek));
        end = new Date(start.getTime() + 7 * 86400000);
        break;
      case 'monthly':
        start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        break;
    }

    return { start, end };
  }

  private async getUsageForPeriod(
    type: string,
    entityId: string | undefined,
    start: Date,
    end: Date
  ): Promise<number> {
    // Try to get from Redis counters first
    const dayKey = `${start.getUTCFullYear()}-${start.getUTCMonth()}-${start.getUTCDate()}`;

    if (type === 'global') {
      const value = await this.redis.get(`cost:global:day:${dayKey}`);
      return parseFloat(value || '0');
    }

    if (entityId) {
      const value = await this.redis.get(`cost:${type}:${entityId}:day:${dayKey}`);
      return parseFloat(value || '0');
    }

    return 0;
  }

  // ===========================================================================
  // ANALYTICS & REPORTING
  // ===========================================================================

  async getUsageSummary(params: {
    startDate: Date;
    endDate: Date;
    tenantId?: string;
    userId?: string;
    groupBy?: ('model' | 'operation' | 'user' | 'tenant')[];
  }): Promise<UsageSummary> {
    let query = `
      SELECT
        SUM(cost_usd) as total_cost,
        SUM(input_tokens) as total_input_tokens,
        SUM(output_tokens) as total_output_tokens,
        COUNT(*) as total_requests,
        model_id,
        operation,
        user_id,
        tenant_id
      FROM chatops_usage
      WHERE timestamp >= $1 AND timestamp < $2
    `;
    const queryParams: unknown[] = [params.startDate, params.endDate];

    if (params.tenantId) {
      queryParams.push(params.tenantId);
      query += ` AND tenant_id = $${queryParams.length}`;
    }

    if (params.userId) {
      queryParams.push(params.userId);
      query += ` AND user_id = $${queryParams.length}`;
    }

    query += ' GROUP BY model_id, operation, user_id, tenant_id';

    const result = await this.postgres.query(query, queryParams);

    // Aggregate results
    const summary: UsageSummary = {
      period: { start: params.startDate, end: params.endDate },
      totalCostUsd: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalRequests: 0,
      byModel: {},
      byOperation: {},
    };

    if (params.groupBy?.includes('user')) summary.byUser = {};
    if (params.groupBy?.includes('tenant')) summary.byTenant = {};

    for (const row of result.rows) {
      summary.totalCostUsd += parseFloat(row.total_cost || 0);
      summary.totalInputTokens += parseInt(row.total_input_tokens || 0);
      summary.totalOutputTokens += parseInt(row.total_output_tokens || 0);
      summary.totalRequests += parseInt(row.total_requests || 0);

      // By model
      if (!summary.byModel[row.model_id]) {
        summary.byModel[row.model_id] = { costUsd: 0, inputTokens: 0, outputTokens: 0, requests: 0 };
      }
      summary.byModel[row.model_id].costUsd += parseFloat(row.total_cost || 0);
      summary.byModel[row.model_id].inputTokens += parseInt(row.total_input_tokens || 0);
      summary.byModel[row.model_id].outputTokens += parseInt(row.total_output_tokens || 0);
      summary.byModel[row.model_id].requests += parseInt(row.total_requests || 0);

      // By operation
      if (!summary.byOperation[row.operation]) {
        summary.byOperation[row.operation] = { costUsd: 0, requests: 0 };
      }
      summary.byOperation[row.operation].costUsd += parseFloat(row.total_cost || 0);
      summary.byOperation[row.operation].requests += parseInt(row.total_requests || 0);

      // By user
      if (summary.byUser && row.user_id) {
        if (!summary.byUser[row.user_id]) {
          summary.byUser[row.user_id] = { costUsd: 0, requests: 0 };
        }
        summary.byUser[row.user_id].costUsd += parseFloat(row.total_cost || 0);
        summary.byUser[row.user_id].requests += parseInt(row.total_requests || 0);
      }

      // By tenant
      if (summary.byTenant && row.tenant_id) {
        if (!summary.byTenant[row.tenant_id]) {
          summary.byTenant[row.tenant_id] = { costUsd: 0, requests: 0 };
        }
        summary.byTenant[row.tenant_id].costUsd += parseFloat(row.total_cost || 0);
        summary.byTenant[row.tenant_id].requests += parseInt(row.total_requests || 0);
      }
    }

    return summary;
  }

  async getRealtimeCost(scope: {
    type: 'global' | 'tenant' | 'user' | 'session' | 'investigation';
    id?: string;
    window: 'hour' | 'day';
  }): Promise<number> {
    const now = new Date();
    let key: string;

    if (scope.window === 'hour') {
      const hourKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}-${now.getUTCHours()}`;
      key = scope.type === 'global'
        ? `cost:global:hour:${hourKey}`
        : `cost:${scope.type}:${scope.id}:hour:${hourKey}`;
    } else {
      const dayKey = `${now.getUTCFullYear()}-${now.getUTCMonth()}-${now.getUTCDate()}`;
      key = scope.type === 'global'
        ? `cost:global:day:${dayKey}`
        : `cost:${scope.type}:${scope.id}:day:${dayKey}`;
    }

    const value = await this.redis.get(key);
    return parseFloat(value || '0');
  }

  async getTopConsumers(params: {
    type: 'user' | 'tenant' | 'model' | 'operation';
    period: 'day' | 'week' | 'month';
    limit?: number;
  }): Promise<Array<{ id: string; costUsd: number; requests: number }>> {
    const { start, end } = this.getPeriodBounds(
      params.period === 'day' ? 'daily' :
      params.period === 'week' ? 'weekly' : 'monthly'
    );

    const columnMap = {
      user: 'user_id',
      tenant: 'tenant_id',
      model: 'model_id',
      operation: 'operation',
    };

    const result = await this.postgres.query(`
      SELECT ${columnMap[params.type]} as id,
             SUM(cost_usd) as cost_usd,
             COUNT(*) as requests
      FROM chatops_usage
      WHERE timestamp >= $1 AND timestamp < $2
      GROUP BY ${columnMap[params.type]}
      ORDER BY cost_usd DESC
      LIMIT $3
    `, [start, end, params.limit || 10]);

    return result.rows.map(row => ({
      id: row.id,
      costUsd: parseFloat(row.cost_usd),
      requests: parseInt(row.requests),
    }));
  }

  // ===========================================================================
  // AGGREGATION
  // ===========================================================================

  private startAggregation(): void {
    this.aggregationTimeout = setInterval(async () => {
      if (this.aggregationBuffer.length === 0) return;

      const records = [...this.aggregationBuffer];
      this.aggregationBuffer = [];

      await this.flushToDatabase(records);
    }, this.config.aggregationIntervalMs);
  }

  private async flushToDatabase(records: UsageRecord[]): Promise<void> {
    if (records.length === 0) return;

    const values: string[] = [];
    const params: unknown[] = [];

    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const offset = i * 14;
      values.push(`($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10}, $${offset + 11}, $${offset + 12}, $${offset + 13}, $${offset + 14})`);
      params.push(
        r.id,
        r.timestamp,
        r.modelId,
        r.provider,
        r.operation,
        r.inputTokens,
        r.outputTokens,
        r.costUsd,
        r.latencyMs,
        r.sessionId,
        r.userId,
        r.tenantId,
        r.investigationId,
        r.traceId
      );
    }

    await this.postgres.query(`
      INSERT INTO chatops_usage (
        id, timestamp, model_id, provider, operation,
        input_tokens, output_tokens, cost_usd, latency_ms,
        session_id, user_id, tenant_id, investigation_id, trace_id
      ) VALUES ${values.join(', ')}
    `, params);
  }

  async shutdown(): Promise<void> {
    if (this.aggregationTimeout) {
      clearInterval(this.aggregationTimeout);
    }

    // Flush remaining records
    await this.flushToDatabase(this.aggregationBuffer);
    this.aggregationBuffer = [];
  }
}

// =============================================================================
// DEFAULT PRICING
// =============================================================================

export const DefaultModelPricing: ModelPricing[] = [
  {
    modelId: 'claude-opus-4-20250514',
    provider: 'anthropic',
    costPer1kInputTokens: 0.015,
    costPer1kOutputTokens: 0.075,
    effectiveDate: new Date('2025-01-01'),
    currency: 'USD',
  },
  {
    modelId: 'claude-sonnet-4-20250514',
    provider: 'anthropic',
    costPer1kInputTokens: 0.003,
    costPer1kOutputTokens: 0.015,
    effectiveDate: new Date('2025-01-01'),
    currency: 'USD',
  },
  {
    modelId: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    costPer1kInputTokens: 0.001,
    costPer1kOutputTokens: 0.005,
    effectiveDate: new Date('2025-01-01'),
    currency: 'USD',
  },
  {
    modelId: 'gpt-4-turbo-preview',
    provider: 'openai',
    costPer1kInputTokens: 0.01,
    costPer1kOutputTokens: 0.03,
    effectiveDate: new Date('2025-01-01'),
    currency: 'USD',
  },
  {
    modelId: 'text-embedding-3-large',
    provider: 'openai',
    costPer1kInputTokens: 0.00013,
    costPer1kOutputTokens: 0,
    costPerEmbedding: 0.00013,
    effectiveDate: new Date('2025-01-01'),
    currency: 'USD',
  },
];

// =============================================================================
// FACTORY
// =============================================================================

export function createCostTracker(config: CostTrackerConfig): CostTracker {
  return new CostTracker(config);
}
