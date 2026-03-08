"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tasksRepo = void 0;
const crypto_1 = require("crypto");
const database_js_1 = require("../../config/database.js");
let pool = null;
function getPool() {
    if (!pool) {
        pool = (0, database_js_1.getPostgresPool)();
    }
    return pool;
}
class TasksRepo {
    async listByRun(runId, tenantId) {
        const query = `
      SELECT id, run_id, parent_task_id, status, kind, description,
             input_params, output_data, error_message, created_at, updated_at, tenant_id
      FROM tasks
      WHERE run_id = $1 AND tenant_id = $2
      ORDER BY created_at ASC
    `;
        const result = await getPool().query(query, [runId, tenantId]);
        return result.rows;
    }
    async get(id, tenantId) {
        const query = `
      SELECT id, run_id, parent_task_id, status, kind, description,
             input_params, output_data, error_message, created_at, updated_at, tenant_id
      FROM tasks
      WHERE id = $1 AND tenant_id = $2
    `;
        const result = await getPool().query(query, [id, tenantId]);
        return result.rows[0] || null;
    }
    async create(data) {
        const id = (0, crypto_1.randomUUID)();
        const query = `
      INSERT INTO tasks (id, run_id, parent_task_id, kind, description, input_params, tenant_id, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
      RETURNING id, run_id, parent_task_id, status, kind, description,
                input_params, output_data, error_message, created_at, updated_at, tenant_id
    `;
        const result = await getPool().query(query, [
            id,
            data.run_id,
            data.parent_task_id,
            data.kind,
            data.description,
            JSON.stringify(data.input_params || {}),
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
        // Prevent overwriting a terminal state (cancelled) with a new state unless explicitly handled
        // However, if we are marking as failed, we might want to overwrite running.
        // The main risk is overwriting 'cancelled' with 'succeeded'.
        let whereClause = `WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}`;
        // Safety check: if we are trying to set succeeded, ensure it's not cancelled
        if (data.status === 'succeeded') {
            whereClause += ` AND status != 'cancelled'`;
        }
        const query = `
      UPDATE tasks
      SET ${sets.join(', ')}, updated_at = NOW()
      ${whereClause}
      RETURNING id, run_id, parent_task_id, status, kind, description,
                input_params, output_data, error_message, created_at, updated_at, tenant_id
    `;
        values.push(id);
        values.push(tenantId);
        const result = await getPool().query(query, values);
        return result.rows[0] || null;
    }
    // Used for cancellation
    async updateStatusByRunId(runId, status, tenantId) {
        const query = `
        UPDATE tasks
        SET status = $1, updated_at = NOW()
        WHERE run_id = $2 AND tenant_id = $3 AND status IN ('queued', 'running')
    `;
        await getPool().query(query, [status, runId, tenantId]);
    }
}
let _tasksRepo = null;
exports.tasksRepo = {
    get instance() {
        if (!_tasksRepo) {
            _tasksRepo = new TasksRepo();
        }
        return _tasksRepo;
    },
    async listByRun(runId, tenantId) {
        return this.instance.listByRun(runId, tenantId);
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
    async updateStatusByRunId(runId, status, tenantId) {
        return this.instance.updateStatusByRunId(runId, status, tenantId);
    }
};
