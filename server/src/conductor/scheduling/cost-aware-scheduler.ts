// Cost-Aware Scheduler for Conductor
// Implements queue-backed execution with budget tracking and graceful degradation

import { ExpertArm } from '../learn/bandit';
import { prometheusConductorMetrics } from '../observability/prometheus';
import Redis from 'ioredis';

export interface SchedulingContext {
  expertType: ExpertArm;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  estimatedCost: number;
  estimatedDuration: number;
  tenantId: string;
  requestId: string;
  timeout: number;
  metadata?: {
    userId?: string;
    sessionId?: string;
    businessUnit?: string;
    costCenter?: string;
  };
}

export interface BudgetConfig {
  tenantId: string;
  monthlyBudgetUSD: number;
  currentSpendUSD: number;
  warningThreshold: number; // 0.8 = 80%
  emergencyThreshold: number; // 0.95 = 95%
  priorityMultipliers: {
    low: number;
    normal: number;
    high: number;
    urgent: number;
  };
}

export interface QueueMetrics {
  queueName: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  avgWaitTime: number;
  avgProcessingTime: number;
  estimatedCost: number;
}

export interface SchedulingDecision {
  approved: boolean;
  queueName: string;
  estimatedWaitTime: number;
  fallbackOptions?: Array<{
    expertType: ExpertArm;
    estimatedCost: number;
    reason: string;
  }>;
  budgetImpact: {
    currentUtilization: number;
    projectedUtilization: number;
    remainingBudget: number;
  };
  reason: string;
}

/**
 * Cost-Aware Queue Manager
 */
class QueueManager {
  private redis: Redis;
  private readonly QUEUE_PREFIX = 'conductor_queue';
  private readonly METRICS_PREFIX = 'conductor_queue_metrics';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Add task to appropriate queue based on expert type and priority
   */
  async enqueue(context: SchedulingContext): Promise<void> {
    const queueName = this.getQueueName(context.expertType, context.priority);
    const task = {
      ...context,
      enqueuedAt: Date.now(),
      retryCount: 0,
    };

    // Add to queue with priority scoring (higher = processed first)
    const priorityScore = this.calculatePriorityScore(context);

    await Promise.all([
      // Add to sorted set for priority processing
      this.redis.zadd(
        `${this.QUEUE_PREFIX}:${queueName}`,
        priorityScore,
        JSON.stringify(task),
      ),
      // Track queue metrics
      this.redis.hincrby(`${this.METRICS_PREFIX}:${queueName}`, 'pending', 1),
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'estimatedCost',
        Math.ceil(context.estimatedCost * 100),
      ),
    ]);

    console.log(
      `Task ${context.requestId} queued in ${queueName} with priority ${priorityScore}`,
    );
  }

  /**
   * Dequeue next task from specified queue
   */
  async dequeue(queueName: string): Promise<SchedulingContext | null> {
    // Get highest priority task (ZREVRANGE gets highest scores first)
    const tasks = await this.redis.zrevrange(
      `${this.QUEUE_PREFIX}:${queueName}`,
      0,
      0,
    );

    if (tasks.length === 0) return null;

    // Atomically remove from queue and update metrics
    const task = JSON.parse(tasks[0]);

    await Promise.all([
      this.redis.zrem(`${this.QUEUE_PREFIX}:${queueName}`, tasks[0]),
      this.redis.hincrby(`${this.METRICS_PREFIX}:${queueName}`, 'pending', -1),
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'processing',
        1,
      ),
    ]);

    return task;
  }

  /**
   * Mark task as completed
   */
  async markCompleted(
    queueName: string,
    requestId: string,
    actualCost: number,
    processingTime: number,
  ): Promise<void> {
    await Promise.all([
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'processing',
        -1,
      ),
      this.redis.hincrby(`${this.METRICS_PREFIX}:${queueName}`, 'completed', 1),
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'totalCost',
        Math.ceil(actualCost * 100),
      ),
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'totalProcessingTime',
        processingTime,
      ),
    ]);

    // Record metrics
    prometheusConductorMetrics.recordOperationalMetric(
      'scheduler_task_completed',
      1,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'scheduler_actual_cost',
      actualCost,
    );
    prometheusConductorMetrics.recordOperationalMetric(
      'scheduler_processing_time',
      processingTime,
    );
  }

  /**
   * Mark task as failed
   */
  async markFailed(
    queueName: string,
    requestId: string,
    error: string,
  ): Promise<void> {
    await Promise.all([
      this.redis.hincrby(
        `${this.METRICS_PREFIX}:${queueName}`,
        'processing',
        -1,
      ),
      this.redis.hincrby(`${this.METRICS_PREFIX}:${queueName}`, 'failed', 1),
      this.redis.lpush(
        `${this.QUEUE_PREFIX}:${queueName}:errors`,
        JSON.stringify({
          requestId,
          error,
          timestamp: Date.now(),
        }),
      ),
    ]);

    prometheusConductorMetrics.recordOperationalEvent(
      'scheduler_task_failed',
      false,
    );
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: string): Promise<QueueMetrics> {
    const metrics = await this.redis.hgetall(
      `${this.METRICS_PREFIX}:${queueName}`,
    );

    const pending = parseInt(metrics.pending || '0');
    const processing = parseInt(metrics.processing || '0');
    const completed = parseInt(metrics.completed || '0');
    const failed = parseInt(metrics.failed || '0');
    const totalCost = parseInt(metrics.totalCost || '0') / 100;
    const totalProcessingTime = parseInt(metrics.totalProcessingTime || '0');

    return {
      queueName,
      pending,
      processing,
      completed,
      failed,
      avgWaitTime: completed > 0 ? totalProcessingTime / completed : 0,
      avgProcessingTime: completed > 0 ? totalProcessingTime / completed : 0,
      estimatedCost: totalCost,
    };
  }

  /**
   * Get all queue metrics
   */
  async getAllQueueMetrics(): Promise<QueueMetrics[]> {
    const queueKeys = await this.redis.keys(`${this.METRICS_PREFIX}:*`);
    const queueNames = queueKeys.map((key) =>
      key.replace(`${this.METRICS_PREFIX}:`, ''),
    );

    return Promise.all(queueNames.map((name) => this.getQueueMetrics(name)));
  }

  private getQueueName(expertType: ExpertArm, priority: string): string {
    // Heavy experts get their own queues
    const heavyExperts: ExpertArm[] = [
      'graph_ops',
      'rag_retrieval',
      'osint_analysis',
    ];

    if (heavyExperts.includes(expertType)) {
      return `${expertType}_${priority}`;
    }

    // Light experts share queues
    return `light_${priority}`;
  }

  private calculatePriorityScore(context: SchedulingContext): number {
    const basePriority = {
      urgent: 1000,
      high: 750,
      normal: 500,
      low: 250,
    };

    let score = basePriority[context.priority];

    // Boost score for shorter estimated duration (get quick wins first)
    if (context.estimatedDuration < 30000) {
      // < 30s
      score += 100;
    }

    // Slight boost for lower cost tasks when resources are constrained
    if (context.estimatedCost < 0.01) {
      score += 50;
    }

    return score;
  }
}

/**
 * Budget Manager
 */
class BudgetManager {
  private redis: Redis;
  private readonly BUDGET_PREFIX = 'conductor_budget';

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Get budget configuration for tenant
   */
  async getBudgetConfig(tenantId: string): Promise<BudgetConfig | null> {
    const configData = await this.redis.get(
      `${this.BUDGET_PREFIX}:${tenantId}`,
    );
    return configData ? JSON.parse(configData) : null;
  }

  /**
   * Set budget configuration for tenant
   */
  async setBudgetConfig(config: BudgetConfig): Promise<void> {
    await this.redis.set(
      `${this.BUDGET_PREFIX}:${config.tenantId}`,
      JSON.stringify(config),
    );
  }

  /**
   * Record spending for tenant
   */
  async recordSpending(
    tenantId: string,
    amount: number,
    metadata?: any,
  ): Promise<void> {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM

    await Promise.all([
      // Update monthly spend
      this.redis.hincrbyfloat(
        `${this.BUDGET_PREFIX}:spend:${tenantId}`,
        month,
        amount,
      ),
      // Log spending transaction
      this.redis.lpush(
        `${this.BUDGET_PREFIX}:log:${tenantId}:${month}`,
        JSON.stringify({
          amount,
          timestamp: Date.now(),
          metadata,
        }),
      ),
    ]);

    // Update current spend in budget config
    const config = await this.getBudgetConfig(tenantId);
    if (config) {
      config.currentSpendUSD += amount;
      await this.setBudgetConfig(config);
    }
  }

  /**
   * Check if tenant can afford a request
   */
  async checkBudgetApproval(
    tenantId: string,
    estimatedCost: number,
    priority: string,
  ): Promise<{
    approved: boolean;
    budgetUtilization: number;
    remainingBudget: number;
    reason: string;
  }> {
    const config = await this.getBudgetConfig(tenantId);

    if (!config) {
      // No budget configured - allow with warning
      return {
        approved: true,
        budgetUtilization: 0,
        remainingBudget: Infinity,
        reason: 'No budget configured',
      };
    }

    const projectedSpend = config.currentSpendUSD + estimatedCost;
    const budgetUtilization = projectedSpend / config.monthlyBudgetUSD;
    const remainingBudget = config.monthlyBudgetUSD - config.currentSpendUSD;

    // Always allow urgent requests (but log warning)
    if (priority === 'urgent') {
      if (budgetUtilization > config.emergencyThreshold) {
        console.warn(
          `URGENT request for ${tenantId} exceeds emergency threshold: ${budgetUtilization}`,
        );
      }

      return {
        approved: true,
        budgetUtilization,
        remainingBudget,
        reason: 'Urgent priority override',
      };
    }

    // Block requests if over emergency threshold
    if (budgetUtilization > config.emergencyThreshold) {
      return {
        approved: false,
        budgetUtilization,
        remainingBudget,
        reason: `Budget utilization ${(budgetUtilization * 100).toFixed(1)}% exceeds emergency threshold ${(config.emergencyThreshold * 100).toFixed(1)}%`,
      };
    }

    // Apply priority multipliers for cost-based throttling
    const multiplier =
      config.priorityMultipliers[
        priority as keyof typeof config.priorityMultipliers
      ] || 1;
    const adjustedCost = estimatedCost * multiplier;

    if (config.currentSpendUSD + adjustedCost > config.monthlyBudgetUSD) {
      return {
        approved: false,
        budgetUtilization,
        remainingBudget,
        reason: `Adjusted cost $${adjustedCost.toFixed(3)} exceeds remaining budget $${remainingBudget.toFixed(3)}`,
      };
    }

    return {
      approved: true,
      budgetUtilization,
      remainingBudget,
      reason: 'Budget approved',
    };
  }

  /**
   * Get monthly spending report
   */
  async getSpendingReport(
    tenantId: string,
    month?: string,
  ): Promise<{
    totalSpend: number;
    dailyBreakdown: Array<{ date: string; amount: number }>;
    topCostDrivers: Array<{
      expertType: string;
      totalCost: number;
      requestCount: number;
    }>;
  }> {
    const targetMonth = month || new Date().toISOString().slice(0, 7);

    const totalSpend = await this.redis.hget(
      `${this.BUDGET_PREFIX}:spend:${tenantId}`,
      targetMonth,
    );
    const transactions = await this.redis.lrange(
      `${this.BUDGET_PREFIX}:log:${tenantId}:${targetMonth}`,
      0,
      -1,
    );

    // Process transactions for breakdown
    const dailySpend = new Map<string, number>();
    const expertSpend = new Map<string, { cost: number; count: number }>();

    for (const txJson of transactions) {
      const tx = JSON.parse(txJson);
      const date = new Date(tx.timestamp).toISOString().slice(0, 10);

      dailySpend.set(date, (dailySpend.get(date) || 0) + tx.amount);

      if (tx.metadata?.expertType) {
        const current = expertSpend.get(tx.metadata.expertType) || {
          cost: 0,
          count: 0,
        };
        expertSpend.set(tx.metadata.expertType, {
          cost: current.cost + tx.amount,
          count: current.count + 1,
        });
      }
    }

    return {
      totalSpend: parseFloat(totalSpend || '0'),
      dailyBreakdown: Array.from(dailySpend.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topCostDrivers: Array.from(expertSpend.entries())
        .map(([expertType, data]) => ({
          expertType,
          totalCost: data.cost,
          requestCount: data.count,
        }))
        .sort((a, b) => b.totalCost - a.totalCost),
    };
  }
}

/**
 * Cost-Aware Scheduler
 */
export class CostAwareScheduler {
  private queueManager: QueueManager;
  private budgetManager: BudgetManager;

  constructor() {
    this.queueManager = new QueueManager();
    this.budgetManager = new BudgetManager();
  }

  /**
   * Make scheduling decision for a request
   */
  async schedule(context: SchedulingContext): Promise<SchedulingDecision> {
    try {
      // Check budget approval
      const budgetCheck = await this.budgetManager.checkBudgetApproval(
        context.tenantId,
        context.estimatedCost,
        context.priority,
      );

      if (!budgetCheck.approved) {
        // Suggest fallback options
        const fallbackOptions = await this.generateFallbackOptions(context);

        return {
          approved: false,
          queueName: '',
          estimatedWaitTime: 0,
          fallbackOptions,
          budgetImpact: {
            currentUtilization: budgetCheck.budgetUtilization,
            projectedUtilization: budgetCheck.budgetUtilization,
            remainingBudget: budgetCheck.remainingBudget,
          },
          reason: budgetCheck.reason,
        };
      }

      // Queue the task
      await this.queueManager.enqueue(context);

      // Calculate estimated wait time
      const queueName = this.getQueueName(context.expertType, context.priority);
      const queueMetrics = await this.queueManager.getQueueMetrics(queueName);
      const estimatedWaitTime = this.calculateEstimatedWaitTime(
        queueMetrics,
        context,
      );

      // Record budget impact
      const projectedUtilization =
        (budgetCheck.budgetUtilization *
          (await this.budgetManager.getBudgetConfig(context.tenantId))!
            .monthlyBudgetUSD +
          context.estimatedCost) /
        (await this.budgetManager.getBudgetConfig(context.tenantId))!
          .monthlyBudgetUSD;

      prometheusConductorMetrics.recordOperationalMetric(
        'scheduler_queue_wait_time',
        estimatedWaitTime,
      );
      prometheusConductorMetrics.recordOperationalMetric(
        'scheduler_budget_utilization',
        budgetCheck.budgetUtilization,
      );

      return {
        approved: true,
        queueName,
        estimatedWaitTime,
        budgetImpact: {
          currentUtilization: budgetCheck.budgetUtilization,
          projectedUtilization,
          remainingBudget: budgetCheck.remainingBudget,
        },
        reason: `Scheduled in ${queueName} queue`,
      };
    } catch (error) {
      console.error('Scheduling error:', error);

      return {
        approved: false,
        queueName: '',
        estimatedWaitTime: 0,
        budgetImpact: {
          currentUtilization: 0,
          projectedUtilization: 0,
          remainingBudget: 0,
        },
        reason: `Scheduling error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Get next task from queue
   */
  async getNextTask(queueName: string): Promise<SchedulingContext | null> {
    return this.queueManager.dequeue(queueName);
  }

  /**
   * Complete task and record actual costs
   */
  async completeTask(
    queueName: string,
    requestId: string,
    actualCost: number,
    processingTime: number,
    tenantId: string,
  ): Promise<void> {
    await Promise.all([
      this.queueManager.markCompleted(
        queueName,
        requestId,
        actualCost,
        processingTime,
      ),
      this.budgetManager.recordSpending(tenantId, actualCost, {
        requestId,
        queueName,
        processingTime,
      }),
    ]);
  }

  /**
   * Fail task
   */
  async failTask(
    queueName: string,
    requestId: string,
    error: string,
  ): Promise<void> {
    await this.queueManager.markFailed(queueName, requestId, error);
  }

  /**
   * Get scheduling metrics
   */
  async getMetrics(): Promise<{
    queues: QueueMetrics[];
    totalPendingTasks: number;
    totalProcessingTasks: number;
    avgSystemWaitTime: number;
  }> {
    const queues = await this.queueManager.getAllQueueMetrics();

    return {
      queues,
      totalPendingTasks: queues.reduce((sum, q) => sum + q.pending, 0),
      totalProcessingTasks: queues.reduce((sum, q) => sum + q.processing, 0),
      avgSystemWaitTime:
        queues.reduce((sum, q) => sum + q.avgWaitTime, 0) / queues.length || 0,
    };
  }

  /**
   * Set budget configuration
   */
  async setBudget(config: BudgetConfig): Promise<void> {
    return this.budgetManager.setBudgetConfig(config);
  }

  /**
   * Get spending report
   */
  async getSpendingReport(tenantId: string, month?: string) {
    return this.budgetManager.getSpendingReport(tenantId, month);
  }

  private getQueueName(expertType: ExpertArm, priority: string): string {
    const heavyExperts: ExpertArm[] = [
      'graph_ops',
      'rag_retrieval',
      'osint_analysis',
    ];

    if (heavyExperts.includes(expertType)) {
      return `${expertType}_${priority}`;
    }

    return `light_${priority}`;
  }

  private calculateEstimatedWaitTime(
    metrics: QueueMetrics,
    context: SchedulingContext,
  ): number {
    // Simple estimate: pending tasks * average processing time
    return (
      metrics.pending * (metrics.avgProcessingTime || context.estimatedDuration)
    );
  }

  private async generateFallbackOptions(context: SchedulingContext): Promise<
    Array<{
      expertType: ExpertArm;
      estimatedCost: number;
      reason: string;
    }>
  > {
    // Suggest cheaper alternatives
    const fallbacks: Array<{
      expertType: ExpertArm;
      estimatedCost: number;
      reason: string;
    }> = [];

    // For expensive experts, suggest lighter alternatives
    if (context.expertType === 'graph_ops') {
      fallbacks.push({
        expertType: 'general_llm',
        estimatedCost: context.estimatedCost * 0.1,
        reason: 'Use general LLM for simpler graph queries',
      });
    }

    if (context.expertType === 'rag_retrieval') {
      fallbacks.push({
        expertType: 'general_llm',
        estimatedCost: context.estimatedCost * 0.2,
        reason: 'Use general LLM with cached context',
      });
    }

    return fallbacks;
  }
}

// Global singleton
export const costAwareScheduler = new CostAwareScheduler();
