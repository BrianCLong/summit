import {
  backfillDurationSeconds,
  backfillProcessedCounter,
  backfillProgressGauge,
} from './metrics.js';
import {
  ONLINE_MIGRATION_BACKFILL_STATE,
  assertIdentifier,
  ensureOnlineMigrationTables,
  type MigrationClient,
  type MigrationPool,
} from './state.js';

export type BackfillStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed';

export interface BackfillJobState {
  migrationKey: string;
  jobName: string;
  status: BackfillStatus;
  lastCursor: string | null;
  processedRows: number;
  totalRows: number | null;
  chunkSize: number;
  throttleMs: number;
  metrics: Record<string, unknown>;
}

export interface BackfillBatchResult<TRow, TCursor = string> {
  rows: TRow[];
  nextCursor?: TCursor | null;
  totalRows?: number;
}

export interface BackfillJobOptions<TRow, TCursor = string> {
  migrationKey: string;
  jobName: string;
  chunkSize?: number;
  throttleMs?: number;
  fetchBatch: (
    client: MigrationClient,
    cursor: TCursor | null,
    limit: number,
  ) => Promise<BackfillBatchResult<TRow, TCursor>>;
  processRow: (client: MigrationClient, row: TRow) => Promise<void>;
  pauseSignal?: (state: BackfillJobState) => Promise<boolean> | boolean;
}

const DEFAULT_CHUNK_SIZE = 500;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class BackfillRunner<TRow, TCursor = string> {
  constructor(private pool: MigrationPool) { }

  async pauseJob(migrationKey: string, jobName: string) {
    assertIdentifier(jobName, 'job');
    await ensureOnlineMigrationTables(this.pool);
    await this.pool.query(
      `UPDATE ${ONLINE_MIGRATION_BACKFILL_STATE}
       SET status = 'paused', updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`,
      [migrationKey, jobName],
    );
  }

  async resumeJob(options: BackfillJobOptions<TRow, TCursor>) {
    await this.pool.query(
      `UPDATE ${ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = 'running', updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`,
      [options.migrationKey, options.jobName],
    );
    return this.runJob(options);
  }

  async getState(migrationKey: string, jobName: string): Promise<BackfillJobState | null> {
    const result = await this.pool.query(
      `SELECT migration_key, job_name, status, last_cursor, processed_rows, total_rows, chunk_size, throttle_ms, metrics
       FROM ${ONLINE_MIGRATION_BACKFILL_STATE}
       WHERE migration_key = $1 AND job_name = $2`,
      [migrationKey, jobName],
    );
    if (result.rowCount === 0) return null;
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

  async runJob(options: BackfillJobOptions<TRow, TCursor>): Promise<BackfillJobState> {
    assertIdentifier(options.jobName, 'job');
    await ensureOnlineMigrationTables(this.pool);

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
        const { rows, nextCursor, totalRows } = await options.fetchBatch(
          client,
          (state.lastCursor as TCursor | null) ?? null,
          state.chunkSize,
        );

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
        backfillDurationSeconds.observe(labels, durationSeconds);
        backfillProcessedCounter.inc(labels, rows.length);

        state.processedRows += rows.length;
        if (nextCursor !== undefined) {
          state.lastCursor = nextCursor === null ? null : String(nextCursor);
        }

        state.metrics = {
          ...state.metrics,
          lastBatchProcessedAt: new Date().toISOString(),
        };
        state = await this.updateState(client, state, 'running');
        backfillProgressGauge.set(labels, state.processedRows);

        if (throttleMs > 0) {
          await sleep(throttleMs);
        }
      }

      return state;
    } catch (error: any) {
      await this.markFailed(options.migrationKey, options.jobName, error?.message);
      throw error;
    } finally {
      client.release?.();
    }
  }

  private async ensureState(client: MigrationClient, state: BackfillJobState): Promise<BackfillJobState> {
    await client.query(
      `INSERT INTO ${ONLINE_MIGRATION_BACKFILL_STATE}
        (migration_key, job_name, status, last_cursor, processed_rows, total_rows, chunk_size, throttle_ms, metrics)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (migration_key, job_name) DO NOTHING`,
      [
        state.migrationKey,
        state.jobName,
        state.status,
        state.lastCursor,
        state.processedRows,
        state.totalRows,
        state.chunkSize,
        state.throttleMs,
        state.metrics,
      ],
    );

    return state;
  }

  private async updateState(
    client: MigrationClient,
    state: BackfillJobState,
    status: BackfillStatus,
  ): Promise<BackfillJobState> {
    const nextState = { ...state, status };
    await client.query(
      `UPDATE ${ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = $3,
             last_cursor = $4,
             processed_rows = $5,
             total_rows = $6,
             chunk_size = $7,
             throttle_ms = $8,
             metrics = $9,
             updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`,
      [
        nextState.migrationKey,
        nextState.jobName,
        nextState.status,
        nextState.lastCursor,
        nextState.processedRows,
        nextState.totalRows,
        nextState.chunkSize,
        nextState.throttleMs,
        nextState.metrics,
      ],
    );
    return nextState;
  }

  private async markFailed(migrationKey: string, jobName: string, errorMessage?: string) {
    await this.pool.query(
      `UPDATE ${ONLINE_MIGRATION_BACKFILL_STATE}
         SET status = 'failed',
             metrics = jsonb_set(coalesce(metrics, '{}'::jsonb), '{last_error}', to_jsonb($3::text)),
             updated_at = now()
       WHERE migration_key = $1 AND job_name = $2`,
      [migrationKey, jobName, errorMessage ?? 'unknown error'],
    );
  }
}
