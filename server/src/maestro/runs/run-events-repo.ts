import { Pool } from 'pg';
import { getPostgresPool } from '../../config/database.js';
import { RunEvent } from '../types.js';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = getPostgresPool();
  }
  return pool;
}

export class RunEventsRepo {
  async logEvent(
    runId: string,
    type: string,
    payload: Record<string, unknown>,
    tenantId: string
  ): Promise<RunEvent> {
    const query = `
      INSERT INTO run_events (run_id, type, payload, tenant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING id, run_id as "runId", type, payload, created_at as "createdAt", tenant_id as "tenantId"
    `;
    const result = await getPool().query(query, [runId, type, JSON.stringify(payload), tenantId]);
    return result.rows[0];
  }

  async getEvents(runId: string, tenantId: string): Promise<RunEvent[]> {
    const query = `
      SELECT id, run_id as "runId", type, payload, created_at as "createdAt", tenant_id as "tenantId"
      FROM run_events
      WHERE run_id = $1 AND tenant_id = $2
      ORDER BY created_at ASC
    `;
    const result = await getPool().query(query, [runId, tenantId]);
    return result.rows;
  }
}

export const runEventsRepo = new RunEventsRepo();
