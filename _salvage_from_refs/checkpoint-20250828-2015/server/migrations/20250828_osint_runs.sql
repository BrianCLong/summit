-- OSINT runs table for health aggregation
CREATE TABLE IF NOT EXISTS osint_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ,
  status TEXT NOT NULL,
  items_ingested INTEGER NOT NULL DEFAULT 0,
  error TEXT,
  latency_ms BIGINT
);

CREATE INDEX IF NOT EXISTS idx_osint_runs_source_time ON osint_runs(source_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_osint_runs_status ON osint_runs(status);

