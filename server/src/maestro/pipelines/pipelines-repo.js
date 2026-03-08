"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelinesRepo = exports.PipelinesRepo = void 0;
const database_js_1 = require("../../config/database.js");
class PipelinesRepo {
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
      CREATE TABLE IF NOT EXISTS pipelines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        spec JSONB NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        tenant_id TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_pipelines_name ON pipelines(name);
      CREATE INDEX IF NOT EXISTS idx_pipelines_tenant_id ON pipelines(tenant_id);
    `);
        this.initialized = true;
    }
    async create(name, spec, tenantId) {
        await this.ensureTable();
        const { rows } = await this.getPool().query(`INSERT INTO pipelines (name, spec, tenant_id) VALUES ($1, $2, $3)
       RETURNING id, name, spec, created_at, updated_at, tenant_id`, [name, spec, tenantId]);
        return rows[0];
    }
    async list(tenantId) {
        await this.ensureTable();
        const { rows } = await this.getPool().query(`SELECT id, name, spec, created_at, updated_at, tenant_id FROM pipelines WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId]);
        return rows;
    }
    async get(id, tenantId) {
        await this.ensureTable();
        const { rows } = await this.getPool().query(`SELECT id, name, spec, created_at, updated_at, tenant_id FROM pipelines WHERE id=$1 AND tenant_id = $2`, [id, tenantId]);
        return rows[0] || null;
    }
    async update(id, patch, tenantId) {
        await this.ensureTable();
        const sets = [];
        const vals = [];
        let i = 1;
        if (patch.name !== undefined) {
            sets.push(`name=$${i++}`);
            vals.push(patch.name);
        }
        if (patch.spec !== undefined) {
            sets.push(`spec=$${i++}`);
            vals.push(patch.spec);
        }
        sets.push(`updated_at=CURRENT_TIMESTAMP`);
        vals.push(id);
        vals.push(tenantId);
        const { rows } = await this.getPool().query(`UPDATE pipelines SET ${sets.join(', ')} WHERE id=$${i} AND tenant_id = $${i + 1}
       RETURNING id, name, spec, created_at, updated_at, tenant_id`, vals);
        return rows[0] || null;
    }
    async delete(id, tenantId) {
        await this.ensureTable();
        const { rowCount } = await this.getPool().query(`DELETE FROM pipelines WHERE id=$1 AND tenant_id = $2`, [id, tenantId]);
        return rowCount > 0;
    }
}
exports.PipelinesRepo = PipelinesRepo;
let _pipelinesRepo = null;
exports.pipelinesRepo = {
    get instance() {
        if (!_pipelinesRepo) {
            _pipelinesRepo = new PipelinesRepo();
        }
        return _pipelinesRepo;
    },
    // Proxy methods for backward compatibility
    async create(name, spec, tenantId) {
        return this.instance.create(name, spec, tenantId);
    },
    async list(tenantId) {
        return this.instance.list(tenantId);
    },
    async get(id, tenantId) {
        return this.instance.get(id, tenantId);
    },
    async update(id, patch, tenantId) {
        return this.instance.update(id, patch, tenantId);
    },
    async delete(id, tenantId) {
        return this.instance.delete(id, tenantId);
    },
};
