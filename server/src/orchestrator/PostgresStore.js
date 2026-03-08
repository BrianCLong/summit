"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgresStore = void 0;
const uuid_1 = require("uuid");
const metrics_js_1 = require("./metrics.js");
const tracer_js_1 = require("../observability/tracer.js");
const logger_js_1 = __importDefault(require("../config/logger.js"));
const tracer = (0, tracer_js_1.getTracer)();
class PostgresStore {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    /**
     * Phase B: Dual-insert helper
     * Ensures event_seq identity across legacy and partitioned tables.
     */
    async insertEvent(client, event) {
        // 1. Insert to legacy table and get generated sequence
        const res = await client.query(`INSERT INTO orchestrator_events (id, tenant_id, type, run_id, task_id, payload)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING event_seq`, [event.id, event.tenant_id, event.type, event.run_id, event.task_id, JSON.stringify(event.payload)]);
        const event_seq = res.rows[0].event_seq;
        // 2. Insert to partitioned table (Phase B) with same sequence
        await client.query(`INSERT INTO orchestrator_events_p (id, event_seq, tenant_id, type, run_id, task_id, payload)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`, [event.id, event_seq, event.tenant_id, event.type, event.run_id, event.task_id, JSON.stringify(event.payload)]);
    }
    /**
     * Phase B: Dual-insert helper for outbox
     */
    async insertOutbox(client, outbox) {
        // 1. Insert to legacy table
        const query = `INSERT INTO orchestrator_outbox (tenant_id, event_type, payload) VALUES ($1, $2, $3) RETURNING id`;
        const res = await client.query(query, [outbox.tenant_id, outbox.event_type, JSON.stringify(outbox.payload)]);
        const outbox_id = res.rows[0].id;
        // 2. Dual-write to partitioned table with same id
        await client.query(`INSERT INTO orchestrator_outbox_p (id, tenant_id, event_type, payload) VALUES ($1, $2, $3, $4)`, [outbox_id, outbox.tenant_id, outbox.event_type, JSON.stringify(outbox.payload)]);
        return outbox_id;
    }
    async claimReadyTasks(workerId, limit, leaseMs) {
        return tracer.withSpan('PostgresStore.claimReadyTasks', async (span) => {
            const leaseUntil = new Date(Date.now() + leaseMs);
            const query = `
      WITH ready_tasks AS (
        SELECT id FROM orchestrator_tasks
        WHERE status = 'pending' AND ready_at <= NOW()
        ORDER BY priority_val DESC, ready_at ASC, id ASC
        LIMIT $1 FOR UPDATE SKIP LOCKED
      )
      UPDATE orchestrator_tasks
      SET status = 'running', claimed_by = $2, lease_until = $3, version = version + 1, attempt = attempt + 1, updated_at = NOW()
      FROM ready_tasks WHERE orchestrator_tasks.id = ready_tasks.id
      RETURNING *;
    `;
            const result = await this.pool.query(query, [limit, workerId, leaseUntil]);
            const tasks = result.rows;
            if (tasks.length > 0) {
                metrics_js_1.orchestratorClaimedBatchSize.observe({ worker_id: workerId }, tasks.length);
                for (const task of tasks)
                    metrics_js_1.orchestratorTasksTotal.inc({ kind: task.kind, status: 'claimed', worker_id: workerId });
            }
            return tasks;
        }, { kind: tracer_js_1.SpanKind.CLIENT });
    }
    async heartbeatTask(taskId, workerId, version, leaseMs) {
        const leaseUntil = new Date(Date.now() + leaseMs);
        const query = `UPDATE orchestrator_tasks SET lease_until = $1, last_heartbeat_at = NOW(), updated_at = NOW() WHERE id = $2 AND claimed_by = $3 AND version = $4;`;
        const result = await this.pool.query(query, [leaseUntil, taskId, workerId, version]);
        return result.rowCount === 1;
    }
    async completeTask(taskId, workerId, version, result) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const taskResult = await client.query('SELECT * FROM orchestrator_tasks WHERE id = $1 FOR UPDATE', [taskId]);
            if (taskResult.rows.length === 0)
                throw new Error('Task not found');
            const task = taskResult.rows[0];
            await this.insertEvent(client, {
                id: (0, uuid_1.v4)(),
                tenant_id: task.tenant_id,
                type: 'task_completed',
                run_id: task.run_id,
                task_id: taskId,
                payload: { result }
            });
            const updateResult = await client.query(`UPDATE orchestrator_tasks SET status = 'succeeded', result = $1, claimed_by = NULL, lease_until = NULL, version = version + 1, updated_at = NOW()
         WHERE id = $2 AND claimed_by = $3 AND version = $4`, [JSON.stringify(result), taskId, workerId, version]);
            if (updateResult.rowCount === 0)
                throw new Error('CAS update failed');
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    async failTask(taskId, workerId, version, error, isRetryable) {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');
            const taskResult = await client.query('SELECT * FROM orchestrator_tasks WHERE id = $1 FOR UPDATE', [taskId]);
            if (taskResult.rows.length === 0)
                throw new Error('Task not found');
            const task = taskResult.rows[0];
            const permanentlyFailed = !isRetryable || task.attempt >= task.max_attempts;
            const nextStatus = permanentlyFailed ? 'failed' : 'pending';
            await this.insertEvent(client, {
                id: (0, uuid_1.v4)(),
                tenant_id: task.tenant_id,
                type: permanentlyFailed ? 'task_failed' : 'task_attempt_failed',
                run_id: task.run_id,
                task_id: taskId,
                payload: { error, attempt: task.attempt }
            });
            const updateResult = await client.query(`UPDATE orchestrator_tasks SET status = $1, error = $2, claimed_by = NULL, lease_until = NULL, version = version + 1, updated_at = NOW(),
           ready_at = CASE WHEN $1 = 'pending' THEN NOW() + INTERVAL '1 minute' ELSE ready_at END
         WHERE id = $3 AND claimed_by = $4 AND version = $5`, [nextStatus, error, taskId, workerId, version]);
            if (updateResult.rowCount === 0)
                throw new Error('CAS update failed');
            await client.query('COMMIT');
            return true;
        }
        catch (error) {
            await client.query('ROLLBACK');
            throw error;
        }
        finally {
            client.release();
        }
    }
    // Retention Methods
    async deleteProcessedOutboxBefore(cutoff, limit) {
        const result = await this.pool.query(`WITH doomed AS (SELECT ctid FROM orchestrator_outbox WHERE status IN ('SENT', 'DEAD') AND processed_at < $1 ORDER BY processed_at ASC LIMIT $2)
       DELETE FROM orchestrator_outbox o USING doomed WHERE o.ctid = doomed.ctid RETURNING 1;`, [cutoff, limit]);
        return result.rowCount || 0;
    }
    async deleteEventsBefore(cutoff, limit) {
        const result = await this.pool.query(`WITH doomed AS (SELECT ctid FROM orchestrator_events WHERE created_at < $1 ORDER BY created_at ASC LIMIT $2)
       DELETE FROM orchestrator_events e USING doomed WHERE e.ctid = doomed.ctid RETURNING 1;`, [cutoff, limit]);
        return result.rowCount || 0;
    }
    async deleteTerminalTasksBefore(cutoff, limit) {
        const result = await this.pool.query(`WITH doomed AS (SELECT ctid FROM orchestrator_tasks WHERE status IN ('succeeded', 'failed', 'cancelled') AND updated_at < $1 ORDER BY updated_at ASC LIMIT $2)
       DELETE FROM orchestrator_tasks t USING doomed WHERE t.ctid = doomed.ctid RETURNING 1;`, [cutoff, limit]);
        return result.rowCount || 0;
    }
    async dropOldPartitions(tableName, cutoff) {
        const res = await this.pool.query(`
      SELECT relname as partition_name
      FROM pg_class c
      JOIN pg_inherits i ON c.oid = i.inhrelid
      JOIN pg_class p ON i.inhparent = p.oid
      WHERE p.relname = $1;
    `, [`${tableName}_p`]);
        const dropped = [];
        for (const row of res.rows) {
            const partName = row.partition_name;
            const matches = partName.match(/(\d{4})_(\d{2})$/);
            if (matches) {
                const year = parseInt(matches[1]);
                const month = parseInt(matches[2]);
                const partDate = new Date(year, month - 1, 1);
                if (partDate < cutoff) {
                    // Safety Guard: For outbox, ensure no pending work exists in the partition
                    if (tableName === 'orchestrator_outbox') {
                        const check = await this.pool.query(`SELECT 1 FROM ${partName} WHERE status NOT IN ('SENT', 'DEAD') LIMIT 1`);
                        if (check.rowCount > 0) {
                            logger_js_1.default.warn({ partName }, 'Skipping outbox partition drop: contains non-terminal messages');
                            continue;
                        }
                    }
                    await this.pool.query(`DROP TABLE IF EXISTS ${partName}`);
                    dropped.push(partName);
                    logger_js_1.default.info({ partName, tableName }, 'Dropped old partition');
                }
            }
        }
        return dropped;
    }
    // Phase C: Backfill Implementation
    async backfillEventPartitions(limit) {
        const query = `
      INSERT INTO orchestrator_events_p (id, event_seq, tenant_id, run_id, task_id, type, payload, created_at)
      SELECT id, event_seq, tenant_id, run_id, task_id, type, payload, created_at
      FROM orchestrator_events
      ON CONFLICT (created_at, event_seq) DO NOTHING
      RETURNING 1;
    `;
        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }
    async backfillOutboxPartitions(limit) {
        const query = `
      INSERT INTO orchestrator_outbox_p (id, tenant_id, event_type, payload, status, retry_count, last_error, processed_at, created_at)
      SELECT id, tenant_id, event_type, payload, status, retry_count, last_error, processed_at, created_at
      FROM orchestrator_outbox
      ON CONFLICT (created_at, id) DO NOTHING
      RETURNING 1;
    `;
        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }
}
exports.PostgresStore = PostgresStore;
