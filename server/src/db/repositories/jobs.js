"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsRepo = void 0;
class JobsRepo {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async insert(tenantId, row) {
        const q = `INSERT INTO ai_jobs (id, tenant_id, kind, status, created_at, meta) VALUES ($1,$2,$3,$4,$5,$6)`;
        await this.withTenant(tenantId, (client) => client.query(q, [
            row.id,
            tenantId,
            row.kind,
            row.status,
            row.createdAt,
            row.meta || {},
        ]));
    }
    async update(tenantId, id, patch) {
        const q = `UPDATE ai_jobs SET status=COALESCE($3,status), finished_at=COALESCE($4,finished_at), error=COALESCE($5,error) WHERE id=$1 AND tenant_id=$2`;
        await this.withTenant(tenantId, (client) => client.query(q, [id, tenantId, patch.status, patch.finishedAt, patch.error]));
    }
    async findById(tenantId, id) {
        const { rows } = await this.withTenant(tenantId, (client) => client.query(`SELECT * FROM ai_jobs WHERE id=$1 AND tenant_id=$2`, [
            id,
            tenantId,
        ]));
        return rows[0];
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
exports.JobsRepo = JobsRepo;
