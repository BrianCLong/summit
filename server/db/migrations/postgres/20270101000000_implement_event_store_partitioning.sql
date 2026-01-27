-- Event store partitioning (tenant + monthly range)
-- Safe, additive rollout behind DB_PARTITIONS_V1 toggle
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Partitioned parent table
CREATE TABLE IF NOT EXISTS event_store_partitioned (
  tenant_id VARCHAR(255) NOT NULL,
  event_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_version INTEGER NOT NULL DEFAULT 1,
  event_data JSONB NOT NULL,
  event_metadata JSONB DEFAULT '{}'::jsonb,
  user_id VARCHAR(255) NOT NULL,
  correlation_id VARCHAR(255),
  causation_id UUID,
  legal_basis VARCHAR(50),
  data_classification VARCHAR(50) DEFAULT 'INTERNAL',
  retention_policy VARCHAR(100) DEFAULT 'STANDARD',
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(255),
  event_hash VARCHAR(64) NOT NULL,
  previous_event_hash VARCHAR(64),
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (tenant_id, event_id, event_timestamp)
) PARTITION BY LIST (tenant_id);

-- Partitioned indexes mirror the legacy table
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_store_p_agg_version
  ON event_store_partitioned (tenant_id, aggregate_type, aggregate_id, aggregate_version);
CREATE INDEX IF NOT EXISTS idx_event_store_p_aggregate
  ON event_store_partitioned (aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_p_event_type
  ON event_store_partitioned (event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_p_tenant_time
  ON event_store_partitioned (tenant_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_p_user
  ON event_store_partitioned (tenant_id, user_id, event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_p_correlation
  ON event_store_partitioned (tenant_id, correlation_id)
  WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_store_p_classification
  ON event_store_partitioned (data_classification);

-- Catch-all until tenant-specific partitions are created
CREATE TABLE IF NOT EXISTS event_store_partitioned_default
  PARTITION OF event_store_partitioned DEFAULT;

COMMENT ON TABLE event_store_partitioned IS
  'Tenant-scoped, monthly-range partitioned event store for DB_PARTITIONS_V1';

-- Ensure per-tenant list partitions with monthly subpartitions
CREATE OR REPLACE FUNCTION ensure_event_store_partition(
  p_tenant_id TEXT,
  p_months_ahead INTEGER DEFAULT 2,
  p_retention_months INTEGER DEFAULT 18
) RETURNS VOID AS $$
DECLARE
  tenant_suffix TEXT := substring(md5(p_tenant_id) for 8);
  tenant_partition TEXT := format('event_store_tenant_%s', tenant_suffix);
  month_start DATE;
  month_end DATE;
  subpartition_name TEXT;
  drop_before DATE := (date_trunc('month', CURRENT_DATE) - make_interval(months => p_retention_months))::date;
BEGIN
  -- Tenant list partition with range subpartitioning by event_timestamp
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF event_store_partitioned FOR VALUES IN (%L) PARTITION BY RANGE (event_timestamp)',
    tenant_partition,
    p_tenant_id
  );

  -- Create month buckets: previous, current, and lookahead months
  FOR month_start IN
    SELECT (date_trunc('month', CURRENT_DATE) + (i || ' month')::interval)::date
    FROM generate_series(-1, p_months_ahead) AS gs(i)
  LOOP
    month_end := (month_start + INTERVAL '1 month')::date;
    subpartition_name := format('%s_%s', tenant_partition, to_char(month_start, 'YYYYMM'));

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
      subpartition_name,
      tenant_partition,
      month_start,
      month_end
    );
  END LOOP;

  -- Retention pruning for old month buckets
  IF p_retention_months IS NOT NULL AND p_retention_months > 0 THEN
    FOR subpartition_name IN
      SELECT c.relname
      FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhrelid
      JOIN pg_class p ON p.oid = i.inhparent
      WHERE p.relname = tenant_partition
    LOOP
      PERFORM 1;
      BEGIN
        -- Partition names are suffixed with YYYYMM
        IF subpartition_name ~ '_(\d{6})$' THEN
          month_start := to_date(right(subpartition_name, 6), 'YYYYMM');
          IF month_start < drop_before THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', subpartition_name);
          END IF;
        END IF;
      EXCEPTION WHEN others THEN
        -- Ignore malformed names; keep partition
        CONTINUE;
      END;
    END LOOP;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Bulk ensure partitions for all tenants (tenants table preferred, legacy fallback)
CREATE OR REPLACE FUNCTION ensure_event_store_partitions_for_all(
  p_months_ahead INTEGER DEFAULT 2,
  p_retention_months INTEGER DEFAULT 18
) RETURNS INTEGER AS $$
DECLARE
  tenant_rec RECORD;
  created_count INTEGER := 0;
  tenant_query TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'tenants'
  ) THEN
    tenant_query := 'SELECT id::text AS tenant_id FROM tenants';
  ELSE
    tenant_query := 'SELECT DISTINCT tenant_id FROM event_store';
  END IF;

  FOR tenant_rec IN EXECUTE tenant_query LOOP
    PERFORM ensure_event_store_partition(tenant_rec.tenant_id, p_months_ahead, p_retention_months);
    created_count := created_count + 1;
  END LOOP;

  RETURN created_count;
END;
$$ LANGUAGE plpgsql;

-- Metrics view: partition count, sizes, and bounds
CREATE OR REPLACE VIEW event_store_partition_metrics AS
SELECT
  t.relid::regclass AS partition_name,
  t.parentrelid::regclass AS parent_name,
  t.level,
  pg_total_relation_size(t.relid) AS total_bytes,
  pg_size_pretty(pg_total_relation_size(t.relid)) AS total_pretty,
  pg_size_pretty(pg_relation_size(t.relid)) AS heap_pretty,
  pg_size_pretty(pg_indexes_size(t.relid)) AS index_pretty,
  pg_get_expr(c.relpartbound, c.oid) AS bounds
FROM pg_partition_tree('event_store_partitioned') t
JOIN pg_class c ON c.oid = t.relid
WHERE t.isleaf;

CREATE OR REPLACE VIEW event_store_partition_overview AS
SELECT
  bounds,
  COUNT(*) AS partition_count,
  pg_size_pretty(SUM(total_bytes)) AS total_size
FROM event_store_partition_metrics
GROUP BY bounds
ORDER BY partition_count DESC;
