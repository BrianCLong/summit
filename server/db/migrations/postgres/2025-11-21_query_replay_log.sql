CREATE TABLE IF NOT EXISTS query_replay_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cypher TEXT NOT NULL,
  params JSONB,
  duration_ms INTEGER NOT NULL,
  tenant_id TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  replayed BOOLEAN DEFAULT FALSE,
  replay_result JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_query_replay_log_tenant_id ON query_replay_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_query_replay_log_timestamp ON query_replay_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_query_replay_log_duration ON query_replay_log(duration_ms);
