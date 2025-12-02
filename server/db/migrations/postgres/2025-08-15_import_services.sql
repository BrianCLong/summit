-- IntelGraph Import Services Schema
-- This migration adds tables for CSV and STIX import job tracking

-- CSV Import Jobs Table
CREATE TABLE IF NOT EXISTS csv_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    investigation_id UUID,
    user_id UUID,
    tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    file_path TEXT NOT NULL,
    mapping JSONB DEFAULT '{}',
    stats JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- STIX Import Jobs Table  
CREATE TABLE IF NOT EXISTS stix_import_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL, -- 'TAXII' or 'STIX_BUNDLE'
    investigation_id UUID,
    user_id UUID,
    tenant_id VARCHAR(255) NOT NULL DEFAULT 'default',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    taxii_url TEXT,
    collection_id VARCHAR(255),
    bundle_path TEXT,
    cursor TEXT, -- For TAXII pagination
    stats JSONB DEFAULT '{}',
    errors JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_investigation ON csv_import_jobs(investigation_id);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_status ON csv_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_created ON csv_import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_csv_import_jobs_tenant ON csv_import_jobs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_stix_import_jobs_investigation ON stix_import_jobs(investigation_id);
CREATE INDEX IF NOT EXISTS idx_stix_import_jobs_status ON stix_import_jobs(status);
CREATE INDEX IF NOT EXISTS idx_stix_import_jobs_type ON stix_import_jobs(type);
CREATE INDEX IF NOT EXISTS idx_stix_import_jobs_created ON stix_import_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stix_import_jobs_tenant ON stix_import_jobs(tenant_id);

-- Add constraints for valid statuses
ALTER TABLE csv_import_jobs 
ADD CONSTRAINT valid_csv_status 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled'));

ALTER TABLE stix_import_jobs 
ADD CONSTRAINT valid_stix_status 
CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused'));

ALTER TABLE stix_import_jobs 
ADD CONSTRAINT valid_stix_type 
CHECK (type IN ('TAXII', 'STIX_BUNDLE'));

-- Comments for documentation
COMMENT ON TABLE csv_import_jobs IS 'Tracks CSV file import jobs with progress and error details';
COMMENT ON TABLE stix_import_jobs IS 'Tracks STIX/TAXII import jobs with cursor support for resumability';

COMMENT ON COLUMN csv_import_jobs.mapping IS 'JSON mapping configuration from CSV fields to domain fields';
COMMENT ON COLUMN csv_import_jobs.stats IS 'Import statistics (rows processed, nodes created, errors, etc.)';
COMMENT ON COLUMN csv_import_jobs.errors IS 'Array of error details encountered during import';

COMMENT ON COLUMN stix_import_jobs.cursor IS 'TAXII pagination cursor for resuming interrupted imports';
COMMENT ON COLUMN stix_import_jobs.stats IS 'Import statistics (objects processed, nodes created, relationships, etc.)';
COMMENT ON COLUMN stix_import_jobs.errors IS 'Array of error details encountered during import';

-- Views for monitoring and analytics
CREATE OR REPLACE VIEW import_job_summary AS
SELECT 
    'CSV' as job_type,
    id,
    investigation_id,
    status,
    created_at,
    started_at,
    finished_at,
    (finished_at - started_at) AS duration,
    (stats->>'processedRows')::int AS processed_items,
    (stats->>'errors')::int AS error_count
FROM csv_import_jobs
UNION ALL
SELECT 
    type as job_type,
    id,
    investigation_id,
    status,
    created_at,
    started_at,
    finished_at,
    (finished_at - started_at) AS duration,
    (stats->>'processedObjects')::int AS processed_items,
    (stats->>'errors')::int AS error_count
FROM stix_import_jobs
ORDER BY created_at DESC;

-- Function to clean up old completed jobs (retention policy)
CREATE OR REPLACE FUNCTION cleanup_old_import_jobs(retention_days INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
BEGIN
    -- Clean up CSV jobs
    -- AUDIT: ALLOW DESTRUCTIVE
    DELETE FROM csv_import_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND finished_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up STIX jobs
    -- AUDIT: ALLOW DESTRUCTIVE
    DELETE FROM stix_import_jobs 
    WHERE status IN ('completed', 'failed', 'cancelled') 
    AND finished_at < NOW() - INTERVAL '1 day' * retention_days;
    
    GET DIAGNOSTICS deleted_count = deleted_count + ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;