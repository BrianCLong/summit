-- Add anonymization tracking metadata for GDPR compliance
CREATE TABLE IF NOT EXISTS anonymization_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  triggered_by UUID REFERENCES users(id),
  scope TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  dry_run BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'PENDING',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  masked_postgres INTEGER NOT NULL DEFAULT 0,
  masked_neo4j INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS anonymization_runs_started_idx ON anonymization_runs(started_at);
CREATE INDEX IF NOT EXISTS anonymization_runs_completed_idx ON anonymization_runs(completed_at);

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymization_run_id UUID REFERENCES anonymization_runs(id);

ALTER TABLE entities
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS anonymization_run_id UUID REFERENCES anonymization_runs(id);

