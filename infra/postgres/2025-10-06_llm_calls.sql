CREATE TABLE IF NOT EXISTS llm_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investigation_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  cost_usd NUMERIC(12,6) NOT NULL,
  latency_ms INTEGER NOT NULL,
  route_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_llm_calls_investigation ON llm_calls (investigation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_llm_calls_provider ON llm_calls (provider, created_at DESC);
