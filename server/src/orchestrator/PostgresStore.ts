import { OrchestratorStore, Task, TaskStatus, OrchestratorEvent } from '@summit/orchestrator';
import { getPostgresPool, ManagedPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import baseLogger from '../utils/logger.js';
import { orchestratorMetrics } from './metrics.js';

const logger = baseLogger.child({ component: 'PostgresStore' });

export class PostgresStore implements OrchestratorStore {
    private pool: ManagedPostgresPool;

    constructor(pool?: ManagedPostgresPool) {
        this.pool = pool || getPostgresPool();
    }

    private async query(sql: string, params: any[] = []) {
        return await this.pool.query(sql, params);
    }

    async withTransaction<T>(fn: (txStore: OrchestratorStore) => Promise<T>): Promise<T> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const txStore = new PostgresStore(client as any);
            const result = await fn(txStore);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async saveRun(id: string, metadata: any): Promise<void> {
        const query = `
      INSERT INTO orchestrator_runs (id, metadata, created_at, updated_at)
      VALUES ($1, $2, now(), now())
      ON CONFLICT (id) DO UPDATE SET metadata = $2, updated_at = now()
    `;
        await this.query(query, [id, metadata]);
    }

    async getRun(id: string): Promise<any> {
        const query = 'SELECT * FROM orchestrator_runs WHERE id = $1';
        const { rows } = await this.query(query, [id]);
        return rows[0];
    }

    async upsertTask(task: Task): Promise<void> {
        const query = `
      INSERT INTO orchestrator_tasks (
        id, run_id, subject, description, status, owner, blocked_by, blocks, 
        attempts, max_attempts, ready_at, priority, metadata, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, now())
      ON CONFLICT (id) DO UPDATE SET
        status = EXCLUDED.status,
        owner = EXCLUDED.owner,
        blocked_by = EXCLUDED.blocked_by,
        blocks = EXCLUDED.blocks,
        attempts = EXCLUDED.attempts,
        max_attempts = EXCLUDED.max_attempts,
        ready_at = EXCLUDED.ready_at,
        priority = EXCLUDED.priority,
        version = orchestrator_tasks.version + 1,
        updated_at = now()
    `;
        await this.query(query, [
            task.id,
            (task as any).runId || 'unknown',
            task.subject,
            task.description,
            task.status,
            task.owner,
            task.blockedBy,
            task.blocks,
            task.attempts || 0,
            task.maxAttempts || 3,
            task.readyAt || new Date().toISOString(),
            task.priority || 0,
            (task as any).metadata || {}
        ]);
    }

    async getTask(id: string): Promise<Task | undefined> {
        const query = 'SELECT * FROM orchestrator_tasks WHERE id = $1';
        const { rows } = await this.query(query, [id]);
        if (rows.length === 0) return undefined;
        const row = rows[0];
        return {
            id: row.id,
            subject: row.subject,
            description: row.description,
            status: row.status as TaskStatus,
            owner: row.owner,
            blockedBy: row.blocked_by,
            blocks: row.blocks,
            attempts: row.attempts,
            maxAttempts: row.max_attempts,
            readyAt: row.ready_at.toISOString(),
            priority: row.priority,
            timestamps: {
                created: row.created_at.toISOString(),
                started: row.started_at?.toISOString(),
                completed: row.completed_at?.toISOString()
            }
        };
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, payload?: {
        completedAt?: string;
        readyAt?: string;
        expectedVersion?: number;
    }): Promise<void> {
        const span = otelService.createSpan('orchestrator.updateTaskStatus', { task_id: taskId, status });
        try {
            let query = `
        UPDATE orchestrator_tasks
        SET status = $2, 
            completed_at = COALESCE($3, completed_at),
            ready_at = COALESCE($4, ready_at),
            version = version + 1,
            updated_at = now()
        WHERE id = $1
      `;
            const params: any[] = [taskId, status, payload?.completedAt, payload?.readyAt];

            if (payload?.expectedVersion !== undefined) {
                query += ' AND version = $5';
                params.push(payload.expectedVersion);
            }

            const result = await this.query(query, params);
            if (result.rowCount === 0) {
                if (payload?.expectedVersion !== undefined) {
                    orchestratorMetrics.versionConflictsTotal.inc({ operation: 'updateTaskStatus' });
                    throw new Error(`Optimistic locking failure: task ${taskId} version mismatch or not found`);
                }
                throw new Error(`Failed to update task ${taskId}: not found`);
            }
        } finally {
            span?.end();
        }
    }

    async saveEvent(event: OrchestratorEvent): Promise<void> {
        const query = `
      INSERT INTO orchestrator_events (evidence_id, run_id, type, team_id, payload, created_at)
      VALUES ($1, $2, $3, $4, $5, now())
    `;
        await this.query(query, [
            event.evidence_id,
            (event as any).runId || null,
            event.type,
            event.team_id,
            event.payload
        ]);
    }

    async getEvents(runId: string): Promise<OrchestratorEvent[]> {
        const query = 'SELECT * FROM orchestrator_events WHERE run_id = $1 ORDER BY event_seq ASC';
        const { rows } = await this.query(query, [runId]);
        return rows.map(row => ({
            evidence_id: row.evidence_id,
            type: row.type,
            team_id: row.team_id,
            payload: row.payload
        }));
    }

    async saveToOutbox(topic: string, payload: any): Promise<void> {
        const query = `
      INSERT INTO orchestrator_outbox (topic, payload, created_at)
      VALUES ($1, $2, now())
    `;
        await this.query(query, [topic, payload]);
    }

    async claimTask(workerId: string, leaseDurationMs: number): Promise<Task | undefined> {
        const span = otelService.createSpan('orchestrator.claimTask', { worker_id: workerId });
        const stopTimer = orchestratorMetrics.claimLatency.startTimer();
        try {
            const query = `
        WITH ready_task AS (
          SELECT id, status FROM orchestrator_tasks
          WHERE (status = 'pending' OR (status = 'in_progress' AND claim_expires_at < now()))
          AND ready_at <= now()
          AND attempts < max_attempts
          AND NOT EXISTS (
            SELECT 1 FROM unnest(blocked_by) AS dep_id
            JOIN orchestrator_tasks t2 ON t2.id = dep_id
            WHERE t2.status != 'completed'
          )
          ORDER BY priority DESC, ready_at ASC, id ASC
          LIMIT 1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE orchestrator_tasks
        SET 
          claimed_by = $1,
          claimed_at = now(),
          claim_expires_at = now() + ($2 || ' milliseconds')::interval,
          status = 'in_progress',
          started_at = COALESCE(started_at, now()),
          version = version + 1,
          attempts = attempts + 1
        FROM ready_task
        WHERE orchestrator_tasks.id = ready_task.id
        RETURNING orchestrator_tasks.*, ready_task.status as old_status
      `;

            const { rows } = await this.query(query, [workerId, leaseDurationMs]);
            if (rows.length === 0) return undefined;

            const row = rows[0];
            const task: Task = {
                id: row.id,
                subject: row.subject,
                description: row.description,
                status: row.status as TaskStatus,
                owner: row.owner,
                blockedBy: row.blocked_by,
                blocks: row.blocks,
                attempts: row.attempts,
                maxAttempts: row.max_attempts,
                readyAt: row.ready_at.toISOString(),
                priority: row.priority,
                version: row.version, // Adding this for CAS
                timestamps: {
                    created: row.created_at.toISOString(),
                    started: row.started_at?.toISOString(),
                    completed: row.completed_at?.toISOString()
                }
            } as any;

            orchestratorMetrics.tasksClaimedTotal.inc({ worker_id: workerId, subject: task.subject });
            if (row.old_status === 'in_progress') {
                orchestratorMetrics.tasksReclaimedTotal.inc({ subject: task.subject });
            }

            return task;
        } finally {
            stopTimer();
            span?.end();
        }
    }

    async heartbeatTask(taskId: string, workerId: string, leaseDurationMs: number): Promise<void> {
        const query = `
      UPDATE orchestrator_tasks
      SET claim_expires_at = now() + ($3 || ' milliseconds')::interval
      WHERE id = $1 AND claimed_by = $2
    `;
        await this.query(query, [taskId, workerId, leaseDurationMs]);
    }

    async pruneOldData(retentionDays: number): Promise<{ runsDeleted: number; eventsDeleted: number; outboxDeleted: number }> {
        const span = otelService.createSpan('orchestrator.pruneOldData', { retention_days: retentionDays });
        try {
            const outboxDeleted = await this.pruneOutbox(retentionDays);

            const runQuery = `
        WITH deleted_runs AS (
          DELETE FROM orchestrator_runs
          WHERE finished_at < now() - ($1 || ' days')::interval
          RETURNING id
        )
        SELECT count(*) FROM deleted_runs
      `;
            const { rows: runRows } = await this.query(runQuery, [retentionDays]);

            const eventQuery = `
        DELETE FROM orchestrator_events
        WHERE (run_id IS NULL AND created_at < now() - ($1 || ' days')::interval)
        OR NOT EXISTS (SELECT 1 FROM orchestrator_runs r WHERE r.id = orchestrator_events.run_id)
      `;
            const { rowCount: eventDeleted } = await this.query(eventQuery, [retentionDays]);

            return {
                runsDeleted: parseInt(runRows[0].count),
                eventsDeleted: eventDeleted || 0,
                outboxDeleted
            };
        } finally {
            span?.end();
        }
    }

    private async pruneOutbox(retentionDays: number): Promise<number> {
        let totalDeleted = 0;
        const chunkSize = 1000;
        let more = true;

        while (more) {
            const query = `
        WITH deleted AS (
          DELETE FROM orchestrator_outbox
          WHERE id IN (
            SELECT id FROM orchestrator_outbox
            WHERE (processed_at IS NOT NULL AND processed_at < now() - ($1 || ' days')::interval)
            OR (is_permanent_failure = TRUE AND created_at < now() - ($1 || ' days')::interval)
            LIMIT $2
          )
          RETURNING id
        )
        SELECT count(*) FROM deleted
      `;
            const { rows } = await this.query(query, [retentionDays, chunkSize]);
            const count = parseInt(rows[0].count);
            totalDeleted += count;
            more = count === chunkSize;
        }
        return totalDeleted;
    }

    async getQueueMetrics(): Promise<{ readyTasks: number; runningTasks: number; outboxBacklog: number }> {
        const query = `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending' AND ready_at <= now()) as ready_tasks,
        COUNT(*) FILTER (WHERE status = 'in_progress') as running_tasks,
        (SELECT COUNT(*) FROM orchestrator_outbox WHERE status = 'pending') as outbox_backlog
      FROM orchestrator_tasks
    `;
        const { rows } = await this.query(query);
        const row = rows[0];
        return {
            readyTasks: parseInt(row.ready_tasks),
            runningTasks: parseInt(row.running_tasks),
            outboxBacklog: parseInt(row.outbox_backlog)
        };
    }
}
