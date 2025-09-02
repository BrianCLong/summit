import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { getPostgresPool } from '../../config/database.js';

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
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  cost: number;
  input_params?: any;
  output_data?: any;
  error_message?: string;
  executor_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface RunCreateInput {
  pipeline_id: string;
  pipeline_name: string;
  input_params?: any;
  executor_id?: string;
}

export interface RunUpdateInput {
  status?: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  started_at?: Date;
  completed_at?: Date;
  duration_ms?: number;
  cost?: number;
  output_data?: any;
  error_message?: string;
}

class RunsRepo {
  async list(limit = 50, offset = 0): Promise<Run[]> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at
      FROM runs 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    const result = await getPool().query(query, [limit, offset]);
    return result.rows;
  }

  async get(id: string): Promise<Run | null> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at
      FROM runs 
      WHERE id = $1
    `;
    const result = await getPool().query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: RunCreateInput): Promise<Run> {
    const id = uuidv4();
    const query = `
      INSERT INTO runs (id, pipeline_id, pipeline_name, input_params, executor_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, executor_id, created_at, updated_at
    `;
    const result = await getPool().query(query, [
      id,
      data.pipeline_id,
      data.pipeline_name,
      JSON.stringify(data.input_params || {}),
      data.executor_id,
    ]);
    return result.rows[0];
  }

  async update(id: string, data: RunUpdateInput): Promise<Run | null> {
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

    if (sets.length === 0) return this.get(id);

    const query = `
      UPDATE runs 
      SET ${sets.join(', ')}, updated_at = NOW()
      WHERE id = $${paramCount}
      RETURNING id, pipeline_id, pipeline_name as pipeline, status, started_at, 
                completed_at, duration_ms, cost, input_params, output_data, 
                error_message, executor_id, created_at, updated_at
    `;
    values.push(id);

    const result = await getPool().query(query, values);
    return result.rows[0] || null;
  }

  async delete(id: string): Promise<boolean> {
    const query = 'DELETE FROM runs WHERE id = $1';
    const result = await getPool().query(query, [id]);
    return result.rowCount > 0;
  }

  async getByPipeline(pipelineId: string, limit = 20): Promise<Run[]> {
    const query = `
      SELECT id, pipeline_id, pipeline_name as pipeline, status, started_at, 
             completed_at, duration_ms, cost, input_params, output_data, 
             error_message, executor_id, created_at, updated_at
      FROM runs 
      WHERE pipeline_id = $1 
      ORDER BY created_at DESC 
      LIMIT $2
    `;
    const result = await getPool().query(query, [pipelineId, limit]);
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
  async list(limit = 50, offset = 0): Promise<Run[]> {
    return this.instance.list(limit, offset);
  },

  async get(id: string): Promise<Run | null> {
    return this.instance.get(id);
  },

  async create(data: RunCreateInput): Promise<Run> {
    return this.instance.create(data);
  },

  async update(id: string, data: RunUpdateInput): Promise<Run | null> {
    return this.instance.update(id, data);
  },

  async delete(id: string): Promise<boolean> {
    return this.instance.delete(id);
  },

  async getByPipeline(pipelineId: string, limit = 20): Promise<Run[]> {
    return this.instance.getByPipeline(pipelineId, limit);
  },
};
