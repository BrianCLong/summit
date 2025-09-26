-- IO Resilience predictive & provenance enhancements
ALTER TABLE io_events
  ADD COLUMN IF NOT EXISTS threat_vector TEXT,
  ADD COLUMN IF NOT EXISTS risk_score NUMERIC,
  ADD COLUMN IF NOT EXISTS anomaly_score NUMERIC,
  ADD COLUMN IF NOT EXISTS forecast_horizon_minutes INTEGER,
  ADD COLUMN IF NOT EXISTS predicted_reach INTEGER,
  ADD COLUMN IF NOT EXISTS provenance_confidence NUMERIC;

CREATE TABLE IF NOT EXISTS io_forecasts (
  id UUID PRIMARY KEY,
  cluster_id TEXT,
  story_id TEXT,
  horizon_minutes INTEGER NOT NULL,
  predicted_risk NUMERIC,
  predicted_reach INTEGER,
  confidence_interval NUMERIC,
  model_version TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ,
  rationale TEXT
);

CREATE TABLE IF NOT EXISTS io_provenance_assertions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id) ON DELETE CASCADE,
  source TEXT,
  assertion_type TEXT,
  verified BOOLEAN DEFAULT FALSE,
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  signature_hash TEXT,
  c2pa_manifest_url TEXT,
  score NUMERIC,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_io_events_risk_score ON io_events (risk_score DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_io_events_threat_vector ON io_events (threat_vector);
CREATE INDEX IF NOT EXISTS idx_io_forecasts_story_horizon ON io_forecasts (story_id, horizon_minutes);
CREATE INDEX IF NOT EXISTS idx_io_forecasts_generated_at ON io_forecasts (generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_io_provenance_event_id ON io_provenance_assertions (event_id);
CREATE INDEX IF NOT EXISTS idx_io_provenance_verified ON io_provenance_assertions (verified, verified_at DESC NULLS LAST);
