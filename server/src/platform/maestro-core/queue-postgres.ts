import { Task, TaskQueue, TaskPriority } from './types.js';
import pg from 'pg';

export class PostgresTaskQueue implements TaskQueue {
  constructor(private pool: pg.Pool) {}

  async enqueue(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'attemptCount' | 'status'>): Promise<Task> {
    const query = `
      INSERT INTO maestro_tasks (tenant_id, type, payload, priority, status, sla_seconds, attempt_count, created_at, updated_at, next_run_at)
      VALUES ($1, $2, $3, $4, 'PENDING', $5, 0, NOW(), NOW(), NOW())
      RETURNING id, created_at, updated_at, attempt_count
    `;
    const values = [
      taskData.tenantId,
      taskData.type,
      JSON.stringify(taskData.payload),
      taskData.priority,
      taskData.slaSeconds || null
    ];

    const res = await this.pool.query(query, values);
    const row = res.rows[0];

    return {
      ...taskData,
      id: row.id,
      status: 'PENDING',
      attemptCount: row.attempt_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  async dequeue(workerTypes: string[]): Promise<Task | null> {
    // Select and lock the next pending task whose next_run_at is in the past
    const query = `
      UPDATE maestro_tasks
      SET status = 'RUNNING', updated_at = NOW()
      WHERE id = (
        SELECT id
        FROM maestro_tasks
        WHERE status = 'PENDING'
          AND type = ANY($1::text[])
          AND next_run_at <= NOW()
        ORDER BY
          CASE priority
            WHEN 'CRITICAL' THEN 1
            WHEN 'HIGH' THEN 2
            WHEN 'NORMAL' THEN 3
            WHEN 'LOW' THEN 4
            ELSE 5
          END,
          created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING *;
    `;

    const res = await this.pool.query(query, [workerTypes]);
    if (res.rowCount === 0) return null;

    return this.mapRowToTask(res.rows[0]);
  }

  async ack(taskId: string): Promise<void> {
    await this.pool.query(
      `UPDATE maestro_tasks SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
      [taskId]
    );
  }

  async nack(taskId: string, error?: string): Promise<void> {
    // Exponential backoff: 2^attempt_count * 1 second (e.g. 1s, 2s, 4s, 8s...)
    // Max delay cap could be added, here we keep it simple
    await this.pool.query(
      `UPDATE maestro_tasks
       SET status = CASE WHEN attempt_count + 1 >= max_attempts THEN 'FAILED' ELSE 'PENDING' END,
           attempt_count = attempt_count + 1,
           last_error = $2,
           updated_at = NOW(),
           next_run_at = NOW() + (POWER(2, attempt_count) || ' seconds')::interval
       WHERE id = $1`,
      [taskId, error]
    );
  }

  async get(taskId: string): Promise<Task | null> {
    const res = await this.pool.query(`SELECT * FROM maestro_tasks WHERE id = $1`, [taskId]);
    if (res.rowCount === 0) return null;
    return this.mapRowToTask(res.rows[0]);
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type,
      payload: row.payload,
      priority: row.priority,
      status: row.status,
      slaSeconds: row.sla_seconds,
      attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      lastError: row.last_error
    };
  }
}
