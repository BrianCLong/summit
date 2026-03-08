"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.executorsRepo = exports.ExecutorsRepo = void 0;
const database_js_1 = require("../../config/database.js");
class ExecutorsRepo {
    pool = null;
    initialized = false;
    getPool() {
        if (!this.pool) {
            this.pool = (0, database_js_1.getPostgresPool)();
        }
        return this.pool;
    }
    async ensureTable() {
        if (this.initialized)
            return;
        // The table creation is handled by migrations now, but we keep this for initial setup if no migrations are run
        await this.getPool().query(`
      CREATE TABLE IF NOT EXISTS executors (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL,
        labels TEXT[] NOT NULL DEFAULT '{}',
        capacity INT NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'ready',
        last_heartbeat TIMESTAMP,
        tenant_id TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_executors_tenant_id ON executors(tenant_id);
    `);
        this.initialized = true;
    }
    async create(r, tenantId) {
        await this.ensureTable();
        const { rows } = await this.getPool().query(`INSERT INTO executors (name, kind, labels, capacity, status, tenant_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       RETURNING id, name, kind, labels, capacity, status, last_heartbeat, tenant_id`, [r.name, r.kind, r.labels, r.capacity, r.status, tenantId]);
        return rows[0];
    }
    async list(tenantId) {
        await this.ensureTable();
        const { rows } = await this.getPool().query(`SELECT id, name, kind, labels, capacity, status, last_heartbeat, tenant_id FROM executors WHERE tenant_id = $1 ORDER BY name`, [tenantId]);
        return rows;
    }
    async update(id, updates, tenantId) {
        await this.ensureTable();
        const fields = [];
        const values = [];
        let idx = 1;
        if (updates.status) {
            fields.push(`status = $${idx++}`);
            values.push(updates.status);
        }
        // Add other fields as needed
        if (fields.length === 0)
            return null;
        values.push(id);
        values.push(tenantId);
        const { rows } = await this.getPool().query(`UPDATE executors SET ${fields.join(', ')} WHERE id = $${idx} AND tenant_id = $${idx + 1} RETURNING *`, values);
        return rows[0] || null;
    }
}
exports.ExecutorsRepo = ExecutorsRepo;
let _executorsRepo = null;
exports.executorsRepo = {
    get instance() {
        if (!_executorsRepo) {
            _executorsRepo = new ExecutorsRepo();
        }
        return _executorsRepo;
    },
    // Proxy methods for backward compatibility
    async create(r, tenantId) {
        return this.instance.create(r, tenantId);
    },
    async list(tenantId) {
        return this.instance.list(tenantId);
    },
    async update(id, updates, tenantId) {
        return this.instance.update(id, updates, tenantId);
    }
};
