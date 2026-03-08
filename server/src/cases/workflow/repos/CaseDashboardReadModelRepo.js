"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CaseDashboardReadModelRepo = void 0;
const logger_js_1 = __importDefault(require("../../../config/logger.js"));
const repoLogger = logger_js_1.default.child({ name: 'CaseDashboardReadModelRepo' });
class CaseDashboardReadModelRepo {
    pg;
    constructor(pg) {
        this.pg = pg;
    }
    async getSummariesForTenant(tenantId, caseIds) {
        const params = [tenantId];
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
        const { rows } = (await this.pg.query(query, params));
        const mapped = new Map();
        rows.forEach((row) => {
            mapped.set(row.case_id, this.mapRow(row));
        });
        return mapped;
    }
    async refreshCase(caseId) {
        await this.pg.query(`SELECT maestro.refresh_case_dashboard_read_model($1)`, [
            caseId,
        ]);
        repoLogger.debug({ caseId }, 'Refreshed case dashboard read model');
    }
    mapRow(row) {
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
exports.CaseDashboardReadModelRepo = CaseDashboardReadModelRepo;
