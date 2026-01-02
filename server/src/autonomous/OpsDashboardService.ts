import { Pool } from 'pg';
import { Logger } from 'pino';

export class OpsDashboardService {
  private db: Pool;
  private logger: Logger;

  constructor(db: Pool, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  async getDashboardData(tenantId: string) {
    try {
      const [approvals, actions] = await Promise.all([
        this.getPendingApprovals(tenantId),
        this.getRecentActions(tenantId),
      ]);

      return {
        tenantId,
        pendingApprovals: approvals,
        recentActions: actions,
        generatedAt: new Date(),
      };
    } catch (error: any) {
      this.logger.error({ tenantId, error }, 'Failed to get dashboard data');
      throw error;
    }
  }

  private async getPendingApprovals(tenantId: string) {
    const result = await this.db.query(
      `SELECT id, action_type, reason, requested_at
       FROM autonomous_approvals
       WHERE tenant_id = $1 AND status = 'pending'
       ORDER BY requested_at DESC`,
      [tenantId]
    );
    return result.rows;
  }

  private async getRecentActions(tenantId: string) {
      // Assuming we have an 'autonomous_actions_log' table or similar.
      // For now, we'll query the approvals table for completed ones as a proxy,
      // but in a real system we'd query the event ledger.
    const result = await this.db.query(
      `SELECT id, action_type, status, responded_at, response_reason
       FROM autonomous_approvals
       WHERE tenant_id = $1 AND status IN ('approved', 'rejected')
       ORDER BY responded_at DESC
       LIMIT 20`,
      [tenantId]
    );
    return result.rows;
  }

  // Placeholder for the "Autonomous Ops Report" aggregation
  async generateMonthlyReport(tenantId: string) {
      // Aggregate stats on actions taken, approvals vs rejections, accuracy of predictions
      return {
          reportPeriod: 'Current Month',
          totalActions: 0,
          autonomousActions: 0,
          humanInterventions: 0,
          savedHours: 0
      };
  }
}
