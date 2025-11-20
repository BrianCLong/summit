CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  openapi JSONB NOT NULL,
  auth JSONB,
  tags TEXT[],
  enabled BOOLEAN DEFAULT true,
  owner TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_tools_tenant_id ON tools (tenant_id);

CREATE TABLE episodic_memory (
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  event_json JSONB NOT NULL,
  ts TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (run_id, step)
);
CREATE INDEX idx_episodic_memory_tenant_id ON episodic_memory (tenant_id);

CREATE TABLE working_memory (
  run_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  summary TEXT,
  key_facts JSONB,
  retention_tier TEXT NOT NULL DEFAULT 'standard',
  ts TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_working_memory_tenant_id ON working_memory (tenant_id);

CREATE TABLE tool_memory (
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  usage_stats JSONB,
  last_result JSONB,
  ts TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (run_id, tool_id)
);
CREATE INDEX idx_tool_memory_tenant_id ON tool_memory (tenant_id);

CREATE TABLE provenance_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  retention_tier TEXT NOT NULL DEFAULT 'standard',
  ts TIMESTAMPTZ DEFAULT NOW(),
  prev_hash TEXT,
  hash TEXT NOT NULL
);
CREATE INDEX idx_provenance_events_tenant_id ON provenance_events (tenant_id);
