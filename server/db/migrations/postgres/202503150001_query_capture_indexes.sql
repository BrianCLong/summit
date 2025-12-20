-- Query Capture / Index Pack (2025-03-15)
-- Adds additive indexes to accelerate the top Postgres queries surfaced in capture mode
-- Notes:
--   * Guarded with lock_timeout/statement_timeout for safer deploys
--   * No drops; rollback lives in the matching .down.sql

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '15s';

DO $$
BEGIN
  IF to_regclass('public.entities') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_entities_tenant_investigation_id_full
      ON entities (tenant_id, (props->>'investigationId'));

    CREATE INDEX IF NOT EXISTS idx_entities_tenant_kind_created_at
      ON entities (tenant_id, kind, created_at DESC);
  END IF;

  IF to_regclass('public.relationships') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_relationships_tenant_investigation_id_full
      ON relationships (tenant_id, (props->>'investigationId'));

    CREATE INDEX IF NOT EXISTS idx_relationships_tenant_src_created_at
      ON relationships (tenant_id, src_id, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_relationships_tenant_dst_created_at
      ON relationships (tenant_id, dst_id, created_at DESC);
  END IF;

  IF to_regclass('public.investigations') IS NOT NULL THEN
    CREATE INDEX IF NOT EXISTS idx_investigations_tenant_status_created_at
      ON investigations (tenant_id, status, created_at DESC);
  END IF;
END
$$;
