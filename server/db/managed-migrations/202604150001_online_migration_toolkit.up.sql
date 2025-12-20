CREATE TABLE IF NOT EXISTS online_migration_runs (
  migration_key TEXT PRIMARY KEY,
  phase TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS online_migration_backfill_state (
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
CREATE INDEX IF NOT EXISTS online_migration_backfill_state_status_idx
  ON online_migration_backfill_state(status);

CREATE TABLE IF NOT EXISTS online_migration_parity_samples (
  id BIGSERIAL PRIMARY KEY,
  migration_key TEXT NOT NULL,
  sample_key TEXT NOT NULL,
  parity BOOLEAN NOT NULL DEFAULT false,
  diff JSONB,
  checked_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS online_migration_parity_samples_key_idx
  ON online_migration_parity_samples(migration_key, checked_at DESC);

-- Example expand step for the toolkit demo migration
ALTER TABLE IF EXISTS users
  ADD COLUMN IF NOT EXISTS display_name_canonical TEXT;
COMMENT ON COLUMN users.display_name_canonical IS 'Canonicalized copy of display_name used by online migration toolkit example';
