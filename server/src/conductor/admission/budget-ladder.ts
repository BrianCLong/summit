// server/src/conductor/admission/budget-ladder.ts

import { Pool } from 'pg';
import Redis from 'ioredis';
import logger from '../../config/logger.js';
import { prometheusConductorMetrics } from '../observability/prometheus.js';

interface BudgetLadder {
  tenantId: string;
  window: 'daily' | 'weekly' | 'monthly';
  limit: number;
  currentSpend: number;
  thresholds: {
    advise: number; // 0.8 (80%)
    degrade: number; // 0.9 (90%)
    partial: number; // 0.95 (95%)
    stop: number; // 1.0 (100%)
  };
  actions: {
    advise: BudgetAction[];
    degrade: BudgetAction[];
    partial: BudgetAction[];
    stop: BudgetAction[];
  };
}

interface BudgetAction {
  type:
    | 'priority_multiplier'
    | 'quality_reduction'
    | 'cache_fallback'
    | 'maintenance_mode'
    | 'notification';
  config: any;
  userMessage?: string;
}

interface TaskRequest {
  tenantId: string;
  expert: string;
  estimatedCost: number;
  priority: number;
  userId?: string;
}

interface BudgetDecision {
  allowed: boolean;
  modifiedPriority?: number;
  qualityMode?: 'full' | 'reduced' | 'cached' | 'unavailable';
  userMessage?: string;
  budgetRemaining: number;
  budgetUtilization: number;
  nextThreshold: string;
  actionsApplied: string[];
}

export class BudgetLadderController {
  private pool: Pool;
  private redis: ReturnType<typeof createClient>;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
    this.redis = createClient({ url: process.env.REDIS_URL });
  }

  async connect(): Promise<void> {
    await this.redis.connect();
  }

  /**
   * Evaluate budget for incoming task request
   */
  async evaluateTaskBudget(request: TaskRequest): Promise<BudgetDecision> {
    try {
      const ladder = await this.getBudgetLadder(request.tenantId);
      if (!ladder) {
        // No budget controls configured - allow with monitoring
        return {
          allowed: true,
          qualityMode: 'full',
          budgetRemaining: Infinity,
          budgetUtilization: 0,
          nextThreshold: 'none',
          actionsApplied: [],
        };
      }

      // Update current spend
      ladder.currentSpend = await this.getCurrentSpend(
        request.tenantId,
        ladder.window,
      );
      const projectedSpend = ladder.currentSpend + request.estimatedCost;
      const utilization = projectedSpend / ladder.limit;

      // Determine which threshold we're at
      let currentStage: keyof BudgetLadder['thresholds'] = 'advise';
      if (utilization >= ladder.thresholds.stop) {
        currentStage = 'stop';
      } else if (utilization >= ladder.thresholds.partial) {
        currentStage = 'partial';
      } else if (utilization >= ladder.thresholds.degrade) {
        currentStage = 'degrade';
      }

      // Apply actions for current stage
      const decision = await this.applyBudgetActions(
        ladder,
        currentStage,
        request,
        utilization,
      );

      // Record metrics and audit
      await this.recordBudgetDecision(request, decision, currentStage);

      logger.info('Budget decision made', {
        tenantId: request.tenantId,
        stage: currentStage,
        utilization: utilization.toFixed(3),
        allowed: decision.allowed,
        actionsApplied: decision.actionsApplied,
      });

      return decision;
    } catch (error) {
      logger.error('Budget evaluation failed', {
        error: error.message,
        tenantId: request.tenantId,
      });

      // Fail-safe: allow but with degraded quality
      return {
        allowed: true,
        qualityMode: 'reduced',
        budgetRemaining: 0,
        budgetUtilization: 1,
        nextThreshold: 'error',
        actionsApplied: ['error_fallback'],
        userMessage:
          'Budget evaluation temporarily unavailable - using reduced quality mode',
      };
    }
  }

  /**
   * Get or create budget ladder configuration
   */
  async getBudgetLadder(tenantId: string): Promise<BudgetLadder | null> {
    const client = await this.pool.connect();

    try {
      const result = await client.query(
        'SELECT * FROM budget_ladders WHERE tenant_id = $1',
        [tenantId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        tenantId: row.tenant_id,
        window: row.window,
        limit: parseFloat(row.limit),
        currentSpend: 0, // Will be calculated
        thresholds: row.thresholds,
        actions: row.actions,
      };
    } finally {
      client.release();
    }
  }

  /**
   * Configure budget ladder for tenant
   */
  async configureBudgetLadder(ladder: BudgetLadder): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query(
        `INSERT INTO budget_ladders (tenant_id, window, limit, thresholds, actions, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (tenant_id) 
         DO UPDATE SET window = $2, limit = $3, thresholds = $4, actions = $5, updated_at = NOW()`,
        [
          ladder.tenantId,
          ladder.window,
          ladder.limit,
          JSON.stringify(ladder.thresholds),
          JSON.stringify(ladder.actions),
        ],
      );

      logger.info('Budget ladder configured', {
        tenantId: ladder.tenantId,
        window: ladder.window,
        limit: ladder.limit,
      });
    } finally {
      client.release();
    }
  }

  /**
   * Get current spend for budget window
   */
  private async getCurrentSpend(
    tenantId: string,
    window: string,
  ): Promise<number> {
    const client = await this.pool.connect();

    try {
      let windowClause: string;
      switch (window) {
        case 'daily':
          windowClause = "DATE_TRUNC('day', NOW())";
          break;
        case 'weekly':
          windowClause = "DATE_TRUNC('week', NOW())";
          break;
        case 'monthly':
          windowClause = "DATE_TRUNC('month', NOW())";
          break;
        default:
          windowClause = "DATE_TRUNC('day', NOW())";
      }

      const result = await client.query(
        `
        SELECT COALESCE(SUM(cost), 0) as total_spend
        FROM task_costs 
        WHERE tenant_id = $1 
        AND created_at >= ${windowClause}
      `,
        [tenantId],
      );

      return parseFloat(result.rows[0].total_spend);
    } finally {
      client.release();
    }
  }

  /**
   * Apply budget actions based on current stage
   */
  private async applyBudgetActions(
    ladder: BudgetLadder,
    stage: keyof BudgetLadder['thresholds'],
    request: TaskRequest,
    utilization: number,
  ): Promise<BudgetDecision> {
    const actions = ladder.actions[stage] || [];
    const actionsApplied: string[] = [];
    let allowed = true;
    let modifiedPriority = request.priority;
    let qualityMode: BudgetDecision['qualityMode'] = 'full';
    let userMessage: string | undefined;

    for (const action of actions) {
      switch (action.type) {
        case 'priority_multiplier':
          modifiedPriority = Math.max(
            1,
            modifiedPriority * action.config.multiplier,
          );
          actionsApplied.push('priority_reduced');
          userMessage =
            action.userMessage ||
            `Priority reduced due to budget utilization (${(utilization * 100).toFixed(1)}%)`;
          break;

        case 'quality_reduction':
          qualityMode = action.config.mode || 'reduced';
          actionsApplied.push('quality_reduced');
          userMessage =
            action.userMessage ||
            `Using ${qualityMode} quality mode due to budget constraints`;
          break;

        case 'cache_fallback':
          qualityMode = 'cached';
          actionsApplied.push('cache_fallback');
          userMessage =
            action.userMessage || 'Using cached results due to budget limits';
          break;

        case 'maintenance_mode':
          allowed = false;
          qualityMode = 'unavailable';
          actionsApplied.push('service_unavailable');
          userMessage =
            action.userMessage ||
            'Service temporarily unavailable due to budget exhaustion';
          break;

        case 'notification':
          await this.sendBudgetNotification(
            request.tenantId,
            stage,
            utilization,
            action.config,
          );
          actionsApplied.push('notification_sent');
          break;
      }
    }

    // Calculate next threshold
    const thresholds = Object.entries(ladder.thresholds).sort(
      ([, a], [, b]) => a - b,
    );
    let nextThreshold = 'none';
    for (const [name, threshold] of thresholds) {
      if (utilization < threshold) {
        nextThreshold = name;
        break;
      }
    }

    return {
      allowed,
      modifiedPriority:
        modifiedPriority !== request.priority ? modifiedPriority : undefined,
      qualityMode,
      userMessage,
      budgetRemaining: Math.max(0, ladder.limit - ladder.currentSpend),
      budgetUtilization: utilization,
      nextThreshold,
      actionsApplied,
    };
  }

  /**
   * Send budget notification
   */
  private async sendBudgetNotification(
    tenantId: string,
    stage: string,
    utilization: number,
    config: any,
  ): Promise<void> {
    try {
      // Check if we've already sent this notification recently
      const notificationKey = `budget_notification:${tenantId}:${stage}`;
      const recentNotification = await this.redis.get(notificationKey);

      if (recentNotification) {
        return; // Don't spam notifications
      }

      // Set cooldown (1 hour)
      await this.redis.setEx(notificationKey, 3600, Date.now().toString());

      const notification = {
        tenantId,
        type: 'budget_threshold',
        stage,
        utilization: (utilization * 100).toFixed(1),
        message: `Budget ${stage} threshold reached: ${(utilization * 100).toFixed(1)}% utilized`,
        timestamp: new Date().toISOString(),
        channels: config.channels || ['email', 'webhook'],
      };

      // Queue notification for delivery
      await this.redis.lPush(
        'notifications_queue',
        JSON.stringify(notification),
      );

      logger.info('Budget notification queued', {
        tenantId,
        stage,
        utilization,
      });
    } catch (error) {
      logger.error('Failed to send budget notification', {
        error: error.message,
        tenantId,
        stage,
      });
    }
  }

  /**
   * Record budget decision for audit and metrics
   */
  private async recordBudgetDecision(
    request: TaskRequest,
    decision: BudgetDecision,
    stage: string,
  ): Promise<void> {
    // Metrics
    prometheusConductorMetrics.recordOperationalMetric(
      'budget_utilization',
      decision.budgetUtilization,
      { tenant_id: request.tenantId },
    );

    prometheusConductorMetrics.recordOperationalEvent(
      'budget_decision',
      decision.allowed,
      {
        tenant_id: request.tenantId,
        stage,
      },
    );

    // Audit log
    const client = await this.pool.connect();
    try {
      await client.query(
        `
        INSERT INTO audit_log (actor, tenant, action, object_type, object_id, details)
        VALUES ('budget_controller', $1, 'budget_decision', 'task_request', $2, $3)
      `,
        [
          request.tenantId,
          `${request.expert}:${Date.now()}`,
          JSON.stringify({
            stage,
            allowed: decision.allowed,
            utilization: decision.budgetUtilization,
            actionsApplied: decision.actionsApplied,
            estimatedCost: request.estimatedCost,
          }),
        ],
      );
    } finally {
      client.release();
    }
  }

  /**
   * Get default budget ladder configuration
   */
  static getDefaultLadder(
    tenantId: string,
    monthlyLimit: number,
  ): BudgetLadder {
    return {
      tenantId,
      window: 'monthly',
      limit: monthlyLimit,
      currentSpend: 0,
      thresholds: {
        advise: 0.8, // 80%
        degrade: 0.9, // 90%
        partial: 0.95, // 95%
        stop: 1.0, // 100%
      },
      actions: {
        advise: [
          {
            type: 'notification',
            config: { channels: ['email'] },
            userMessage: 'Approaching budget limit - consider optimizing usage',
          },
        ],
        degrade: [
          {
            type: 'priority_multiplier',
            config: { multiplier: 1.5 },
            userMessage: 'Request priority reduced due to budget utilization',
          },
          {
            type: 'notification',
            config: { channels: ['email', 'webhook'] },
          },
        ],
        partial: [
          {
            type: 'quality_reduction',
            config: { mode: 'reduced' },
            userMessage: 'Using reduced quality mode due to budget constraints',
          },
          {
            type: 'notification',
            config: { channels: ['email', 'webhook', 'slack'] },
          },
        ],
        stop: [
          {
            type: 'maintenance_mode',
            config: {},
            userMessage:
              'Service temporarily unavailable - monthly budget exhausted',
          },
          {
            type: 'notification',
            config: { channels: ['email', 'webhook', 'slack', 'pager'] },
          },
        ],
      },
    };
  }
}
