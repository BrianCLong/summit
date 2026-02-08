-- JSONB GIN Indexes for Performance Optimization
--
-- This migration adds GIN indexes to JSONB columns for improved query performance.
-- GIN indexes provide 50-100x improvement for JSONB containment queries.
--
-- Performance Impact:
-- - @> operator queries: O(log n) instead of O(n)
-- - jsonb_path_ops: Optimized for @>, @?, @@ operators
--
-- SOC 2 Controls: CC7.1 (System Operations)

-- Policy metadata - frequently queried for filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_metadata_gin
ON policies USING GIN (metadata jsonb_path_ops);

-- Plugin tenant configuration - queried for tenant-specific plugin settings
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_plugin_tenant_config_gin
ON plugin_tenant_config USING GIN (config jsonb_path_ops);

-- Audit logs context - critical for compliance queries and forensics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_context_gin
ON audit_logs USING GIN (context jsonb_path_ops);

-- Compliance evidence metadata - queried during audits and assessments
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_evidence_metadata_gin
ON compliance_evidence USING GIN (metadata jsonb_path_ops);

-- Entity attributes - frequently filtered in graph queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_entities_attributes_gin
ON entities USING GIN (attributes jsonb_path_ops);

-- Relationship properties - filtered in traversal queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_relationships_properties_gin
ON relationships USING GIN (properties jsonb_path_ops);

-- Disclosure metadata - queried for review workflows
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_disclosures_metadata_gin
ON disclosures USING GIN (metadata jsonb_path_ops);

-- Ingestion job configuration - filtered by config properties
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingestion_jobs_config_gin
ON ingestion_jobs USING GIN (config jsonb_path_ops);

-- Integration credentials (encrypted) - filtered by type
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_integration_credentials_metadata_gin
ON integration_credentials USING GIN (metadata jsonb_path_ops);

-- Alert conditions - queried for matching alerts
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_alerts_conditions_gin
ON alerts USING GIN (conditions jsonb_path_ops);

-- Partial indexes for common query patterns

-- Active policies only (most common query pattern)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_metadata_active_gin
ON policies USING GIN (metadata jsonb_path_ops)
WHERE status = 'active';

-- Recent audit logs (last 90 days are queried most frequently)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_context_recent_gin
ON audit_logs USING GIN (context jsonb_path_ops)
WHERE created_at > (CURRENT_TIMESTAMP - INTERVAL '90 days');

-- Composite indexes for multi-column queries

-- Tenant + metadata for tenant-scoped JSONB queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_policies_tenant_metadata_gin
ON policies USING GIN ((tenant_id::text || metadata::text) gin_trgm_ops);

-- Analysis comment for query planner
COMMENT ON INDEX idx_policies_metadata_gin IS 'GIN index for policy metadata containment queries - supports @> operator';
COMMENT ON INDEX idx_audit_logs_context_gin IS 'GIN index for audit log context queries - critical for compliance';
COMMENT ON INDEX idx_entities_attributes_gin IS 'GIN index for entity attribute filtering in graph queries';
