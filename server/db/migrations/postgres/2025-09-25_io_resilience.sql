-- IO Resilience schema
CREATE TABLE IF NOT EXISTS io_events (
  id UUID PRIMARY KEY,
  observed_at TIMESTAMPTZ NOT NULL,
  platform TEXT,
  locale TEXT,
  topic TEXT,
  story_id TEXT,
  detector TEXT,
  confidence NUMERIC,
  severity INTEGER,
  reach_estimate INTEGER,
  url TEXT,
  account_handle TEXT,
  cluster_id TEXT,
  is_authority_impersonation BOOLEAN DEFAULT FALSE,
  is_synthetic_media BOOLEAN DEFAULT FALSE,
  jurisdiction TEXT,
  raw_ref TEXT
);

CREATE TABLE IF NOT EXISTS io_actions (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id) ON DELETE CASCADE,
  action_type TEXT,
  initiated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  status TEXT,
  provider TEXT,
  ticket_id TEXT,
  outcome TEXT
);

CREATE TABLE IF NOT EXISTS io_media (
  id UUID PRIMARY KEY,
  event_id UUID REFERENCES io_events(id) ON DELETE CASCADE,
  media_type TEXT,
  sha256 TEXT,
  c2pa_present BOOLEAN,
  provenance_score NUMERIC
);

CREATE INDEX IF NOT EXISTS idx_io_events_observed_at ON io_events (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_io_events_story_id ON io_events (story_id);
CREATE INDEX IF NOT EXISTS idx_io_events_cluster_id ON io_events (cluster_id);
CREATE INDEX IF NOT EXISTS idx_io_actions_event_id ON io_actions (event_id);
CREATE INDEX IF NOT EXISTS idx_io_actions_status ON io_actions (status);
CREATE INDEX IF NOT EXISTS idx_io_media_event_id ON io_media (event_id);
