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

export interface Task {
  id: string;
  run_id: string;
  name: string;
  type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  input_params?: any;
  output_data?: any;
  error_message?: string;
  idempotency_key?: string;
  retries: number;
  created_at: Date;
  updated_at: Date;
  tenant_id: string;
}

export interface TaskCreateInput {
  run_id: string;
  name: string;
  type: string;
  input_params?: any;
  idempotency_key?: string;
  tenant_id: string;
}

export interface TaskUpdateInput {
  status?: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  output_data?: any;
  error_message?: string;
  retries?: number;
}

class TasksRepo {
  async create(data: TaskCreateInput): Promise<Task> {
    const id = uuidv4();
    const query = `
      INSERT INTO tasks (
        id, run_id, name, type, input_params, idempotency_key, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await getPool().query(query, [
      id,
      data.run_id,
      data.name,
      data.type,
      JSON.stringify(data.input_params || {}),
      data.idempotency_key,
      data.tenant_id,
    ]);
    return result.rows[0];
  }

  async update(id: string, data: TaskUpdateInput, tenantId: string): Promise<Task | null> {
    const sets: string[] = [];
    const values: any[] = [];
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
    if (data.retries !== undefined) {
      sets.push(`retries = $${paramCount++}`);
      values.push(data.retries);
    }

    if (sets.length === 0) return this.get(id, tenantId);

    const query = `
      UPDATE tasks
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING *
    `;
    values.push(id, tenantId);

    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  async get(id: string, tenantId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1 AND tenant_id = $2';
    const result = await getPool().query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async listByRun(runId: string, tenantId: string): Promise<Task[]> {
    const query = 'SELECT * FROM tasks WHERE run_id = $1 AND tenant_id = $2 ORDER BY created_at ASC';
    const result = await getPool().query(query, [runId, tenantId]);
    return result.rows;
  }

  async getByIdempotencyKey(runId: string, idempotencyKey: string, tenantId: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE run_id = $1 AND idempotency_key = $2 AND tenant_id = $3';
    const result = await getPool().query(query, [runId, idempotencyKey, tenantId]);
    return result.rows[0] || null;
  }
}

export const tasksRepo = new TasksRepo();
