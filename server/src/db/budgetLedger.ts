/**
 * Budget Ledger: Postgres-backed FinOps spending tracker
 * Source of truth for tenant budgets and detailed audit trail
 */

import { Pool } from 'pg';
import type { PoolClient } from 'pg';
import logger from '../utils/logger';

export interface TenantBudget {
  tenantId: string;
  monthlyUsdLimit: number;
  dailyUsdLimit?: number;
  hardCap: boolean;
  notificationThreshold: number;
  emergencyContact?: string;
  updatedBy: string;
  updatedAt: Date;
  createdAt: Date;
  createdBy: string;
  notes?: string;
}

export interface BudgetLedgerEntry {
  id: string;
  tenantId: string;
  correlationId: string;
  operationName: string;
  fieldName?: string;
  userId?: string;
  requestId?: string;
  provider: string;
  model: string;
  estPromptTokens: number;
  estCompletionTokens: number;
  estTotalUsd: number;
  actualPromptTokens?: number;
  actualCompletionTokens?: number;
  actualTotalUsd?: number;
  estimationMethod: 'precise' | 'heuristic' | 'cached';
  accuracyRatio?: number;
  status: 'estimated' | 'reconciled' | 'failed' | 'rolled_back';
  reconciledAt?: Date;
  failedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCheckResult {
  canAfford: boolean;
  currentSpend: number;
  budgetLimit: number;
  utilizationPct: number;
  reason: string;
}

export interface SpendingSummary {
  tenantId: string;
  totalOperations: number;
  estimatedUsd: number;
  actualUsd?: number;
  totalUsd: number;
  avgAccuracyRatio?: number;
}

export interface BudgetUtilization extends TenantBudget {
  currentMonthSpend: number;
  utilizationPct: number;
  status: 'WITHIN_BUDGET' | 'APPROACHING_LIMIT' | 'OVER_BUDGET';
  remainingBudget: number;
}

/**
 * Budget Ledger Manager - handles all budget tracking operations
 */
export class BudgetLedgerManager {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool || this.createDefaultPool();
  }

  private createDefaultPool(): Pool {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    pool.on('error', (err) => {
      logger.error('Database pool error', { error: err });
    });

    return pool;
  }

  /**
   * Check if tenant can afford an operation
   */
  async checkTenantBudget(
    tenantId: string,
    estimatedUsd: number,
  ): Promise<BudgetCheckResult> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM check_tenant_budget($1, $2)',
        [tenantId, estimatedUsd],
      );

      if (result.rows.length === 0) {
        return {
          canAfford: false,
          currentSpend: 0,
          budgetLimit: 0,
          utilizationPct: 0,
          reason: 'Tenant not found',
        };
      }

      return {
        canAfford: result.rows[0].can_afford,
        currentSpend: parseFloat(result.rows[0].current_spend),
        budgetLimit: parseFloat(result.rows[0].budget_limit),
        utilizationPct: parseFloat(result.rows[0].utilization_pct),
        reason: result.rows[0].reason,
      };
    } catch (error) {
      logger.error('Failed to check tenant budget', {
        error,
        tenantId,
        estimatedUsd,
      });
      return {
        canAfford: false,
        currentSpend: 0,
        budgetLimit: 0,
        utilizationPct: 0,
        reason: 'Database error',
      };
    }
  }

  /**
   * Record spending entry (pre-flight estimation)
   */
  async recordSpending(entry: {
    tenantId: string;
    correlationId: string;
    operationName: string;
    fieldName?: string;
    userId?: string;
    requestId?: string;
    provider: string;
    model: string;
    estPromptTokens: number;
    estCompletionTokens: number;
    estTotalUsd: number;
    estimationMethod?: 'precise' | 'heuristic' | 'cached';
  }): Promise<string> {
    try {
      const result = await this.pool.query(
        `SELECT record_spending($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          entry.tenantId,
          entry.correlationId,
          entry.operationName,
          entry.fieldName,
          entry.userId,
          entry.provider,
          entry.model,
          entry.estPromptTokens,
          entry.estCompletionTokens,
          entry.estTotalUsd,
          entry.estimationMethod || 'heuristic',
        ],
      );

      const ledgerId = result.rows[0].record_spending;

      logger.debug('Spending recorded in budget ledger', {
        ledgerId,
        tenantId: entry.tenantId,
        correlationId: entry.correlationId,
        estimatedUsd: entry.estTotalUsd,
      });

      return ledgerId;
    } catch (error) {
      logger.error('Failed to record spending', { error, entry });
      throw error;
    }
  }

  /**
   * Update with actual spending (post-reconciliation)
   */
  async reconcileSpending(
    ledgerId: string,
    actualTokens: {
      promptTokens: number;
      completionTokens: number;
      totalUsd: number;
    },
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        'SELECT reconcile_spending($1, $2, $3, $4)',
        [
          ledgerId,
          actualTokens.promptTokens,
          actualTokens.completionTokens,
          actualTokens.totalUsd,
        ],
      );

      const success = result.rows[0].reconcile_spending;

      if (success) {
        logger.debug('Spending reconciled in budget ledger', {
          ledgerId,
          actualUsd: actualTokens.totalUsd,
        });
      } else {
        logger.warn(
          'Failed to reconcile spending - entry not found or already reconciled',
          {
            ledgerId,
          },
        );
      }

      return success;
    } catch (error) {
      logger.error('Failed to reconcile spending', {
        error,
        ledgerId,
        actualTokens,
      });
      return false;
    }
  }

  /**
   * Mark spending as failed/rolled back
   */
  async markSpendingFailed(
    ledgerId: string,
    reason: string,
    status: 'failed' | 'rolled_back' = 'failed',
  ): Promise<boolean> {
    try {
      const result = await this.pool.query(
        `UPDATE budget_ledger
         SET status = $2, failed_reason = $3, updated_at = NOW()
         WHERE id = $1 AND status = 'estimated'`,
        [ledgerId, status, reason],
      );

      return result.rowCount > 0;
    } catch (error) {
      logger.error('Failed to mark spending as failed', {
        error,
        ledgerId,
        reason,
      });
      return false;
    }
  }

  /**
   * Get tenant budget configuration
   */
  async getTenantBudget(tenantId: string): Promise<TenantBudget | null> {
    try {
      const result = await this.pool.query(
        `SELECT tenant_id, monthly_usd_limit, daily_usd_limit, hard_cap,
                notification_threshold, emergency_contact, updated_by,
                updated_at, created_at, created_by, notes
         FROM tenant_budget
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
        [tenantId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        tenantId: row.tenant_id,
        monthlyUsdLimit: parseFloat(row.monthly_usd_limit),
        dailyUsdLimit: row.daily_usd_limit
          ? parseFloat(row.daily_usd_limit)
          : undefined,
        hardCap: row.hard_cap,
        notificationThreshold: parseFloat(row.notification_threshold),
        emergencyContact: row.emergency_contact,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
        createdAt: row.created_at,
        createdBy: row.created_by,
        notes: row.notes,
      };
    } catch (error) {
      logger.error('Failed to get tenant budget', { error, tenantId });
      return null;
    }
  }

  /**
   * Update tenant budget limits
   */
  async updateTenantBudget(
    tenantId: string,
    updates: {
      monthlyUsdLimit?: number;
      dailyUsdLimit?: number;
      hardCap?: boolean;
      notificationThreshold?: number;
      emergencyContact?: string;
      notes?: string;
    },
    updatedBy: string,
  ): Promise<boolean> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const setClauses: string[] = [];
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (updates.monthlyUsdLimit !== undefined) {
        setClauses.push(`monthly_usd_limit = $${paramIndex++}`);
        values.push(updates.monthlyUsdLimit);
      }

      if (updates.dailyUsdLimit !== undefined) {
        setClauses.push(`daily_usd_limit = $${paramIndex++}`);
        values.push(updates.dailyUsdLimit);
      }

      if (updates.hardCap !== undefined) {
        setClauses.push(`hard_cap = $${paramIndex++}`);
        values.push(updates.hardCap);
      }

      if (updates.notificationThreshold !== undefined) {
        setClauses.push(`notification_threshold = $${paramIndex++}`);
        values.push(updates.notificationThreshold);
      }

      if (updates.emergencyContact !== undefined) {
        setClauses.push(`emergency_contact = $${paramIndex++}`);
        values.push(updates.emergencyContact);
      }

      if (updates.notes !== undefined) {
        setClauses.push(`notes = $${paramIndex++}`);
        values.push(updates.notes);
      }

      setClauses.push(`updated_by = $${paramIndex++}`);
      values.push(updatedBy);

      if (setClauses.length === 1) {
        // Only updated_by was set
        await client.query('ROLLBACK');
        return false;
      }

      const result = await client.query(
        `UPDATE tenant_budget
         SET ${setClauses.join(', ')}, updated_at = NOW()
         WHERE tenant_id = $1 AND deleted_at IS NULL`,
        values,
      );

      await client.query('COMMIT');

      logger.info('Tenant budget updated', {
        tenantId,
        updates,
        updatedBy,
        rowsAffected: result.rowCount,
      });

      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to update tenant budget', {
        error,
        tenantId,
        updates,
      });
      return false;
    } finally {
      client.release();
    }
  }

  /**
   * Get budget utilization for tenant
   */
  async getBudgetUtilization(
    tenantId: string,
  ): Promise<BudgetUtilization | null> {
    try {
      const result = await this.pool.query(
        'SELECT * FROM budget_utilization WHERE tenant_id = $1',
        [tenantId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        tenantId: row.tenant_id,
        monthlyUsdLimit: parseFloat(row.monthly_usd_limit),
        dailyUsdLimit: row.daily_usd_limit
          ? parseFloat(row.daily_usd_limit)
          : undefined,
        hardCap: row.hard_cap,
        notificationThreshold: parseFloat(row.notification_threshold),
        emergencyContact: row.emergency_contact,
        updatedBy: row.updated_by || 'unknown',
        updatedAt: row.updated_at || new Date(),
        createdAt: row.created_at || new Date(),
        createdBy: row.created_by || 'unknown',
        currentMonthSpend: parseFloat(row.current_month_spend || 0),
        utilizationPct: parseFloat(row.utilization_pct || 0),
        status: row.status,
        remainingBudget: parseFloat(row.remaining_budget || 0),
      };
    } catch (error) {
      logger.error('Failed to get budget utilization', { error, tenantId });
      return null;
    }
  }

  /**
   * Get spending summary for tenant
   */
  async getSpendingSummary(
    tenantId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SpendingSummary> {
    try {
      let dateFilter = '';
      const params: any[] = [tenantId];

      if (startDate) {
        dateFilter += ' AND created_at >= $2';
        params.push(startDate);
      }

      if (endDate) {
        dateFilter += ` AND created_at <= $${params.length + 1}`;
        params.push(endDate);
      }

      const result = await this.pool.query(
        `
        SELECT
          tenant_id,
          COUNT(*) as total_operations,
          SUM(est_total_usd) as estimated_usd,
          SUM(actual_total_usd) as actual_usd,
          COALESCE(SUM(actual_total_usd), SUM(est_total_usd)) as total_usd,
          AVG(accuracy_ratio) FILTER (WHERE accuracy_ratio IS NOT NULL) as avg_accuracy_ratio
        FROM budget_ledger
        WHERE tenant_id = $1 AND status IN ('estimated', 'reconciled')${dateFilter}
        GROUP BY tenant_id
      `,
        params,
      );

      if (result.rows.length === 0) {
        return {
          tenantId,
          totalOperations: 0,
          estimatedUsd: 0,
          totalUsd: 0,
        };
      }

      const row = result.rows[0];
      return {
        tenantId: row.tenant_id,
        totalOperations: parseInt(row.total_operations),
        estimatedUsd: parseFloat(row.estimated_usd),
        actualUsd: row.actual_usd ? parseFloat(row.actual_usd) : undefined,
        totalUsd: parseFloat(row.total_usd),
        avgAccuracyRatio: row.avg_accuracy_ratio
          ? parseFloat(row.avg_accuracy_ratio)
          : undefined,
      };
    } catch (error) {
      logger.error('Failed to get spending summary', {
        error,
        tenantId,
        startDate,
        endDate,
      });
      return {
        tenantId,
        totalOperations: 0,
        estimatedUsd: 0,
        totalUsd: 0,
      };
    }
  }

  /**
   * Get detailed spending entries for audit
   */
  async getSpendingEntries(
    filters: {
      tenantId?: string;
      correlationId?: string;
      operationName?: string;
      provider?: string;
      status?: string;
      startDate?: Date;
      endDate?: Date;
    } = {},
    limit: number = 100,
    offset: number = 0,
  ): Promise<BudgetLedgerEntry[]> {
    try {
      const whereClauses = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.tenantId) {
        whereClauses.push(`tenant_id = $${paramIndex++}`);
        params.push(filters.tenantId);
      }

      if (filters.correlationId) {
        whereClauses.push(`correlation_id = $${paramIndex++}`);
        params.push(filters.correlationId);
      }

      if (filters.operationName) {
        whereClauses.push(`operation_name = $${paramIndex++}`);
        params.push(filters.operationName);
      }

      if (filters.provider) {
        whereClauses.push(`provider = $${paramIndex++}`);
        params.push(filters.provider);
      }

      if (filters.status) {
        whereClauses.push(`status = $${paramIndex++}`);
        params.push(filters.status);
      }

      if (filters.startDate) {
        whereClauses.push(`created_at >= $${paramIndex++}`);
        params.push(filters.startDate);
      }

      if (filters.endDate) {
        whereClauses.push(`created_at <= $${paramIndex++}`);
        params.push(filters.endDate);
      }

      params.push(limit, offset);

      const result = await this.pool.query(
        `
        SELECT * FROM budget_ledger
        WHERE ${whereClauses.join(' AND ')}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `,
        params,
      );

      return result.rows.map((row) => ({
        id: row.id,
        tenantId: row.tenant_id,
        correlationId: row.correlation_id,
        operationName: row.operation_name,
        fieldName: row.field_name,
        userId: row.user_id,
        requestId: row.request_id,
        provider: row.provider,
        model: row.model,
        estPromptTokens: parseInt(row.est_prompt_tokens),
        estCompletionTokens: parseInt(row.est_completion_tokens),
        estTotalUsd: parseFloat(row.est_total_usd),
        actualPromptTokens: row.actual_prompt_tokens
          ? parseInt(row.actual_prompt_tokens)
          : undefined,
        actualCompletionTokens: row.actual_completion_tokens
          ? parseInt(row.actual_completion_tokens)
          : undefined,
        actualTotalUsd: row.actual_total_usd
          ? parseFloat(row.actual_total_usd)
          : undefined,
        estimationMethod: row.estimation_method,
        accuracyRatio: row.accuracy_ratio
          ? parseFloat(row.accuracy_ratio)
          : undefined,
        status: row.status,
        reconciledAt: row.reconciled_at,
        failedReason: row.failed_reason,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    } catch (error) {
      logger.error('Failed to get spending entries', {
        error,
        filters,
        limit,
        offset,
      });
      return [];
    }
  }

  /**
   * Close database connections
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}

// Global instance
let globalBudgetLedger: BudgetLedgerManager | null = null;

export function getBudgetLedgerManager(): BudgetLedgerManager {
  if (!globalBudgetLedger) {
    globalBudgetLedger = new BudgetLedgerManager();
  }
  return globalBudgetLedger;
}
