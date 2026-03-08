"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackfillRunner = void 0;
const metrics_js_1 = require("./metrics.js");
const state_js_1 = require("./state.js");
const DEFAULT_CHUNK_SIZE = 500;
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
class BackfillRunner {
    pool;
    constructor(pool) {
        this.pool = pool;
    }
    async pauseJob(migrationKey, jobName) {
        (0, state_js_1.assertIdentifier)(jobName, 'job');
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        await this.pool.query(`UPDATE ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
       SET status = 'paused', updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`, [migrationKey, jobName]);
    }
    async resumeJob(options) {
        await this.pool.query(`UPDATE ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = 'running', updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`, [options.migrationKey, options.jobName]);
        return this.runJob(options);
    }
    async getState(migrationKey, jobName) {
        const result = await this.pool.query(`SELECT migration_key, job_name, status, last_cursor, processed_rows, total_rows, chunk_size, throttle_ms, metrics
       FROM ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
       WHERE migration_key = $1 AND job_name = $2`, [migrationKey, jobName]);
        if (result.rowCount === 0)
            return null;
        const row = result.rows[0];
        return {
            migrationKey: row.migration_key,
            jobName: row.job_name,
            status: row.status,
            lastCursor: row.last_cursor,
            processedRows: Number(row.processed_rows ?? 0),
            totalRows: row.total_rows ? Number(row.total_rows) : null,
            chunkSize: Number(row.chunk_size ?? DEFAULT_CHUNK_SIZE),
            throttleMs: Number(row.throttle_ms ?? 0),
            metrics: row.metrics ?? {},
        };
    }
    async runJob(options) {
        (0, state_js_1.assertIdentifier)(options.jobName, 'job');
        await (0, state_js_1.ensureOnlineMigrationTables)(this.pool);
        const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
        const throttleMs = options.throttleMs ?? 0;
        const labels = { migration: options.migrationKey, job: options.jobName };
        const client = await this.pool.connect();
        try {
            let state = await this.ensureState(client, {
                migrationKey: options.migrationKey,
                jobName: options.jobName,
                status: 'running',
                lastCursor: null,
                processedRows: 0,
                totalRows: null,
                chunkSize,
                throttleMs,
                metrics: {},
            });
            // resume existing state if present
            const persisted = await this.getState(options.migrationKey, options.jobName);
            state = { ...state, ...(persisted ?? {}), chunkSize, throttleMs };
            while (true) {
                if (options.pauseSignal && (await options.pauseSignal(state))) {
                    state = await this.updateState(client, state, 'paused');
                    break;
                }
                const batchStart = Date.now();
                const { rows, nextCursor, totalRows } = await options.fetchBatch(client, state.lastCursor ?? null, state.chunkSize);
                if (typeof totalRows === 'number' && totalRows >= 0) {
                    state.totalRows = totalRows;
                }
                if (rows.length === 0) {
                    state = await this.updateState(client, state, 'completed');
                    break;
                }
                for (const row of rows) {
                    await options.processRow(client, row);
                }
                const durationSeconds = (Date.now() - batchStart) / 1000;
                metrics_js_1.backfillDurationSeconds.observe(labels, durationSeconds);
                metrics_js_1.backfillProcessedCounter.inc(labels, rows.length);
                state.processedRows += rows.length;
                if (nextCursor !== undefined) {
                    state.lastCursor = nextCursor === null ? null : String(nextCursor);
                }
                state.metrics = {
                    ...state.metrics,
                    lastBatchProcessedAt: new Date().toISOString(),
                };
                state = await this.updateState(client, state, 'running');
                metrics_js_1.backfillProgressGauge.set(labels, state.processedRows);
                if (throttleMs > 0) {
                    await sleep(throttleMs);
                }
            }
            return state;
        }
        catch (error) {
            await this.markFailed(options.migrationKey, options.jobName, error?.message);
            throw error;
        }
        finally {
            client.release?.();
        }
    }
    async ensureState(client, state) {
        await client.query(`INSERT INTO ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
        (migration_key, job_name, status, last_cursor, processed_rows, total_rows, chunk_size, throttle_ms, metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (migration_key, job_name) DO NOTHING`, [
            state.migrationKey,
            state.jobName,
            state.status,
            state.lastCursor,
            state.processedRows,
            state.totalRows,
            state.chunkSize,
            state.throttleMs,
            state.metrics,
        ]);
        return state;
    }
    async updateState(client, state, status) {
        const nextState = { ...state, status };
        await client.query(`UPDATE ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = $3,
             last_cursor = $4,
             processed_rows = $5,
             total_rows = $6,
             chunk_size = $7,
             throttle_ms = $8,
             metrics = $9,
             updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`, [
            nextState.migrationKey,
            nextState.jobName,
            nextState.status,
            nextState.lastCursor,
            nextState.processedRows,
            nextState.totalRows,
            nextState.chunkSize,
            nextState.throttleMs,
            nextState.metrics,
        ]);
        return nextState;
    }
    async markFailed(migrationKey, jobName, errorMessage) {
        await this.pool.query(`UPDATE ${state_js_1.ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = 'failed',
             metrics = jsonb_set(coalesce(metrics, '{}'::jsonb), '{last_error}', to_jsonb($3::text)),
             updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`, [migrationKey, jobName, errorMessage ?? 'unknown error']);
    }
}
exports.BackfillRunner = BackfillRunner;
