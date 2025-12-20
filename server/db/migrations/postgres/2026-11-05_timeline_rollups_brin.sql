-- Timeline performance: BRIN indexes and partitioned rollups for audit/event timelines

-- BRIN index for audit_events (append-only)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_events'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_events' AND column_name = 'timestamp'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_brin_tenant_timestamp'
      ) THEN
        EXECUTE 'CREATE INDEX idx_audit_events_brin_tenant_timestamp ON audit_events USING BRIN (tenant_id, "timestamp") WITH (pages_per_range = 64)';
      END IF;
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'audit_events' AND column_name = 'created_at'
    ) THEN
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_audit_events_brin_tenant_created_at'
      ) THEN
        EXECUTE 'CREATE INDEX idx_audit_events_brin_tenant_created_at ON audit_events USING BRIN (tenant_id, created_at) WITH (pages_per_range = 64)';
      END IF;
    END IF;
  END IF;
END
$$;

-- BRIN index for event_store timelines (aggregate event sourcing)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'event_store'
  ) THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_event_store_brin_tenant_ts'
    ) THEN
      EXECUTE 'CREATE INDEX idx_event_store_brin_tenant_ts ON event_store USING BRIN (tenant_id, event_timestamp) WITH (pages_per_range = 64)';
    END IF;
  END IF;
END
$$;

-- Rollup metadata/state to support resumable refreshes
CREATE TABLE IF NOT EXISTS audit_event_rollup_state (
  rollup_name TEXT PRIMARY KEY,
  last_processed_at TIMESTAMPTZ,
  last_run_started_at TIMESTAMPTZ,
  last_run_completed_at TIMESTAMPTZ,
  last_run_status TEXT,
  last_error TEXT,
  rows_processed BIGINT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Partitioned rollups (daily/weekly) for timeline views
CREATE TABLE IF NOT EXISTS audit_event_rollups_daily (
  bucket_start DATE NOT NULL,
  bucket_end DATE NOT NULL,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL,
  service_id TEXT,
  event_count BIGINT NOT NULL DEFAULT 0,
  last_event_timestamp TIMESTAMPTZ,
  PRIMARY KEY (bucket_start, tenant_id, event_type, level)
) PARTITION BY RANGE (bucket_start);

CREATE TABLE IF NOT EXISTS audit_event_rollups_weekly (
  bucket_start DATE NOT NULL,
  bucket_end DATE NOT NULL,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  level TEXT NOT NULL,
  service_id TEXT,
  event_count BIGINT NOT NULL DEFAULT 0,
  last_event_timestamp TIMESTAMPTZ,
  PRIMARY KEY (bucket_start, tenant_id, event_type, level)
) PARTITION BY RANGE (bucket_start);

-- Default partitions catch any out-of-range buckets
CREATE TABLE IF NOT EXISTS audit_event_rollups_daily_default
  PARTITION OF audit_event_rollups_daily DEFAULT;

CREATE TABLE IF NOT EXISTS audit_event_rollups_weekly_default
  PARTITION OF audit_event_rollups_weekly DEFAULT;

-- Common lookup indexes for rollups
CREATE INDEX IF NOT EXISTS idx_audit_event_rollups_daily_tenant_bucket
  ON audit_event_rollups_daily (tenant_id, bucket_start);

CREATE INDEX IF NOT EXISTS idx_audit_event_rollups_weekly_tenant_bucket
  ON audit_event_rollups_weekly (tenant_id, bucket_start);
