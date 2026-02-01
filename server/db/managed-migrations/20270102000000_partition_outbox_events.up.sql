-- Partition Outbox Events

-- 1. Rename legacy table
ALTER TABLE outbox_events RENAME TO outbox_events_legacy;

-- 2. Create partitioned table
CREATE TABLE outbox_events (
  id UUID DEFAULT uuid_generate_v4(),
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  attempts INT NOT NULL DEFAULT 0,
  last_error TEXT,
  processed_at TIMESTAMPTZ,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 3. Indexes
CREATE INDEX idx_outbox_unprocessed ON outbox_events (processed_at) WHERE processed_at IS NULL;
CREATE INDEX idx_outbox_created_at ON outbox_events (created_at);

-- 4. Helper function
CREATE OR REPLACE FUNCTION ensure_outbox_partition(
  p_months_ahead INTEGER DEFAULT 2,
  p_retention_months INTEGER DEFAULT 6
) RETURNS VOID AS $$
DECLARE
  month_start DATE;
  month_end DATE;
  partition_name TEXT;
  drop_before DATE := (date_trunc('month', CURRENT_DATE) - make_interval(months => p_retention_months))::date;
BEGIN
  -- Create future partitions
  FOR month_start IN
    SELECT (date_trunc('month', CURRENT_DATE) + (i || ' month')::interval)::date
    FROM generate_series(-1, p_months_ahead) AS gs(i)
  LOOP
    month_end := (month_start + INTERVAL '1 month')::date;
    partition_name := 'outbox_events_y' || to_char(month_start, 'YYYY') || 'm' || to_char(month_start, 'MM');

    EXECUTE format(
      'CREATE TABLE IF NOT EXISTS %I PARTITION OF outbox_events FOR VALUES FROM (%L) TO (%L)',
      partition_name,
      month_start,
      month_end
    );
  END LOOP;

  -- Prune old partitions
  FOR partition_name IN
    SELECT c.relname
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    JOIN pg_class p ON p.oid = i.inhparent
    WHERE p.relname = 'outbox_events'
  LOOP
    PERFORM 1;
    BEGIN
      IF partition_name ~ '_y(\d{4})m(\d{2})$' THEN
         month_start := to_date(right(partition_name, 6), 'YYYYMM');
         IF month_start < drop_before THEN
            EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
         END IF;
      END IF;
    EXCEPTION WHEN others THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 5. Migrate pending events
INSERT INTO outbox_events (id, topic, payload, created_at, attempts, last_error, processed_at)
SELECT id, topic, payload, created_at, attempts, last_error, processed_at
FROM outbox_events_legacy
WHERE processed_at IS NULL;
