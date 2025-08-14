-- AI request registry and entity tags
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS copilot_ai_requests (
  id UUID PRIMARY KEY,
  entity_id TEXT NOT NULL,
  requester TEXT,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS copilot_ai_requests_recent_idx ON copilot_ai_requests(entity_id, requester, created_at);

CREATE TABLE IF NOT EXISTS entity_tags (
  entity_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (entity_id, tag)
);

