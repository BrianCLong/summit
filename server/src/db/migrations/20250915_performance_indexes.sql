-- Add GIN indexes for JSONB fields to improve query performance

-- audit_logs details index
CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING GIN (details);

-- entities props index (if missing, though 001_tenant_graph_schema.sql implies it might exist)
-- This ensures the index is present regardless of table creation order
CREATE INDEX IF NOT EXISTS idx_entities_props_gin ON entities USING GIN (props);
