-- Tenant Graph Slice v0 - Database Schema
-- PostgreSQL migrations for multi-tenant graph entities and provenance

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Entities table (source of truth)
CREATE TABLE IF NOT EXISTS entities (
  id VARCHAR(255) PRIMARY KEY,  -- Stable ID: tenant:kind:hash
  tenant_id VARCHAR(255) NOT NULL,
  kind VARCHAR(100) NOT NULL,  -- person, organization, asset, event, indicator
  labels TEXT[] NOT NULL DEFAULT '{}',
  props JSONB NOT NULL DEFAULT '{}',
  created_by VARCHAR(255) NOT NULL,
  provenance_id VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for entities
CREATE INDEX IF NOT EXISTS idx_entities_tenant_id ON entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_entities_kind ON entities(kind);
CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind ON entities(tenant_id, kind);
CREATE INDEX IF NOT EXISTS idx_entities_provenance ON entities(provenance_id);
CREATE INDEX IF NOT EXISTS idx_entities_created_at ON entities(created_at DESC);

-- GIN index for JSONB properties (enables fast property queries)
CREATE INDEX IF NOT EXISTS idx_entities_props ON entities USING GIN (props);

-- Full-text search index on properties
CREATE INDEX IF NOT EXISTS idx_entities_props_fulltext ON entities USING GIN (
  to_tsvector('english', COALESCE(props->>'name', '') || ' ' || COALESCE(props->>'description', ''))
);

-- Relationships table
CREATE TABLE IF NOT EXISTS relationships (
  id VARCHAR(255) PRIMARY KEY,  -- rel:hash
  tenant_id VARCHAR(255) NOT NULL,
  from_entity_id VARCHAR(255) NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  to_entity_id VARCHAR(255) NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  relationship_type VARCHAR(100) NOT NULL,  -- MEMBER_OF, OWNS, etc.
  props JSONB NOT NULL DEFAULT '{}',
  confidence FLOAT NOT NULL DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
  source VARCHAR(255),
  provenance_id VARCHAR(255),
  first_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_seen TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for relationships
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_id ON relationships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_relationships_from ON relationships(from_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_to ON relationships(to_entity_id);
CREATE INDEX IF NOT EXISTS idx_relationships_type ON relationships(relationship_type);
CREATE INDEX IF NOT EXISTS idx_relationships_confidence ON relationships(confidence DESC);
CREATE INDEX IF NOT EXISTS idx_relationships_provenance ON relationships(provenance_id);

-- Composite index for graph traversal
CREATE INDEX IF NOT EXISTS idx_relationships_graph ON relationships(
  tenant_id, from_entity_id, relationship_type
);

-- Provenance records table (immutable audit trail)
CREATE TABLE IF NOT EXISTS provenance_records (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  source_type VARCHAR(100) NOT NULL,  -- s3-csv, http-push, api, etc.
  source_id VARCHAR(255) NOT NULL,  -- Bucket/file path, API endpoint, etc.
  user_id VARCHAR(255) NOT NULL,
  entity_count INTEGER NOT NULL DEFAULT 0,
  relationship_count INTEGER NOT NULL DEFAULT 0,
  hash_manifest TEXT,  -- SHA-256 of input data
  transform_chain JSONB,  -- Array of transformation steps
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for provenance
CREATE INDEX IF NOT EXISTS idx_provenance_tenant ON provenance_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provenance_source ON provenance_records(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_provenance_created ON provenance_records(created_at DESC);

-- Outbox pattern for Neo4j sync (eventual consistency)
CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic VARCHAR(100) NOT NULL,  -- entity.upsert, relationship.upsert, etc.
  payload JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  retry_count INTEGER NOT NULL DEFAULT 0,
  error TEXT
);

-- Indexes for outbox
CREATE INDEX IF NOT EXISTS idx_outbox_topic ON outbox_events(topic);
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(created_at)
  WHERE processed_at IS NULL;

-- Retention policy metadata
CREATE TABLE IF NOT EXISTS retention_policy (
  id SERIAL PRIMARY KEY,
  entity_kind VARCHAR(100),
  has_pii BOOLEAN NOT NULL DEFAULT FALSE,
  retention_class VARCHAR(50) NOT NULL,  -- short-30d, standard-365d, etc.
  retention_days INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(entity_kind, has_pii)
);

-- Default retention policies
INSERT INTO retention_policy (entity_kind, has_pii, retention_class, retention_days)
VALUES
  ('person', TRUE, 'short-30d', 30),
  ('person', FALSE, 'standard-365d', 365),
  ('organization', FALSE, 'standard-365d', 365),
  ('asset', FALSE, 'standard-365d', 365),
  ('event', FALSE, 'standard-365d', 365),
  ('indicator', FALSE, 'long-1095d', 1095)
ON CONFLICT (entity_kind, has_pii) DO NOTHING;

-- Field-level encryption keys table (for PII encryption)
CREATE TABLE IF NOT EXISTS encryption_keys (
  id SERIAL PRIMARY KEY,
  key_id VARCHAR(255) UNIQUE NOT NULL,
  encrypted_key BYTEA NOT NULL,  -- Encrypted with master key
  algorithm VARCHAR(50) NOT NULL DEFAULT 'AES-256-GCM',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  rotated_at TIMESTAMP WITH TIME ZONE,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Tenant configuration table
CREATE TABLE IF NOT EXISTS tenant_config (
  tenant_id VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  purpose_tags TEXT[] NOT NULL DEFAULT '{}',  -- investigation, threat-intel, demo, etc.
  max_entities INTEGER,
  max_relationships INTEGER,
  retention_override JSONB,  -- Override default retention policies
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Update trigger for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tenant_config_updated_at
  BEFORE UPDATE ON tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check retention and mark for deletion
CREATE OR REPLACE FUNCTION check_retention()
RETURNS TABLE(entity_id VARCHAR, marked_for_deletion BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  WITH entity_retention AS (
    SELECT
      e.id,
      e.created_at,
      rp.retention_days,
      (NOW() - e.created_at) > (rp.retention_days || ' days')::INTERVAL AS expired
    FROM entities e
    LEFT JOIN retention_policy rp ON rp.entity_kind = e.kind
      AND rp.has_pii = (e.props ? 'email' OR e.props ? 'phone' OR e.props ? 'dateOfBirth')
    WHERE rp.retention_days IS NOT NULL
  )
  SELECT
    entity_retention.id::VARCHAR,
    entity_retention.expired
  FROM entity_retention
  WHERE entity_retention.expired = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE entities IS 'Multi-tenant entity storage with provenance tracking';
COMMENT ON TABLE relationships IS 'Graph edges with confidence scores and temporal tracking';
COMMENT ON TABLE provenance_records IS 'Immutable audit trail for data lineage';
COMMENT ON TABLE outbox_events IS 'Event sourcing for Neo4j synchronization';
COMMENT ON TABLE retention_policy IS 'Data retention rules per entity type and PII classification';

-- Row-level security (RLS) for tenant isolation
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;

-- Policies will be created per-tenant at runtime via application code
-- Example policy creation (done in application init):
-- CREATE POLICY tenant_isolation_entities ON entities
--   USING (tenant_id = current_setting('app.current_tenant')::VARCHAR);
