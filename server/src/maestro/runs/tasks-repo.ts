import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import { getPostgresPool } from '../../config/database.js';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = getPostgresPool();
  }
  return pool;
}

export interface TaskRecord {
  id: string;
  run_id: string;
  parent_task_id?: string;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  kind: string;
  description?: string;
  input_params?: any;
  output_data?: any;
  error_message?: string;
  created_at: Date;
  updated_at: Date;
  tenant_id: string;
}

export interface TaskCreateInput {
  run_id: string;
  parent_task_id?: string;
  kind: string;
  description?: string;
  input_params?: any;
  tenant_id: string;
}

export interface TaskUpdateInput {
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  output_data?: any;
  error_message?: string;
}

class TasksRepo {
  async listByRun(runId: string, tenantId: string): Promise<TaskRecord[]> {
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

  async get(id: string, tenantId: string): Promise<TaskRecord | null> {
    const query = `
      SELECT id, run_id, parent_task_id, status, kind, description,
             input_params, output_data, error_message, created_at, updated_at, tenant_id
      FROM tasks
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await getPool().query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async create(data: TaskCreateInput): Promise<TaskRecord> {
    const id = uuidv4();
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

  async update(
    id: string,
    data: TaskUpdateInput,
    tenantId: string,
  ): Promise<TaskRecord | null> {
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

    if (sets.length === 0) return this.get(id, tenantId);

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
  async updateStatusByRunId(runId: string, status: string, tenantId: string): Promise<void> {
    const query = `
        UPDATE tasks
        SET status = $1, updated_at = NOW()
        WHERE run_id = $2 AND tenant_id = $3 AND status IN ('queued', 'running')
    `;
    await getPool().query(query, [status, runId, tenantId]);
  }
}

let _tasksRepo: TasksRepo | null = null;

export const tasksRepo = {
  get instance(): TasksRepo {
    if (!_tasksRepo) {
      _tasksRepo = new TasksRepo();
    }
    return _tasksRepo;
  },

  async listByRun(runId: string, tenantId: string): Promise<TaskRecord[]> {
    return this.instance.listByRun(runId, tenantId);
  },

  async get(id: string, tenantId: string): Promise<TaskRecord | null> {
    return this.instance.get(id, tenantId);
  },

  async create(data: TaskCreateInput): Promise<TaskRecord> {
    return this.instance.create(data);
  },

  async update(
    id: string,
    data: TaskUpdateInput,
    tenantId: string,
  ): Promise<TaskRecord | null> {
    return this.instance.update(id, data, tenantId);
  },

  async updateStatusByRunId(runId: string, status: string, tenantId: string): Promise<void> {
     return this.instance.updateStatusByRunId(runId, status, tenantId);
  }
};
