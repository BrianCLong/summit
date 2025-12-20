-- Rollback for Query Capture Index Pack (2025-03-15)
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
BEGIN
  PERFORM 1;
  DROP INDEX IF EXISTS idx_investigations_tenant_status_created_at;
  DROP INDEX IF EXISTS idx_relationships_tenant_dst_created_at;
  DROP INDEX IF EXISTS idx_relationships_tenant_src_created_at;
  DROP INDEX IF EXISTS idx_relationships_tenant_investigation_id_full;
  DROP INDEX IF EXISTS idx_entities_tenant_kind_created_at;
  DROP INDEX IF EXISTS idx_entities_tenant_investigation_id_full;
END
$$;
