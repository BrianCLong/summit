-- Add a composite index to the entities table to optimize sorting and filtering by tenant.
CREATE INDEX IF NOT EXISTS idx_entities_tenant_id_created_at ON entities(tenant_id, created_at DESC);
