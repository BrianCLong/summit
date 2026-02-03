-- Partition Outbox Events by Timestamp

-- 1. Rename existing table if it exists (and is not already partitioned)
DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT relkind = 'p' INTO is_partitioned
    FROM pg_class
    WHERE relname = 'outbox_events';

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'outbox_events') AND (is_partitioned IS NULL OR is_partitioned = FALSE) THEN
        ALTER TABLE outbox_events RENAME TO outbox_events_legacy;
    END IF;
END $$;

-- 2. Create new partitioned table
CREATE TABLE IF NOT EXISTS outbox_events (
  id BIGSERIAL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  PRIMARY KEY (id, occurred_at)
) PARTITION BY RANGE (occurred_at);

-- 3. Re-create indexes
CREATE INDEX IF NOT EXISTS idx_outbox_unprocessed ON outbox_events(processed_at) WHERE processed_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_outbox_aggregate ON outbox_events(aggregate_type, aggregate_id);

-- 4. Create initial partitions (Current month and next month)
DO $$
DECLARE
    current_month_start DATE := date_trunc('month', now());
    next_month_start DATE := date_trunc('month', now() + interval '1 month');
    next_next_month_start DATE := date_trunc('month', now() + interval '2 months');

    current_partition_name TEXT := 'outbox_events_y' || to_char(current_month_start, 'YYYY') || 'm' || to_char(current_month_start, 'MM');
    next_partition_name TEXT := 'outbox_events_y' || to_char(next_month_start, 'YYYY') || 'm' || to_char(next_month_start, 'MM');
BEGIN
    -- Current Month
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF outbox_events FOR VALUES FROM (%L) TO (%L)',
                   current_partition_name, current_month_start, next_month_start);

    -- Next Month
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF outbox_events FOR VALUES FROM (%L) TO (%L)',
                   next_partition_name, next_month_start, next_next_month_start);
END $$;
