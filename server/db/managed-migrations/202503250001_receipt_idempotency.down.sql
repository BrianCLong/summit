-- Rollback for usage event receipt idempotency index
DO $$
DECLARE
  idx_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_usage_events_idempotency'
  ) INTO idx_exists;

  IF idx_exists THEN
    EXECUTE 'DROP INDEX CONCURRENTLY IF EXISTS idx_usage_events_idempotency';
  END IF;
END $$;
