-- Enable RLS for multi-tenant isolation
-- Depends on 001_tenant_graph_schema.sql

BEGIN;

-- Entities
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_entities ON entities;
CREATE POLICY tenant_isolation_entities ON entities
  USING (tenant_id = current_setting('app.tenant_id', true)::VARCHAR);

-- Relationships
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_relationships ON relationships;
CREATE POLICY tenant_isolation_relationships ON relationships
  USING (tenant_id = current_setting('app.tenant_id', true)::VARCHAR);

-- Provenance Records
ALTER TABLE provenance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_isolation_provenance ON provenance_records;
CREATE POLICY tenant_isolation_provenance ON provenance_records
  USING (tenant_id = current_setting('app.tenant_id', true)::VARCHAR);

-- Index for RLS performance (already exist in 001 but verifying)
CREATE INDEX IF NOT EXISTS idx_entities_tenant_id ON entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_relationships_tenant_id ON relationships(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provenance_tenant ON provenance_records(tenant_id);

COMMIT;
