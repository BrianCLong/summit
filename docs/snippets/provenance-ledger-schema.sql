CREATE TABLE IF NOT EXISTS provenance_event (
  event_id UUID PRIMARY KEY,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('human', 'service')),
  action TEXT NOT NULL,
  action_context JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload_hash TEXT NOT NULL,
  signature BYTEA NOT NULL,
  certificate_chain BYTEA NOT NULL,
  replay_pointer TEXT NOT NULL,
  session_id UUID NOT NULL,
  INDEX idx_provenance_actor_time (actor_id, occurred_at),
  INDEX idx_provenance_action (action)
);

CREATE TABLE IF NOT EXISTS provenance_replay_artifact (
  artifact_id UUID PRIMARY KEY,
  event_id UUID REFERENCES provenance_event(event_id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL CHECK (artifact_type IN ('parquet', 'json', 'pdf', 'html', 'zip')),
  storage_uri TEXT NOT NULL,
  checksum TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE MATERIALIZED VIEW IF NOT EXISTS provenance_session_digest AS
SELECT
  session_id,
  MIN(occurred_at) AS session_start,
  MAX(occurred_at) AS session_end,
  COUNT(*) AS event_count,
  COUNT(DISTINCT action) AS unique_actions,
  bool_and(signature IS NOT NULL) AS all_signed
FROM provenance_event
GROUP BY session_id;
