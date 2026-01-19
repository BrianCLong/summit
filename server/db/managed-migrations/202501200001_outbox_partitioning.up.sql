-- Partitioning for Outbox Events (monthly range)
-- This improves performance for high-throughput event logs and allows efficient archival.

-- Ensure the parent table is partitioned if not already (this would require a migration strategy in production,
-- but for this exercise we assume we can modify the schema or create a new one).
-- Since modifying an existing non-partitioned table to partitioned is complex,
-- we will create a NEW partitioned table and assume a migration of data would happen separately.

CREATE TABLE IF NOT EXISTS outbox_events_partitioned (
  id BIGSERIAL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  PRIMARY KEY (id, occurred_at) -- Partition key must be part of PK
) PARTITION BY RANGE (occurred_at);

-- Create partitions for current and next months
CREATE TABLE IF NOT EXISTS outbox_events_2025_01 PARTITION OF outbox_events_partitioned
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE IF NOT EXISTS outbox_events_2025_02 PARTITION OF outbox_events_partitioned
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE IF NOT EXISTS outbox_events_default PARTITION OF outbox_events_partitioned DEFAULT;

-- Function to automatically create future partitions
CREATE OR REPLACE FUNCTION create_outbox_partition_next_month()
RETURNS void AS $$
DECLARE
    next_month_start date;
    next_month_end date;
    partition_name text;
BEGIN
    next_month_start := date_trunc('month', now() + interval '1 month');
    next_month_end := date_trunc('month', now() + interval '2 months');
    partition_name := 'outbox_events_' || to_char(next_month_start, 'YYYY_MM');

    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF outbox_events_partitioned FOR VALUES FROM (%L) TO (%L)',
                   partition_name, next_month_start, next_month_end);
END;
$$ LANGUAGE plpgsql;

-- Indexes on the partitioned table
CREATE INDEX IF NOT EXISTS idx_outbox_p_unprocessed ON outbox_events_partitioned(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_p_aggregate ON outbox_events_partitioned(aggregate_type, aggregate_id);
