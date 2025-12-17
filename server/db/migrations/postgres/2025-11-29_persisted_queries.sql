-- Migration to add persisted_queries table for GraphQL APQ management

CREATE TABLE IF NOT EXISTS persisted_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sha256 TEXT NOT NULL UNIQUE,
  query TEXT NOT NULL,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  tenant_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_persisted_queries_sha256 ON persisted_queries(sha256);
CREATE INDEX IF NOT EXISTS idx_persisted_queries_tenant_id ON persisted_queries(tenant_id);
