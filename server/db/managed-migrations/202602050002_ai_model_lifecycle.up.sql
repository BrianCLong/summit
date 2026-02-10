
-- AI Model Lifecycle Automation
-- Task #102
-- SAFE: Creating indexes on new tables is safe.

CREATE TABLE IF NOT EXISTS ai_models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  state TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  last_retrained_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_models_state ON ai_models(state);
