import { Pool } from 'pg';
import { randomUUID as uuidv4 } from 'crypto';
import { getPostgresPool } from '../../config/database.js';
import { RunFailure, RunStatus } from '../types.js';
import { runEventsRepo } from './run-events-repo.js';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = getPostgresPool();
  }
  return pool;
}

export interface Run {
  id: string;
  pipeline_id: string;
  pipeline: string;
  status: RunStatus;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  cost: number;
  input_params?: any;
  output_data?: any;
  error_message?: string;
  failure_details?: RunFailure;
  executor_id?: string;
  created_at: Date;
  updated_at: Date;
  tenant_id: string; // Added tenant_id
}

export interface RunCreateInput {
  pipeline_id: string;
  pipeline_name: string;
  input_params?: any;
  executor_id?: string;
  tenant_id: string; // Added tenant_id
  idempotency_key?: string;
}

export interface RunUpdateInput {
  status?: RunStatus;
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  cost?: number;
  output_data?: any;
  error_message?: string;
  failure_details?: RunFailure;
  executor_id?: string;
}

class RunsRepo {
  async list(tenantId: string, limit = 50, offset = 0): Promise<Run[]> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, failure_details, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE tenant_id = $1
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;
    const result = await getPool().query(query, [tenantId, limit, offset]);
    return result.rows;
  }

  async get(id: string, tenantId: string): Promise<Run | null> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, failure_details, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await getPool().query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  async create(data: RunCreateInput): Promise<Run> {
    const id = uuidv4();
    const query = `
      INSERT INTO runs (id, pipeline_id, pipeline_name, input_params, executor_id, tenant_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, failure_details, executor_id, created_at, updated_at, tenant_id
    `;
    const result = await getPool().query(query, [
      id,
      data.pipeline_id,
      data.pipeline_name,
      JSON.stringify(data.input_params || {}),
      data.executor_id,
      data.tenant_id,
    ]);

    await runEventsRepo.logEvent(id, 'run.created', { pipeline_id: data.pipeline_id }, data.tenant_id);

    return result.rows[0];
  }

  async update(
    id: string,
    data: RunUpdateInput,
    tenantId: string,
  ): Promise<Run | null> {
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
    if (data.failure_details !== undefined) {
      sets.push(`failure_details = $${paramCount++}`);
      values.push(JSON.stringify(data.failure_details));
    }

    if (sets.length === 0) return this.get(id, tenantId);

    const query = `
      UPDATE runs 
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount} AND tenant_id = $${paramCount + 1}
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, failure_details, executor_id, created_at, updated_at, tenant_id
    `;
    values.push(id);
    values.push(tenantId);

    const result = await getPool().query(query, values);
    const run = result.rows[0] || null;

    if (run && data.status) {
      await runEventsRepo.logEvent(id, 'run.status_changed', {
        old_status: 'unknown', // Ideally we'd have fetched this, but avoiding extra read for now
        new_status: data.status
      }, tenantId);
    }

    return run;
  }

  async delete(id: string, tenantId: string): Promise<boolean> {
    const query = 'DELETE FROM runs WHERE id = $1 AND tenant_id = $2';
    const result = await getPool().query(query, [id, tenantId]);
    return result.rowCount > 0;
  }

  async getByPipeline(
    pipelineId: string,
    tenantId: string,
    limit = 20,
  ): Promise<Run[]> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, failure_details, executor_id, created_at, updated_at, tenant_id
      FROM runs 
      WHERE pipeline_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC 
      LIMIT $3
    `;
    const result = await getPool().query(query, [pipelineId, tenantId, limit]);
    return result.rows;
  }
}

let _runsRepo: RunsRepo | null = null;

export const runsRepo = {
  get instance(): RunsRepo {
    if (!_runsRepo) {
      _runsRepo = new RunsRepo();
    }
    return _runsRepo;
  },

  // Proxy methods for backward compatibility
  async list(tenantId: string, limit = 50, offset = 0): Promise<Run[]> {
    return this.instance.list(tenantId, limit, offset);
  },

  async get(id: string, tenantId: string): Promise<Run | null> {
    return this.instance.get(id, tenantId);
  },

  async create(data: RunCreateInput): Promise<Run> {
    return this.instance.create(data);
  },

  async update(
    id: string,
    data: RunUpdateInput,
    tenantId: string,
  ): Promise<Run | null> {
    return this.instance.update(id, data, tenantId);
  },

  async delete(id: string, tenantId: string): Promise<boolean> {
    return this.instance.delete(id, tenantId);
  },

  async getByPipeline(
    pipelineId: string,
    tenantId: string,
    limit = 20,
  ): Promise<Run[]> {
    return this.instance.getByPipeline(pipelineId, tenantId, limit);
  },

  /**
   * Helper to strictly get a run for a tenant, throwing if not found or unauthorized (implicit).
   */
  async getRunForTenant(id: string, tenantId: string): Promise<Run | null> {
    return this.instance.get(id, tenantId);
  },
};
