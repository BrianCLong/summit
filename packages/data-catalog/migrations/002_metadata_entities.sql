-- Data Catalog Metadata Entities Migration
-- Adds DataSource, Dataset, Field, Mapping, License, and related tables

-- Data Sources Table
CREATE TABLE IF NOT EXISTS catalog_data_sources (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL,
    connector_id VARCHAR(255) NOT NULL,
    connector_version VARCHAR(50) NOT NULL,

    -- Connection details (encrypted/masked)
    connection_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    connection_status VARCHAR(50) NOT NULL DEFAULT 'CONFIGURED',
    last_connected_at TIMESTAMP,
    last_synced_at TIMESTAMP,

    -- Ownership
    owner VARCHAR(255) NOT NULL,
    team VARCHAR(255),

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Schema registry references
    schema_id VARCHAR(255),
    schema_version INTEGER,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_data_sources_type ON catalog_data_sources(type);
CREATE INDEX idx_data_sources_connector ON catalog_data_sources(connector_id);
CREATE INDEX idx_data_sources_owner ON catalog_data_sources(owner);
CREATE INDEX idx_data_sources_status ON catalog_data_sources(connection_status);
CREATE INDEX idx_data_sources_tags ON catalog_data_sources USING gin(tags);

-- Datasets Table
CREATE TABLE IF NOT EXISTS catalog_datasets (
    id VARCHAR(255) PRIMARY KEY,
    source_id VARCHAR(255) NOT NULL REFERENCES catalog_data_sources(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    display_name VARCHAR(500) NOT NULL,
    description TEXT,
    fully_qualified_name VARCHAR(1000) NOT NULL UNIQUE,
    dataset_type VARCHAR(50) NOT NULL,

    -- Schema
    schema_id VARCHAR(255),
    schema_version INTEGER,

    -- Mapping
    canonical_mapping_id VARCHAR(255),
    canonical_mapping_version INTEGER,

    -- License and policy
    license_id VARCHAR(255),
    policy_tags JSONB DEFAULT '[]'::jsonb,
    retention_days INTEGER,
    legal_basis TEXT,

    -- Statistics
    row_count BIGINT,
    size_bytes BIGINT,
    last_profiled_at TIMESTAMP,

    -- Quality
    quality_score DECIMAL(3,2),

    -- Ownership
    owner VARCHAR(255) NOT NULL,
    stewards JSONB DEFAULT '[]'::jsonb,

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP
);

CREATE INDEX idx_datasets_source ON catalog_datasets(source_id);
CREATE INDEX idx_datasets_type ON catalog_datasets(dataset_type);
CREATE INDEX idx_datasets_owner ON catalog_datasets(owner);
CREATE INDEX idx_datasets_fqn ON catalog_datasets(fully_qualified_name);
CREATE INDEX idx_datasets_mapping ON catalog_datasets(canonical_mapping_id);
CREATE INDEX idx_datasets_license ON catalog_datasets(license_id);
CREATE INDEX idx_datasets_tags ON catalog_datasets USING gin(tags);
CREATE INDEX idx_datasets_policy_tags ON catalog_datasets USING gin(policy_tags);

-- Fields Table
CREATE TABLE IF NOT EXISTS catalog_fields (
    id VARCHAR(255) PRIMARY KEY,
    dataset_id VARCHAR(255) NOT NULL REFERENCES catalog_datasets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Data type
    data_type VARCHAR(100) NOT NULL,
    semantic_type VARCHAR(100),

    -- Constraints
    nullable BOOLEAN DEFAULT true,
    is_primary_key BOOLEAN DEFAULT false,
    is_foreign_key BOOLEAN DEFAULT false,
    foreign_key_ref VARCHAR(500),

    -- Mapping
    canonical_field_name VARCHAR(255),
    transformation_logic TEXT,

    -- Classification
    policy_tags JSONB DEFAULT '[]'::jsonb,
    sensitivity_level VARCHAR(50) DEFAULT 'INTERNAL',

    -- Statistics
    statistics JSONB,

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(dataset_id, name)
);

CREATE INDEX idx_fields_dataset ON catalog_fields(dataset_id);
CREATE INDEX idx_fields_canonical ON catalog_fields(canonical_field_name);
CREATE INDEX idx_fields_sensitivity ON catalog_fields(sensitivity_level);
CREATE INDEX idx_fields_tags ON catalog_fields USING gin(tags);
CREATE INDEX idx_fields_policy_tags ON catalog_fields USING gin(policy_tags);

-- Licenses Table
CREATE TABLE IF NOT EXISTS catalog_licenses (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    license_type VARCHAR(50) NOT NULL,

    -- Terms
    terms_and_conditions TEXT NOT NULL,
    usage_restrictions JSONB DEFAULT '[]'::jsonb,
    allowed_purposes JSONB DEFAULT '[]'::jsonb,
    prohibited_purposes JSONB DEFAULT '[]'::jsonb,

    -- Attribution
    requires_attribution BOOLEAN DEFAULT false,
    attribution_text TEXT,

    -- Compliance
    compliance_frameworks JSONB DEFAULT '[]'::jsonb,
    legal_basis TEXT,
    jurisdictions JSONB DEFAULT '[]'::jsonb,

    -- Expiration
    expires_at TIMESTAMP,
    auto_renew BOOLEAN DEFAULT false,

    -- Contact
    licensor VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_url VARCHAR(500),

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL
);

CREATE INDEX idx_licenses_type ON catalog_licenses(license_type);
CREATE INDEX idx_licenses_status ON catalog_licenses(status);
CREATE INDEX idx_licenses_licensor ON catalog_licenses(licensor);

-- Schema Registry Table
CREATE TABLE IF NOT EXISTS catalog_schema_registry (
    id VARCHAR(255) PRIMARY KEY,
    schema_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL,
    schema JSONB NOT NULL,
    schema_format VARCHAR(50) NOT NULL,

    -- Compatibility
    backward_compatible BOOLEAN DEFAULT true,
    forward_compatible BOOLEAN DEFAULT false,
    breaking_changes JSONB DEFAULT '[]'::jsonb,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    deprecated_at TIMESTAMP,

    -- Metadata
    description TEXT,
    changelog TEXT,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,

    UNIQUE(schema_id, version)
);

CREATE INDEX idx_schema_registry_schema_id ON catalog_schema_registry(schema_id);
CREATE INDEX idx_schema_registry_status ON catalog_schema_registry(status);
CREATE INDEX idx_schema_registry_version ON catalog_schema_registry(schema_id, version DESC);

-- Mappings Table
CREATE TABLE IF NOT EXISTS catalog_mappings (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Source
    source_id VARCHAR(255) NOT NULL REFERENCES catalog_data_sources(id) ON DELETE CASCADE,
    dataset_id VARCHAR(255) REFERENCES catalog_datasets(id) ON DELETE SET NULL,
    source_schema_id VARCHAR(255) NOT NULL,
    source_schema_version INTEGER NOT NULL,

    -- Target
    canonical_schema_id VARCHAR(255) NOT NULL,
    canonical_schema_version INTEGER NOT NULL,
    canonical_entity_type VARCHAR(255) NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    validated_at TIMESTAMP,
    validated_by VARCHAR(255),

    -- Versioning
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id VARCHAR(255),

    -- Metadata
    tags JSONB DEFAULT '[]'::jsonb,
    properties JSONB DEFAULT '{}'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,

    UNIQUE(source_schema_id, canonical_schema_id, version)
);

CREATE INDEX idx_mappings_source ON catalog_mappings(source_id);
CREATE INDEX idx_mappings_dataset ON catalog_mappings(dataset_id);
CREATE INDEX idx_mappings_canonical ON catalog_mappings(canonical_entity_type);
CREATE INDEX idx_mappings_status ON catalog_mappings(status);

-- Field Mappings Table
CREATE TABLE IF NOT EXISTS catalog_field_mappings (
    id VARCHAR(255) PRIMARY KEY,
    mapping_id VARCHAR(255) NOT NULL REFERENCES catalog_mappings(id) ON DELETE CASCADE,
    source_field_name VARCHAR(255) NOT NULL,
    target_field_name VARCHAR(255) NOT NULL,
    transformation_type VARCHAR(50) NOT NULL,
    transformation_expression TEXT,
    default_value TEXT,
    required BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,

    UNIQUE(mapping_id, source_field_name, target_field_name)
);

CREATE INDEX idx_field_mappings_mapping ON catalog_field_mappings(mapping_id);
CREATE INDEX idx_field_mappings_source_field ON catalog_field_mappings(source_field_name);
CREATE INDEX idx_field_mappings_target_field ON catalog_field_mappings(target_field_name);

-- Transformation Rules Table
CREATE TABLE IF NOT EXISTS catalog_transformation_rules (
    id VARCHAR(255) PRIMARY KEY,
    mapping_id VARCHAR(255) NOT NULL REFERENCES catalog_mappings(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    rule_type VARCHAR(50) NOT NULL,
    expression TEXT NOT NULL,
    language VARCHAR(50) NOT NULL,
    input_fields JSONB DEFAULT '[]'::jsonb,
    output_fields JSONB DEFAULT '[]'::jsonb,
    execution_order INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}'::jsonb,

    UNIQUE(mapping_id, name)
);

CREATE INDEX idx_transformation_rules_mapping ON catalog_transformation_rules(mapping_id);
CREATE INDEX idx_transformation_rules_order ON catalog_transformation_rules(mapping_id, execution_order);

-- Connector Registry Table
CREATE TABLE IF NOT EXISTS catalog_connector_registry (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    description TEXT,
    version VARCHAR(50) NOT NULL,
    source_type VARCHAR(50) NOT NULL,

    -- Implementation
    implementation_class VARCHAR(500) NOT NULL,
    package_name VARCHAR(255) NOT NULL,

    -- Configuration
    config_schema JSONB NOT NULL,
    required_permissions JSONB DEFAULT '[]'::jsonb,

    -- Capabilities
    supports_bulk_extract BOOLEAN DEFAULT false,
    supports_incremental_sync BOOLEAN DEFAULT false,
    supports_realtime BOOLEAN DEFAULT false,
    supports_schema_discovery BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    certified BOOLEAN DEFAULT false,

    -- Metadata
    vendor VARCHAR(255),
    documentation TEXT,
    tags JSONB DEFAULT '[]'::jsonb,

    -- Temporal
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_connector_registry_source_type ON catalog_connector_registry(source_type);
CREATE INDEX idx_connector_registry_status ON catalog_connector_registry(status);
CREATE INDEX idx_connector_registry_certified ON catalog_connector_registry(certified);

-- Lineage Summary Table
CREATE TABLE IF NOT EXISTS catalog_lineage_summary (
    entity_id VARCHAR(255) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,

    -- Upstream
    upstream_sources JSONB DEFAULT '[]'::jsonb,
    upstream_datasets JSONB DEFAULT '[]'::jsonb,
    upstream_fields JSONB DEFAULT '[]'::jsonb,

    -- Downstream
    downstream_datasets JSONB DEFAULT '[]'::jsonb,
    downstream_canonical_entities JSONB DEFAULT '[]'::jsonb,
    downstream_cases JSONB DEFAULT '[]'::jsonb,

    -- Mappings and jobs
    mapping_ids JSONB DEFAULT '[]'::jsonb,
    etl_job_ids JSONB DEFAULT '[]'::jsonb,

    -- Computed
    computed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_lineage_summary_type ON catalog_lineage_summary(entity_type);
CREATE INDEX idx_lineage_summary_computed ON catalog_lineage_summary(computed_at DESC);

-- Link datasets to licenses
ALTER TABLE catalog_datasets
ADD CONSTRAINT fk_dataset_license
FOREIGN KEY (license_id)
REFERENCES catalog_licenses(id)
ON DELETE SET NULL;

-- Link datasets to mappings
ALTER TABLE catalog_datasets
ADD CONSTRAINT fk_dataset_mapping
FOREIGN KEY (canonical_mapping_id)
REFERENCES catalog_mappings(id)
ON DELETE SET NULL;

-- Create full-text search indexes for datasets
CREATE INDEX idx_datasets_name_search ON catalog_datasets USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));

-- Create full-text search indexes for fields
CREATE INDEX idx_fields_name_search ON catalog_fields USING gin(to_tsvector('english', name || ' ' || coalesce(description, '')));

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_data_sources_updated_at BEFORE UPDATE ON catalog_data_sources FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_datasets_updated_at BEFORE UPDATE ON catalog_datasets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fields_updated_at BEFORE UPDATE ON catalog_fields FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_licenses_updated_at BEFORE UPDATE ON catalog_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mappings_updated_at BEFORE UPDATE ON catalog_mappings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_connector_registry_updated_at BEFORE UPDATE ON catalog_connector_registry FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
