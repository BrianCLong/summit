import { OrchestratorStore, Task, TaskStatus, OrchestratorEvent } from '@summit/orchestrator';
import { getPostgresPool } from '../db/postgres.js';
import { otelService } from '../middleware/observability/otel-tracing.js';
import baseLogger from '../utils/logger.js';

const logger = baseLogger.child({ component: 'PostgresStore' });

export class PostgresStore implements OrchestratorStore {
    private pool = getPostgresPool();

    async createRun(runId: string, metadata: any = {}): Promise<void> {
        const span = otelService.createSpan('orchestrator.createRun', { run_id: runId });
        try {
            await this.pool.query(
                'INSERT INTO orchestrator_runs (id, metadata) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING',
                [runId, JSON.stringify(metadata)]
            );
            logger.info({ run_id: runId }, 'Orchestrator run created');
        } catch (error: any) {
            logger.error({ run_id: runId, error: error.message }, 'Failed to create orchestrator run');
            throw error;
        } finally {
            span?.end();
        }
    }

    async upsertTask(task: Task): Promise<void> {
        const span = otelService.createSpan('orchestrator.upsertTask', {
            task_id: task.id,
            run_id: (task as any).runId || 'unknown'
        });
        try {
            const runId = (task as any).runId || 'default-run'; // Ensure runId is available
            await this.pool.query(
                `INSERT INTO orchestrator_tasks (id, run_id, subject, description, status, owner, blocked_by, blocks, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           status = EXCLUDED.status,
           owner = EXCLUDED.owner,
           metadata = EXCLUDED.metadata,
           updated_at = now()`,
                [
                    task.id,
                    runId,
                    task.subject,
                    task.description || null,
                    task.status,
                    task.owner || null,
                    task.blockedBy,
                    task.blocks,
                    JSON.stringify({}), // Placeholder for additional metadata
                    task.timestamps.created
                ]
            );
            logger.debug({ task_id: task.id, run_id: runId }, 'Orchestrator task upserted');
        } catch (error: any) {
            logger.error({ task_id: task.id, error: error.message }, 'Failed to upsert orchestrator task');
            throw error;
        } finally {
            span?.end();
        }
    }

    async getTask(taskId: string): Promise<Task | undefined> {
        const { rows } = await this.pool.query(
            'SELECT * FROM orchestrator_tasks WHERE id = $1',
            [taskId]
        );
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
            timestamps: {
                created: row.created_at.toISOString(),
                started: row.started_at?.toISOString(),
                completed: row.completed_at?.toISOString()
            }
        };
    }

    async getReadyTasks(runId: string): Promise<Task[]> {
        const { rows } = await this.pool.query(
            `SELECT * FROM orchestrator_tasks 
       WHERE run_id = $1 AND status = 'pending'
       AND NOT EXISTS (
         SELECT 1 FROM unnest(blocked_by) AS dep_id
         JOIN orchestrator_tasks t2 ON t2.id = dep_id
         WHERE t2.status != 'completed'
       )
       ORDER BY id ASC`,
            [runId]
        );

        return rows.map(row => ({
            id: row.id,
            subject: row.subject,
            description: row.description,
            status: row.status as TaskStatus,
            owner: row.owner,
            blockedBy: row.blocked_by,
            blocks: row.blocks,
            timestamps: {
                created: row.created_at.toISOString(),
                started: row.started_at?.toISOString(),
                completed: row.completed_at?.toISOString()
            }
        }));
    }

    async updateTaskStatus(taskId: string, status: TaskStatus, payload?: any): Promise<void> {
        const span = otelService.createSpan('orchestrator.updateTaskStatus', {
            task_id: taskId,
            status
        });
        try {
            const updates: string[] = ['status = $2', 'updated_at = now()'];
            const values: any[] = [taskId, status];

            if (payload?.owner) {
                updates.push(`owner = $${values.length + 1}`);
                values.push(payload.owner);
            }
            if (payload?.startedAt) {
                updates.push(`started_at = $${values.length + 1}`);
                values.push(payload.startedAt);
            }
            if (payload?.completedAt) {
                updates.push(`completed_at = $${values.length + 1}`);
                values.push(payload.completedAt);
            }

            await this.pool.query(
                `UPDATE orchestrator_tasks SET ${updates.join(', ')} WHERE id = $1`,
                values
            );

            logger.info({ task_id: taskId, status }, 'Orchestrator task status updated');
        } catch (error: any) {
            logger.error({ task_id: taskId, error: error.message }, 'Failed to update orchestrator task status');
            throw error;
        } finally {
            span?.end();
        }
    }

    async saveEvent(event: OrchestratorEvent): Promise<void> {
        const span = otelService.createSpan('orchestrator.saveEvent', {
            evidence_id: event.evidence_id,
            type: event.type
        });
        try {
            await this.pool.query(
                `INSERT INTO orchestrator_events (evidence_id, type, team_id, payload)
         VALUES ($1, $2, $3, $4)`,
                [event.evidence_id, event.type, event.team_id, JSON.stringify(event.payload)]
            );
        } catch (error: any) {
            logger.error({ evidence_id: event.evidence_id, error: error.message }, 'Failed to save orchestrator event');
            throw error;
        } finally {
            span?.end();
        }
    }

    async saveToOutbox(topic: string, payload: any): Promise<void> {
        const span = otelService.createSpan('orchestrator.saveToOutbox', { topic });
        try {
            await this.pool.query(
                `INSERT INTO orchestrator_outbox (topic, payload)
         VALUES ($1, $2)`,
                [topic, JSON.stringify(payload)]
            );
        } catch (error: any) {
            logger.error({ topic, error: error.message }, 'Failed to save to orchestrator outbox');
            throw error;
        } finally {
            span?.end();
        }
    }
}
