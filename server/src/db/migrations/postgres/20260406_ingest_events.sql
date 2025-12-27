-- Migration for Streaming Ingest v1
-- Created: 2026-04-06

CREATE TABLE IF NOT EXISTS ingest_events (
    id TEXT PRIMARY KEY, -- Idempotency Key
    tenant_id UUID NOT NULL,
    schema_id TEXT NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ingest_events_tenant_created ON ingest_events(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_ingest_events_schema ON ingest_events(schema_id);

-- Partitioning could be added here for scale
