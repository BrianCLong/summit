CREATE TABLE IF NOT EXISTS llm_usage_logs (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id VARCHAR(255),
  model_name VARCHAR(255) NOT NULL,
  prompt TEXT NOT NULL,
  prompt_structure JSONB,
  response TEXT,
  metadata JSONB,
  latency_ms INTEGER
);
