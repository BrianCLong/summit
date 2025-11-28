CREATE TABLE IF NOT EXISTS migration_backups (
  id BIGSERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  taken_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  location TEXT NOT NULL,
  initiated_by TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  notes JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS migration_backups_taken_at_idx
  ON migration_backups (taken_at DESC);
