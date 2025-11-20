-- ETL Pipeline Infrastructure Tables
-- Supports multi-source data fusion and ETL pipelines

-- Connectors table
CREATE TABLE IF NOT EXISTS etl_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- REST_API, RSS_FEED, CSV_FILE, etc.
  description TEXT,
  enabled BOOLEAN NOT NULL DEFAULT true,
  auth_config JSONB NOT NULL DEFAULT '{}',
  rate_limit_config JSONB,
  connector_config JSONB NOT NULL DEFAULT '{}',
  schedule VARCHAR(100), -- Cron expression
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_connectors_tenant ON etl_connectors(tenant_id);
CREATE INDEX idx_etl_connectors_type ON etl_connectors(type);
CREATE INDEX idx_etl_connectors_enabled ON etl_connectors(enabled);

-- Pipelines table
CREATE TABLE IF NOT EXISTS etl_pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  connector_id UUID NOT NULL REFERENCES etl_connectors(id) ON DELETE CASCADE,
  transformations JSONB NOT NULL DEFAULT '[]',
  data_quality_rules JSONB NOT NULL DEFAULT '[]',
  destination_type VARCHAR(50) NOT NULL,
  destination_config JSONB NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, ACTIVE, PAUSED, FAILED, ARCHIVED
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_pipelines_tenant ON etl_pipelines(tenant_id);
CREATE INDEX idx_etl_pipelines_connector ON etl_pipelines(connector_id);
CREATE INDEX idx_etl_pipelines_status ON etl_pipelines(status);

-- Pipeline Runs table
CREATE TABLE IF NOT EXISTS etl_pipeline_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES etl_pipelines(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, RUNNING, SUCCEEDED, FAILED, CANCELLED, PARTIALLY_SUCCEEDED
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  records_read INTEGER NOT NULL DEFAULT 0,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_written INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  records_duplicate INTEGER NOT NULL DEFAULT 0,
  bytes_processed BIGINT NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  throughput_records_per_sec DECIMAL(10, 2),
  error_rate DECIMAL(5, 4),
  error_message TEXT,
  error_stack TEXT,
  data_quality_assessment JSONB,
  tenant_id VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_runs_pipeline ON etl_pipeline_runs(pipeline_id);
CREATE INDEX idx_etl_runs_tenant ON etl_pipeline_runs(tenant_id);
CREATE INDEX idx_etl_runs_status ON etl_pipeline_runs(status);
CREATE INDEX idx_etl_runs_started_at ON etl_pipeline_runs(started_at DESC);

-- Data Quality Assessments table
CREATE TABLE IF NOT EXISTS etl_data_quality_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES etl_pipeline_runs(id) ON DELETE CASCADE,
  overall_score DECIMAL(5, 2) NOT NULL,
  dimension_scores JSONB NOT NULL DEFAULT '[]',
  total_records INTEGER NOT NULL,
  valid_records INTEGER NOT NULL,
  invalid_records INTEGER NOT NULL,
  assessed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_dq_run ON etl_data_quality_assessments(run_id);
CREATE INDEX idx_etl_dq_score ON etl_data_quality_assessments(overall_score DESC);

-- Data Lineage table
CREATE TABLE IF NOT EXISTS etl_data_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_run_id UUID NOT NULL REFERENCES etl_pipeline_runs(id) ON DELETE CASCADE,
  nodes JSONB NOT NULL DEFAULT '[]',
  edges JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_lineage_run ON etl_data_lineage(pipeline_run_id);

-- Data Catalog table
CREATE TABLE IF NOT EXISTS etl_data_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL, -- TABLE, VIEW, API, FILE, STREAM
  schema_definition JSONB NOT NULL DEFAULT '[]',
  source_metadata JSONB NOT NULL DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  classification VARCHAR(50), -- PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
  pii_fields TEXT[] DEFAULT '{}',
  owner_team VARCHAR(255),
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  record_count BIGINT,
  size_bytes BIGINT,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_catalog_tenant ON etl_data_catalog(tenant_id);
CREATE INDEX idx_etl_catalog_type ON etl_data_catalog(type);
CREATE INDEX idx_etl_catalog_classification ON etl_data_catalog(classification);
CREATE INDEX idx_etl_catalog_name ON etl_data_catalog(name);
CREATE INDEX idx_etl_catalog_tags ON etl_data_catalog USING GIN(tags);

-- Export Configurations table
CREATE TABLE IF NOT EXISTS etl_export_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  format VARCHAR(50) NOT NULL, -- CSV, JSON, XML, PARQUET, AVRO
  destination_type VARCHAR(50) NOT NULL, -- FILE, S3, KAFKA, API
  destination_config JSONB NOT NULL DEFAULT '{}',
  schedule VARCHAR(100), -- Cron expression
  filters JSONB DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  tenant_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_run_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_exports_tenant ON etl_export_configs(tenant_id);
CREATE INDEX idx_etl_exports_enabled ON etl_export_configs(enabled);

-- Incremental Update Watermarks table
CREATE TABLE IF NOT EXISTS etl_watermarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES etl_pipelines(id) ON DELETE CASCADE,
  watermark_field VARCHAR(255) NOT NULL,
  last_watermark VARCHAR(255) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_watermarks_pipeline ON etl_watermarks(pipeline_id);
CREATE UNIQUE INDEX idx_etl_watermarks_pipeline_field ON etl_watermarks(pipeline_id, watermark_field);

-- Connector Run History (for connector-level metrics)
CREATE TABLE IF NOT EXISTS etl_connector_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connector_id UUID NOT NULL REFERENCES etl_connectors(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE,
  records_fetched INTEGER NOT NULL DEFAULT 0,
  errors INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  tenant_id VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_etl_connector_runs_connector ON etl_connector_runs(connector_id);
CREATE INDEX idx_etl_connector_runs_started_at ON etl_connector_runs(started_at DESC);

-- Add trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_etl_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_etl_connectors_updated_at
  BEFORE UPDATE ON etl_connectors
  FOR EACH ROW
  EXECUTE FUNCTION update_etl_updated_at();

CREATE TRIGGER update_etl_pipelines_updated_at
  BEFORE UPDATE ON etl_pipelines
  FOR EACH ROW
  EXECUTE FUNCTION update_etl_updated_at();

CREATE TRIGGER update_etl_catalog_updated_at
  BEFORE UPDATE ON etl_data_catalog
  FOR EACH ROW
  EXECUTE FUNCTION update_etl_updated_at();

CREATE TRIGGER update_etl_exports_updated_at
  BEFORE UPDATE ON etl_export_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_etl_updated_at();

-- Comments
COMMENT ON TABLE etl_connectors IS 'Data source connectors for ETL pipelines';
COMMENT ON TABLE etl_pipelines IS 'ETL pipeline configurations';
COMMENT ON TABLE etl_pipeline_runs IS 'Pipeline execution history and metrics';
COMMENT ON TABLE etl_data_quality_assessments IS 'Data quality assessment results';
COMMENT ON TABLE etl_data_lineage IS 'Data lineage tracking for pipeline runs';
COMMENT ON TABLE etl_data_catalog IS 'Data catalog and metadata management';
COMMENT ON TABLE etl_export_configs IS 'Data export configurations';
COMMENT ON TABLE etl_watermarks IS 'Incremental update watermarks';
COMMENT ON TABLE etl_connector_runs IS 'Connector execution history';
