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

export interface MaestroEvent {
  id: string;
  run_id: string;
  task_id?: string;
  type: string;
  payload: any;
  occurred_at: Date;
  tenant_id: string;
}

export interface EventCreateInput {
  run_id: string;
  task_id?: string;
  type: string;
  payload: any;
  tenant_id: string;
}

class EventsRepo {
  async create(data: EventCreateInput): Promise<MaestroEvent> {
    const id = uuidv4();
    const query = `
      INSERT INTO events (
        id, run_id, task_id, type, payload, tenant_id
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await getPool().query(query, [
      id,
      data.run_id,
      data.task_id,
      data.type,
      JSON.stringify(data.payload || {}),
      data.tenant_id,
    ]);
    return result.rows[0];
  }

  async listByRun(runId: string, tenantId: string): Promise<MaestroEvent[]> {
    const query = 'SELECT * FROM events WHERE run_id = $1 AND tenant_id = $2 ORDER BY occurred_at ASC';
    const result = await getPool().query(query, [runId, tenantId]);
    return result.rows;
  }
}

export const eventsRepo = new EventsRepo();
