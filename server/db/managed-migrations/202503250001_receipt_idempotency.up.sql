-- Harden usage event receipt idempotency by enforcing uniqueness on (tenant_id, idempotency_key)
-- Safe for existing data; uses concurrent index creation with existence guard.
DO $$
DECLARE
  idx_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_usage_events_idempotency'
  ) INTO idx_exists;

  IF NOT idx_exists THEN
    EXECUTE 'CREATE UNIQUE INDEX CONCURRENTLY idx_usage_events_idempotency
      ON usage_events (tenant_id, idempotency_key)
      WHERE idempotency_key IS NOT NULL';
  END IF;
END $$;
