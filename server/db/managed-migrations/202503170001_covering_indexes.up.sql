-- Covering indexes for hot read paths
-- Enables index-only scans and reduces heap fetches on entity/relationship lookups

CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind_created_cover
  ON entities (tenant_id, kind, created_at DESC)
  INCLUDE (id, labels, props, updated_at, created_by);

CREATE INDEX IF NOT EXISTS idx_entities_tenant_created_cover
  ON entities (tenant_id, created_at DESC)
  INCLUDE (id, kind, labels, props, updated_at, created_by);

CREATE INDEX IF NOT EXISTS idx_relationships_tenant_src_created_cover
  ON relationships (tenant_id, src_id, created_at DESC)
  INCLUDE (id, dst_id, type, props, updated_at, created_by);

CREATE INDEX IF NOT EXISTS idx_relationships_tenant_dst_created_cover
  ON relationships (tenant_id, dst_id, created_at DESC)
  INCLUDE (id, src_id, type, props, updated_at, created_by);

CREATE INDEX IF NOT EXISTS idx_relationships_tenant_type_created_cover
  ON relationships (tenant_id, type, created_at DESC)
  INCLUDE (id, src_id, dst_id, props, updated_at, created_by);
