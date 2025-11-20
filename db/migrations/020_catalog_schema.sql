-- Data Catalog & Governance Schema Migration
-- Version: 020
-- Description: Unified data catalog for dataset discovery, governance, and lineage

BEGIN;

-- Create catalog schema
CREATE SCHEMA IF NOT EXISTS catalog;

-- Set search path
SET search_path = catalog, maestro, public;

-- Dataset registry table
CREATE TABLE datasets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id VARCHAR(255) NOT NULL UNIQUE, -- Human-readable ID (e.g., "users", "transactions")
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Classification & Type
    data_type VARCHAR(50) NOT NULL, -- audit, analytics, telemetry, communications, ml-training, custom
    classification_level VARCHAR(50) NOT NULL DEFAULT 'internal', -- public, internal, confidential, restricted, regulated

    -- Sensitivity flags
    contains_personal_data BOOLEAN NOT NULL DEFAULT false,
    contains_financial_data BOOLEAN DEFAULT false,
    contains_health_data BOOLEAN DEFAULT false,

    -- Ownership & Governance
    owner_team VARCHAR(255) NOT NULL,
    owner_email VARCHAR(255) NOT NULL,
    jurisdiction JSONB DEFAULT '["US"]'::jsonb, -- Array of jurisdictions
    tags JSONB DEFAULT '[]'::jsonb, -- Array of tags

    -- Storage & Location
    storage_system VARCHAR(50) NOT NULL, -- postgres, neo4j, s3, object-store, elasticsearch, blob
    storage_location TEXT NOT NULL, -- Connection string, bucket name, table name, etc.
    storage_metadata JSONB DEFAULT '{}'::jsonb,

    -- Schema definition
    schema_definition JSONB NOT NULL, -- Array of column definitions with types and metadata
    schema_version INTEGER DEFAULT 1,

    -- License & Contract References
    license_id VARCHAR(255), -- Reference to license/contract
    contract_references JSONB DEFAULT '[]'::jsonb, -- Array of contract references
    authority_requirements JSONB DEFAULT '[]'::jsonb, -- Required authority bindings

    -- Lineage & Provenance
    openlineage_namespace VARCHAR(255),
    openlineage_name VARCHAR(255),
    upstream_datasets JSONB DEFAULT '[]'::jsonb, -- Array of upstream dataset IDs
    downstream_datasets JSONB DEFAULT '[]'::jsonb, -- Array of downstream dataset IDs

    -- Quality & Statistics
    record_count BIGINT,
    last_updated_at TIMESTAMP WITH TIME ZONE,
    data_quality_score NUMERIC(3,2), -- 0.00 to 1.00
    quality_checks JSONB DEFAULT '[]'::jsonb,

    -- Retention & Lifecycle
    retention_days INTEGER,
    retention_policy_id VARCHAR(255),
    archival_location TEXT,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES maestro.users(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES maestro.users(id),
    deprecated_at TIMESTAMP WITH TIME ZONE,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Dataset schema evolution tracking
CREATE TABLE schema_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    schema_definition JSONB NOT NULL,
    changes TEXT, -- Description of changes
    breaking_changes BOOLEAN DEFAULT false,
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    applied_by UUID REFERENCES maestro.users(id),
    UNIQUE(dataset_id, version)
);

-- Lineage edges table (relationships between datasets)
CREATE TABLE lineage_edges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    target_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

    -- Transformation details
    transformation_type VARCHAR(100), -- extract, transform, load, aggregate, join, filter, etc.
    transformation_description TEXT,
    job_name VARCHAR(255), -- Name of the job that created this edge

    -- Column-level lineage
    column_mappings JSONB, -- Array of {source_column, target_column, transformation}

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    run_count INTEGER DEFAULT 1,

    UNIQUE(source_dataset_id, target_dataset_id, transformation_type)
);

-- Dataset access log (audit trail)
CREATE TABLE dataset_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES maestro.users(id),
    access_type VARCHAR(50) NOT NULL, -- read, write, export, delete
    access_method VARCHAR(100), -- api, query, pipeline, export

    -- Authority context
    authority_binding_type VARCHAR(50),
    clearance_level INTEGER,
    reason_for_access TEXT,

    -- Request details
    query_hash VARCHAR(64),
    row_count INTEGER,
    bytes_accessed BIGINT,

    -- Results
    access_granted BOOLEAN NOT NULL,
    denial_reason TEXT,

    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dataset quality metrics
CREATE TABLE quality_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

    -- Metrics
    completeness_score NUMERIC(3,2), -- 0.00 to 1.00
    validity_score NUMERIC(3,2),
    consistency_score NUMERIC(3,2),
    timeliness_score NUMERIC(3,2),
    accuracy_score NUMERIC(3,2),

    -- Specific checks
    null_percentage NUMERIC(5,2),
    duplicate_percentage NUMERIC(5,2),
    outlier_count INTEGER,
    schema_violations_count INTEGER,

    -- Context
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    measurement_job VARCHAR(255),
    sample_size BIGINT,

    UNIQUE(dataset_id, measured_at)
);

-- Dataset tags taxonomy
CREATE TABLE dataset_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tag VARCHAR(100) NOT NULL UNIQUE,
    category VARCHAR(50), -- domain, sensitivity, purpose, lifecycle
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_datasets_dataset_id ON datasets(dataset_id);
CREATE INDEX idx_datasets_owner_team ON datasets(owner_team);
CREATE INDEX idx_datasets_storage_system ON datasets(storage_system);
CREATE INDEX idx_datasets_classification_level ON datasets(classification_level);
CREATE INDEX idx_datasets_data_type ON datasets(data_type);
CREATE INDEX idx_datasets_contains_personal_data ON datasets(contains_personal_data);
CREATE INDEX idx_datasets_tags ON datasets USING gin(tags);
CREATE INDEX idx_lineage_edges_source ON lineage_edges(source_dataset_id);
CREATE INDEX idx_lineage_edges_target ON lineage_edges(target_dataset_id);
CREATE INDEX idx_dataset_access_log_dataset ON dataset_access_log(dataset_id, accessed_at);
CREATE INDEX idx_dataset_access_log_user ON dataset_access_log(user_id, accessed_at);
CREATE INDEX idx_quality_metrics_dataset ON quality_metrics(dataset_id, measured_at);
CREATE INDEX idx_schema_versions_dataset ON schema_versions(dataset_id, version);

-- Insert common tags
INSERT INTO dataset_tags (tag, category, description) VALUES
    ('pii', 'sensitivity', 'Contains personally identifiable information'),
    ('phi', 'sensitivity', 'Contains protected health information'),
    ('financial', 'sensitivity', 'Contains financial data'),
    ('public', 'sensitivity', 'Public data, no restrictions'),
    ('investigation', 'purpose', 'Used for investigations'),
    ('fraud-risk', 'purpose', 'Used for fraud detection'),
    ('trust-safety', 'purpose', 'Used for trust and safety'),
    ('analytics', 'purpose', 'Used for analytics and reporting'),
    ('ml-training', 'purpose', 'Used for machine learning training'),
    ('audit', 'lifecycle', 'Audit trail data'),
    ('operational', 'lifecycle', 'Operational data'),
    ('archived', 'lifecycle', 'Archived historical data'),
    ('users', 'domain', 'User-related data'),
    ('entities', 'domain', 'Entity graph data'),
    ('relationships', 'domain', 'Relationship graph data'),
    ('telemetry', 'domain', 'Telemetry and metrics data'),
    ('golden-path', 'quality', 'Part of the golden path datasets')
ON CONFLICT (tag) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION catalog.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER datasets_updated_at
    BEFORE UPDATE ON datasets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Function to track schema changes
CREATE OR REPLACE FUNCTION catalog.track_schema_change()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.schema_definition IS DISTINCT FROM OLD.schema_definition THEN
        NEW.schema_version = OLD.schema_version + 1;

        INSERT INTO schema_versions (
            dataset_id,
            version,
            schema_definition,
            changes,
            applied_by
        ) VALUES (
            NEW.id,
            NEW.schema_version,
            NEW.schema_definition,
            'Schema updated',
            NEW.updated_by
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically track schema changes
CREATE TRIGGER datasets_schema_change
    BEFORE UPDATE ON datasets
    FOR EACH ROW
    EXECUTE FUNCTION track_schema_change();

-- Create view for simplified dataset discovery
CREATE OR REPLACE VIEW dataset_catalog AS
SELECT
    d.dataset_id,
    d.name,
    d.description,
    d.data_type,
    d.classification_level,
    d.owner_team,
    d.owner_email,
    d.storage_system,
    d.storage_location,
    d.contains_personal_data,
    d.contains_financial_data,
    d.contains_health_data,
    d.tags,
    d.record_count,
    d.last_updated_at,
    d.data_quality_score,
    d.schema_version,
    (SELECT COUNT(*) FROM lineage_edges WHERE source_dataset_id = d.id) as downstream_count,
    (SELECT COUNT(*) FROM lineage_edges WHERE target_dataset_id = d.id) as upstream_count,
    d.created_at,
    d.deprecated_at IS NOT NULL as is_deprecated
FROM datasets d
WHERE d.deleted_at IS NULL
ORDER BY d.name;

-- Grant permissions (assuming maestro users need access)
GRANT USAGE ON SCHEMA catalog TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA catalog TO PUBLIC;
GRANT INSERT, UPDATE, DELETE ON datasets, lineage_edges, quality_metrics, dataset_access_log TO PUBLIC;

COMMIT;
