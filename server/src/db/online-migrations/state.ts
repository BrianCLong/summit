import type { Pool } from 'pg';

export const ONLINE_MIGRATION_RUNS = 'online_migration_runs';
export const ONLINE_MIGRATION_BACKFILL_STATE = 'online_migration_backfill_state';
export const ONLINE_MIGRATION_PARITY_SAMPLES = 'online_migration_parity_samples';

export type MigrationClient = { query: Pool['query']; release?: () => void };
export type MigrationPool = {
  query: Pool['query'];
  connect: () => Promise<MigrationClient>;
};

const IDENTIFIER = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function assertIdentifier(value: string, label: string): string {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label} identifier: ${value}`);
  }
  return value;
}

export async function ensureOnlineMigrationTables(pool: MigrationPool | MigrationClient) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${ONLINE_MIGRATION_RUNS} (
      migration_key TEXT PRIMARY KEY,
      phase TEXT NOT NULL,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS ${ONLINE_MIGRATION_BACKFILL_STATE} (
      migration_key TEXT NOT NULL,
      job_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      last_cursor TEXT,
      processed_rows BIGINT NOT NULL DEFAULT 0,
      total_rows BIGINT,
      chunk_size INTEGER NOT NULL DEFAULT 500,
      throttle_ms INTEGER NOT NULL DEFAULT 0,
      metrics JSONB DEFAULT '{}'::jsonb,
      started_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      PRIMARY KEY (migration_key, job_name)
    );
    CREATE INDEX IF NOT EXISTS ${ONLINE_MIGRATION_BACKFILL_STATE}_status_idx
      ON ${ONLINE_MIGRATION_BACKFILL_STATE}(status);

    CREATE TABLE IF NOT EXISTS ${ONLINE_MIGRATION_PARITY_SAMPLES} (
      id BIGSERIAL PRIMARY KEY,
      migration_key TEXT NOT NULL,
      sample_key TEXT NOT NULL,
      parity BOOLEAN NOT NULL DEFAULT false,
      diff JSONB,
      checked_at TIMESTAMPTZ DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS ${ONLINE_MIGRATION_PARITY_SAMPLES}_key_idx
      ON ${ONLINE_MIGRATION_PARITY_SAMPLES}(migration_key, checked_at DESC);
  `);
}
