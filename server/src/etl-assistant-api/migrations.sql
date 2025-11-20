-- ETL Assistant API database schema
-- Migration for ETL configuration storage and lineage tracking

-- Table: etl_configurations
-- Stores ETL mapping configurations with full lineage
CREATE TABLE IF NOT EXISTS etl_configurations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Configuration data (JSONB for flexibility)
  field_mappings JSONB NOT NULL DEFAULT '[]'::jsonb,
  pii_handling JSONB NOT NULL DEFAULT '[]'::jsonb,
  license_decision JSONB DEFAULT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexing
  CONSTRAINT etl_configurations_tenant_source_idx
    UNIQUE (tenant_id, source_name, created_at)
);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_etl_config_tenant
  ON etl_configurations(tenant_id);

-- Index for source name searches
CREATE INDEX IF NOT EXISTS idx_etl_config_source
  ON etl_configurations(source_name);

-- Index for created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_etl_config_created
  ON etl_configurations(created_at DESC);

-- GIN index for JSONB field_mappings
CREATE INDEX IF NOT EXISTS idx_etl_config_mappings
  ON etl_configurations USING GIN (field_mappings);

-- GIN index for JSONB pii_handling
CREATE INDEX IF NOT EXISTS idx_etl_config_pii
  ON etl_configurations USING GIN (pii_handling);

-- Table: etl_lineage_events
-- Tracks lineage events for provenance queries
CREATE TABLE IF NOT EXISTS etl_lineage_events (
  id TEXT PRIMARY KEY,
  config_id TEXT NOT NULL REFERENCES etl_configurations(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL, -- created, modified, executed, approved
  event_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  event_metadata JSONB DEFAULT '{}'::jsonb,
  performed_by TEXT NOT NULL,

  CONSTRAINT etl_lineage_events_config_fk
    FOREIGN KEY (config_id) REFERENCES etl_configurations(id)
);

-- Index for config lookups
CREATE INDEX IF NOT EXISTS idx_lineage_config
  ON etl_lineage_events(config_id);

-- Index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_lineage_tenant
  ON etl_lineage_events(tenant_id);

-- Index for event type
CREATE INDEX IF NOT EXISTS idx_lineage_event_type
  ON etl_lineage_events(event_type);

-- Index for timestamp
CREATE INDEX IF NOT EXISTS idx_lineage_timestamp
  ON etl_lineage_events(event_timestamp DESC);

-- Comments for documentation
COMMENT ON TABLE etl_configurations IS
  'ETL configuration storage with field mappings, PII handling, and license decisions';

COMMENT ON TABLE etl_lineage_events IS
  'Lineage tracking for ETL configurations to support provenance queries';

COMMENT ON COLUMN etl_configurations.field_mappings IS
  'Array of mapping decisions: [{source_field, canonical_entity, canonical_property, transformation, confidence}]';

COMMENT ON COLUMN etl_configurations.pii_handling IS
  'Array of PII handling decisions: [{field_name, pii_category, redaction_strategy, reason}]';

COMMENT ON COLUMN etl_configurations.license_decision IS
  'License compliance decision: {source_name, license_id, compliance_status, reason}';
