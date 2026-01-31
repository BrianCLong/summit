import { Pool } from 'pg';
import logger from '../../../config/logger.js';
import { CaseDashboardMetrics } from '../types.js';

const repoLogger = logger.child({ name: 'CaseDashboardReadModelRepo' });

type MetricsRow = {
  case_id: string;
  tenant_id: string;
  participant_count: number;
  open_task_count: number;
  breached_sla_count: number;
  at_risk_sla_count: number;
  pending_approval_count: number;
  last_task_due_at: Date | null;
  refreshed_at: Date | null;
};

export class CaseDashboardReadModelRepo {
  constructor(private pg: Pool) {}

  async getSummariesForTenant(
    tenantId: string,
    caseIds?: string[],
  ): Promise<Map<string, CaseDashboardMetrics>> {
    const params: (string | string[])[] = [tenantId];
    let query = `
      SELECT
        case_id,
        tenant_id,
        participant_count,
        open_task_count,
        breached_sla_count,
        at_risk_sla_count,
        pending_approval_count,
        last_task_due_at,
        refreshed_at
      FROM maestro.case_dashboard_read_models
      WHERE tenant_id = $1
    `;

    if (caseIds?.length) {
      params.push(caseIds);
      query += ` AND case_id = ANY($2)`;
    }

    const { rows } = (await this.pg.query(query, params)) as { rows: MetricsRow[] };

    const mapped = new Map<string, CaseDashboardMetrics>();
    rows.forEach((row: MetricsRow) => {
      mapped.set(row.case_id, this.mapRow(row));
    });

    return mapped;
  }

  async refreshCase(caseId: string): Promise<void> {
    await this.pg.query(`SELECT maestro.refresh_case_dashboard_read_model($1)`, [
      caseId,
    ]);
    repoLogger.debug({ caseId }, 'Refreshed case dashboard read model');
  }

  private mapRow(row: MetricsRow): CaseDashboardMetrics {
    return {
      participantCount: row.participant_count || 0,
      openTaskCount: row.open_task_count || 0,
      breachedSlaCount: row.breached_sla_count || 0,
      atRiskSlaCount: row.at_risk_sla_count || 0,
      pendingApprovalCount: row.pending_approval_count || 0,
      lastTaskDueAt: row.last_task_due_at,
      refreshedAt: row.refreshed_at || undefined,
    };
  }
}
