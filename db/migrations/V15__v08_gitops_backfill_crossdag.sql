ALTER TABLE run ADD COLUMN IF NOT EXISTS parent_run_id uuid;
ALTER TABLE run ADD COLUMN IF NOT EXISTS idempotency_key text;
CREATE INDEX IF NOT EXISTS idx_run_parent ON run(parent_run_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_run_idempotency ON run(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS runbook_versions(
  id bigserial PRIMARY KEY,
  family text NOT NULL,
  name text NOT NULL,
  version text NOT NULL,
  entry_path text NOT NULL,
  signed boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (family, name, version)
);

CREATE TABLE IF NOT EXISTS backfill_jobs(
  id bigserial PRIMARY KEY,
  runbook_ref text NOT NULL,
  window_start timestamptz NOT NULL,
  window_end timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'PLANNED',
  created_at timestamptz DEFAULT now()
);

-- Search indexes
CREATE INDEX IF NOT EXISTS idx_run_status ON run(status);
