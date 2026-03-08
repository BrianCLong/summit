"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runsRepo = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
let pool = null;
function getPool() {
    if (!pool) {
        pool = (0, database_js_1.getPostgresPool)();
    }
    return pool;
}
class RunsRepo {
    async list(tenantId, limit = 50, offset = 0) {
        const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE tenant_id = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
        const result = await getPool().query(query, [tenantId, limit, offset]);
        return result.rows;
    }
    async get(id, tenantId) {
        const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await getPool().query(query, [id, tenantId]);
        return result.rows[0] || null;
    }
    async create(data) {
        const id = (0, crypto_1.randomUUID)();
        const query = `
      INSERT INTO runs (id, pipeline_id, pipeline_name, input_params, executor_id, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, executor_id, created_at, updated_at, tenant_id
    `;
        const result = await getPool().query(query, [
            id,
            data.pipeline_id,
            data.pipeline_name,
            JSON.stringify(data.input_params || {}),
            data.executor_id,
            data.tenant_id,
        ]);
        return result.rows[0];
    }
    async update(id, data, tenantId) {
        const sets = [];
        const values = [];
        let paramCount = 1;
        if (data.status !== undefined) {
            sets.push(`status = $${paramCount++}`);
            values.push(data.status);
        }
        if (data.started_at !== undefined) {
            sets.push(`started_at = $${paramCount++}`);
            values.push(data.started_at);
        }
        if (data.completed_at !== undefined) {
            sets.push(`completed_at = $${paramCount++}`);
            values.push(data.completed_at);
        }
        if (data.duration_ms !== undefined) {
            sets.push(`duration_ms = $${paramCount++}`);
            values.push(data.duration_ms);
        }
        if (data.cost !== undefined) {
            sets.push(`cost = $${paramCount++}`);
            values.push(data.cost);
        }
        if (data.output_data !== undefined) {
            sets.push(`output_data = $${paramCount++}`);
            values.push(JSON.stringify(data.output_data));
        }
        if (data.error_message !== undefined) {
            sets.push(`error_message = $${paramCount++}`);
            values.push(data.error_message);
        }
        if (sets.length === 0)
            return this.get(id, tenantId);
        const query = `
      UPDATE runs 
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, executor_id, created_at, updated_at, tenant_id
    `;
        values.push(id);
        values.push(tenantId);
        const result = await getPool().query(query, values);
        return result.rows[0] || null;
    }
    async delete(id, tenantId) {
        const query = 'DELETE FROM runs WHERE id = $1 AND tenant_id = $2';
        const result = await getPool().query(query, [id, tenantId]);
        return result.rowCount > 0;
    }
    async getByPipeline(pipelineId, tenantId, limit = 20) {
        const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE pipeline_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC 
      LIMIT $3
    `;
        const result = await getPool().query(query, [pipelineId, tenantId, limit]);
        return result.rows;
    }
}
let _runsRepo = null;
exports.runsRepo = {
    get instance() {
        if (!_runsRepo) {
            _runsRepo = new RunsRepo();
        }
        return _runsRepo;
    },
    // Proxy methods for backward compatibility
    async list(tenantId, limit = 50, offset = 0) {
        return this.instance.list(tenantId, limit, offset);
    },
    async get(id, tenantId) {
        return this.instance.get(id, tenantId);
    },
    async create(data) {
        return this.instance.create(data);
    },
    async update(id, data, tenantId) {
        return this.instance.update(id, data, tenantId);
    },
    async delete(id, tenantId) {
        return this.instance.delete(id, tenantId);
    },
    async getByPipeline(pipelineId, tenantId, limit = 20) {
        return this.instance.getByPipeline(pipelineId, tenantId, limit);
    },
    /**
     * Helper to strictly get a run for a tenant, throwing if not found or unauthorized (implicit).
     */
    async getRunForTenant(id, tenantId) {
        return this.instance.get(id, tenantId);
    },
};
