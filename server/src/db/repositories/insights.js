"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsightsRepo = void 0;
class InsightsRepo {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async insert(tenantId, row) {
        const q = `INSERT INTO ai_insights (id, tenant_id, job_id, kind, payload, status, created_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`;
        const v = [
            row.id,
            tenantId,
            row.jobId,
            row.kind,
            row.payload,
            row.status,
            row.createdAt,
        ];
        const { rows } = await this.withTenant(tenantId, (client) => client.query(q, v));
        return rows[0];
    }
    async findMany(tenantId, { status, kind } = {}) {
        const cond = [`tenant_id = $${1}`];
        const args = [tenantId];
        if (status) {
            args.push(status);
            cond.push(`status = $${args.length}`);
        }
        if (kind) {
            args.push(kind);
            cond.push(`kind = $${args.length}`);
        }
        const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
        const { rows } = await this.withTenant(tenantId, (client) => client.query(`SELECT * FROM ai_insights ${where} ORDER BY created_at DESC`, args));
        return rows;
    }
    async update(tenantId, id, patch) {
        const { rows } = await this.withTenant(tenantId, (client) => client.query(`UPDATE ai_insights SET status=$3, decided_at=$4, decided_by=$5 WHERE id=$1 AND tenant_id=$2 RETURNING *`, [id, tenantId, patch.status, patch.decidedAt, patch.decidedBy]));
        return rows[0];
    }
    async markApplied(tenantId, id) {
        await this.withTenant(tenantId, (client) => client.query(`UPDATE ai_insights SET applied_at = NOW() WHERE id=$1 AND tenant_id=$2`, [id, tenantId]));
    }
    async withTenant(tenantId, fn) {
        const client = await this.pool.connect();
        try {
            await client.query('SET LOCAL app.current_tenant = $1', [tenantId]);
            return await fn(client);
        }
        finally {
            client.release();
        }
    }
}
exports.InsightsRepo = InsightsRepo;
