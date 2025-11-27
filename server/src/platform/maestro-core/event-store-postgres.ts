import { MaestroEvent, MaestroEventStore } from './types.js';
import pg from 'pg';

export class PostgresEventStore implements MaestroEventStore {
  constructor(private pool: pg.Pool) {}

  async append(eventData: Omit<MaestroEvent, 'id' | 'timestamp'>): Promise<MaestroEvent> {
    const query = `
      INSERT INTO maestro_events (tenant_id, type, payload, severity, timestamp, task_id)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING id, timestamp
    `;
    const values = [
      eventData.tenantId,
      eventData.type,
      JSON.stringify(eventData.payload),
      eventData.severity,
      eventData.taskId || null
    ];

    const res = await this.pool.query(query, values);
    const row = res.rows[0];

    return {
      ...eventData,
      id: row.id,
      timestamp: row.timestamp
    };
  }

  async query(tenantId: string, filters?: Partial<MaestroEvent>): Promise<MaestroEvent[]> {
    let query = `SELECT * FROM maestro_events WHERE tenant_id = $1`;
    const values: any[] = [tenantId];
    let idx = 2;

    if (filters) {
      if (filters.type) { query += ` AND type = $${idx++}`; values.push(filters.type); }
      if (filters.severity) { query += ` AND severity = $${idx++}`; values.push(filters.severity); }
      if (filters.taskId) { query += ` AND task_id = $${idx++}`; values.push(filters.taskId); }
    }

    query += ` ORDER BY timestamp DESC LIMIT 1000`; // Safety limit

    const res = await this.pool.query(query, values);
    return res.rows.map(row => ({
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      payload: row.payload,
      severity: row.severity,
      timestamp: row.timestamp,
      taskId: row.task_id
    }));
  }
}
