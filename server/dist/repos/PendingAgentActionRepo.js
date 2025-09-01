export class PendingAgentActionRepo {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async create(e) {
        const sql = `INSERT INTO pending_agent_actions (incident_id, tenant_id, created_by, plan, approval_token) VALUES ($1,$2,$3,$4::jsonb,$5) RETURNING id`;
        const { rows } = await this.pool.query(sql, [e.incidentId ?? null, e.tenantId ?? null, e.createdBy, JSON.stringify(e.plan), e.approvalToken ?? null]);
        return rows[0].id;
    }
    async get(id) {
        const sql = `SELECT id, incident_id, created_by, plan, status, approval_token, approved_by, approved_at, created_at, updated_at FROM pending_agent_actions WHERE id=$1`;
        const { rows } = await this.pool.query(sql, [id]);
        const r = rows[0];
        if (!r)
            return null;
        return {
            id: r.id,
            incidentId: r.incident_id,
            createdBy: r.created_by,
            plan: r.plan,
            status: r.status,
            approvalToken: r.approval_token,
            approvedBy: r.approved_by,
            approvedAt: r.approved_at,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        };
    }
    async approve(id, approvedBy) {
        const sql = `UPDATE pending_agent_actions SET status='APPROVED', approved_by=$2, approved_at=now() WHERE id=$1 AND status='PENDING'`;
        const res = await this.pool.query(sql, [id, approvedBy]);
        if (res.rowCount === 0)
            throw new Error('approve: not found or not pending');
    }
    async deny(id, approvedBy) {
        const sql = `UPDATE pending_agent_actions SET status='DENIED', approved_by=$2, approved_at=now() WHERE id=$1 AND status='PENDING'`;
        const res = await this.pool.query(sql, [id, approvedBy]);
        if (res.rowCount === 0)
            throw new Error('deny: not found or not pending');
    }
    async markExecuted(id, ok) {
        const sql = `UPDATE pending_agent_actions SET status=$2 WHERE id=$1`;
        await this.pool.query(sql, [id, ok ? 'EXECUTED' : 'FAILED']);
    }
    async cancelOlderThan(tenantId, isoCut) {
        // Note: tenantId is currently not stored in table; this filters by time only.
        const sql = `UPDATE pending_agent_actions SET status='CANCELLED' WHERE status='PENDING' AND updated_at < $1`;
        const res = await this.pool.query(sql, [isoCut]);
        return res.rowCount;
    }
    async cancelByIncident(incidentId) {
        const sql = `UPDATE pending_agent_actions SET status='CANCELLED', updated_at=NOW() WHERE incident_id = $1 AND status='PENDING'`;
        const res = await this.pool.query(sql, [incidentId]);
        return res.rowCount;
    }
    async countPendingByTenant() {
        const { rows } = await this.pool.query(`SELECT COALESCE(tenant_id,'global') AS tenant_id, COUNT(1) AS cnt
         FROM pending_agent_actions WHERE status='PENDING'
         GROUP BY COALESCE(tenant_id,'global')`);
        return rows.map((r) => ({ tenant_id: r.tenant_id, cnt: Number(r.cnt) }));
    }
}
//# sourceMappingURL=PendingAgentActionRepo.js.map