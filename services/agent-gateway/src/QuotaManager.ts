/**
 * Quota Manager
 * AGENT-8: Rate Limiting & Quotas
 */

import type { AgentRun, AgentQuota, QuotaType, QuotaCheck } from './types.js';

export class QuotaManager {
  constructor(private db: any) {}

  /**
   * Check if agent has exceeded any quotas
   * AGENT-8b: Integrate with existing rate limiter
   */
  async checkQuotas(agentId: string): Promise<void> {
    const now = new Date();

    // Check daily run quota
    await this.checkQuota(agentId, 'daily_runs', now);

    // Check hourly API call quota
    await this.checkQuota(agentId, 'hourly_api_calls', now);

    // Check daily API call quota
    await this.checkQuota(agentId, 'daily_api_calls', now);
  }

  /**
   * Check a specific quota type
   */
  private async checkQuota(
    agentId: string,
    quotaType: QuotaType,
    now: Date
  ): Promise<QuotaCheck> {
    const quota = await this.getOrCreateQuota(agentId, quotaType, now);

    if (quota.quotaUsed >= quota.quotaLimit) {
      throw {
        code: 'QUOTA_EXCEEDED',
        message: `Quota exceeded for ${quotaType}. Limit: ${quota.quotaLimit}, Used: ${quota.quotaUsed}`,
        details: {
          quotaType,
          limit: quota.quotaLimit,
          used: quota.quotaUsed,
          resetsAt: quota.resetAt || quota.periodEnd,
        },
      };
    }

    return {
      allowed: true,
      quotaType,
      limit: quota.quotaLimit,
      used: quota.quotaUsed,
      remaining: quota.quotaLimit - quota.quotaUsed,
      resetsAt: quota.resetAt || quota.periodEnd,
    };
  }

  /**
   * Record usage after successful run
   */
  async recordUsage(agentId: string, run: AgentRun): Promise<void> {
    const now = new Date();

    // Record run
    await this.incrementQuota(agentId, 'daily_runs', 1, now);
    await this.incrementQuota(agentId, 'monthly_runs', 1, now);

    // Record API calls
    if (run.apiCallsMade > 0) {
      await this.incrementQuota(agentId, 'hourly_api_calls', run.apiCallsMade, now);
      await this.incrementQuota(agentId, 'daily_api_calls', run.apiCallsMade, now);
      await this.incrementQuota(agentId, 'monthly_api_calls', run.apiCallsMade, now);
    }

    // Record tokens
    if (run.tokensConsumed) {
      await this.incrementQuota(agentId, 'daily_tokens', run.tokensConsumed, now);
      await this.incrementQuota(agentId, 'monthly_tokens', run.tokensConsumed, now);
    }
  }

  /**
   * Get or create quota for a period
   */
  private async getOrCreateQuota(
    agentId: string,
    quotaType: QuotaType,
    now: Date
  ): Promise<AgentQuota> {
    const { periodStart, periodEnd } = this.getPeriodBounds(quotaType, now);

    // Try to get existing quota
    const result = await this.db.query(
      `SELECT * FROM agent_quotas
       WHERE agent_id = $1 AND quota_type = $2
       AND period_start = $3 AND period_end = $4`,
      [agentId, quotaType, periodStart, periodEnd]
    );

    if (result.rows.length > 0) {
      return this.mapRowToQuota(result.rows[0]);
    }

    // Create new quota
    const limit = this.getDefaultLimit(quotaType);
    const insertResult = await this.db.query(
      `INSERT INTO agent_quotas (
        agent_id, quota_type, quota_limit, quota_used,
        period_start, period_end, reset_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [agentId, quotaType, limit, 0, periodStart, periodEnd, periodEnd]
    );

    return this.mapRowToQuota(insertResult.rows[0]);
  }

  /**
   * Increment quota usage
   */
  private async incrementQuota(
    agentId: string,
    quotaType: QuotaType,
    amount: number,
    now: Date
  ): Promise<void> {
    const { periodStart, periodEnd } = this.getPeriodBounds(quotaType, now);

    await this.db.query(
      `INSERT INTO agent_quotas (
        agent_id, quota_type, quota_limit, quota_used,
        period_start, period_end, reset_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (agent_id, quota_type, period_start)
      DO UPDATE SET
        quota_used = agent_quotas.quota_used + $4,
        updated_at = CURRENT_TIMESTAMP`,
      [
        agentId,
        quotaType,
        this.getDefaultLimit(quotaType),
        amount,
        periodStart,
        periodEnd,
        periodEnd,
      ]
    );
  }

  /**
   * Get period bounds for quota type
   */
  private getPeriodBounds(quotaType: QuotaType, now: Date): { periodStart: Date; periodEnd: Date } {
    const periodStart = new Date(now);
    const periodEnd = new Date(now);

    if (quotaType.startsWith('hourly_')) {
      // Hourly period
      periodStart.setMinutes(0, 0, 0);
      periodEnd.setHours(periodStart.getHours() + 1, 0, 0, 0);
    } else if (quotaType.startsWith('daily_')) {
      // Daily period
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setDate(periodStart.getDate() + 1);
      periodEnd.setHours(0, 0, 0, 0);
    } else if (quotaType.startsWith('monthly_')) {
      // Monthly period
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd.setMonth(periodStart.getMonth() + 1);
      periodEnd.setDate(1);
      periodEnd.setHours(0, 0, 0, 0);
    }

    return { periodStart, periodEnd };
  }

  /**
   * Get default limit for quota type
   * AGENT-8a: Define agent limit config format
   */
  private getDefaultLimit(quotaType: QuotaType): number {
    const defaults: Record<QuotaType, number> = {
      hourly_api_calls: 1000,
      daily_api_calls: 10000,
      monthly_api_calls: 300000,
      daily_runs: 100,
      monthly_runs: 3000,
      daily_tokens: 100000,
      monthly_tokens: 3000000,
    };

    return defaults[quotaType] || 1000;
  }

  /**
   * Get quota status for an agent
   */
  async getQuotaStatus(agentId: string): Promise<QuotaCheck[]> {
    const now = new Date();
    const quotaTypes: QuotaType[] = [
      'daily_runs',
      'monthly_runs',
      'hourly_api_calls',
      'daily_api_calls',
      'monthly_api_calls',
      'daily_tokens',
      'monthly_tokens',
    ];

    const checks: QuotaCheck[] = [];

    for (const quotaType of quotaTypes) {
      const quota = await this.getOrCreateQuota(agentId, quotaType, now);
      checks.push({
        allowed: quota.quotaUsed < quota.quotaLimit,
        quotaType,
        limit: quota.quotaLimit,
        used: quota.quotaUsed,
        remaining: quota.quotaLimit - quota.quotaUsed,
        resetsAt: quota.resetAt || quota.periodEnd,
      });
    }

    return checks;
  }

  /**
   * Reset quotas (for testing or manual reset)
   */
  async resetQuota(agentId: string, quotaType: QuotaType): Promise<void> {
    const now = new Date();
    const { periodStart, periodEnd } = this.getPeriodBounds(quotaType, now);

    await this.db.query(
      `UPDATE agent_quotas
       SET quota_used = 0, updated_at = CURRENT_TIMESTAMP
       WHERE agent_id = $1 AND quota_type = $2
       AND period_start = $3 AND period_end = $4`,
      [agentId, quotaType, periodStart, periodEnd]
    );
  }

  // =========================================================================
  // Mappers
  // =========================================================================

  private mapRowToQuota(row: any): AgentQuota {
    return {
      id: row.id,
      agentId: row.agent_id,
      quotaType: row.quota_type,
      quotaLimit: row.quota_limit,
      quotaUsed: row.quota_used,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      resetAt: row.reset_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
