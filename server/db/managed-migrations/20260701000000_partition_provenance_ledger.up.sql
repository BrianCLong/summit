-- Partition Provenance Ledger V2 by Timestamp

-- 1. Rename existing table if it exists (and is not already partitioned)
DO $$
DECLARE
    is_partitioned BOOLEAN;
BEGIN
    SELECT relkind = 'p' INTO is_partitioned
    FROM pg_class
    WHERE relname = 'provenance_ledger_v2';

    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provenance_ledger_v2') AND (is_partitioned IS NULL OR is_partitioned = FALSE) THEN
        ALTER TABLE provenance_ledger_v2 RENAME TO provenance_ledger_v2_legacy;
    END IF;
END $$;

-- 2. Create new partitioned table
CREATE TABLE IF NOT EXISTS provenance_ledger_v2 (
  id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  sequence_number BIGINT NOT NULL,
  previous_hash TEXT NOT NULL,
  current_hash TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  action_type TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  actor_type TEXT NOT NULL,
  payload JSONB,
  metadata JSONB,
  signature TEXT,
  attestation JSONB,
  PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- 3. Re-create indexes
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_tenant_seq ON provenance_ledger_v2 (tenant_id, sequence_number);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_resource ON provenance_ledger_v2 (resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_action ON provenance_ledger_v2 (action_type);
CREATE INDEX IF NOT EXISTS idx_prov_ledger_v2_timestamp ON provenance_ledger_v2 (timestamp);

-- 4. Create initial partitions (Current month and next month)
DO $$
DECLARE
    current_month_start DATE := date_trunc('month', now());
    next_month_start DATE := date_trunc('month', now() + interval '1 month');
    next_next_month_start DATE := date_trunc('month', now() + interval '2 months');

    current_partition_name TEXT := 'provenance_ledger_v2_y' || to_char(current_month_start, 'YYYY') || 'm' || to_char(current_month_start, 'MM');
    next_partition_name TEXT := 'provenance_ledger_v2_y' || to_char(next_month_start, 'YYYY') || 'm' || to_char(next_month_start, 'MM');
BEGIN
    -- Current Month
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF provenance_ledger_v2 FOR VALUES FROM (%L) TO (%L)',
                   current_partition_name, current_month_start, next_month_start);

    -- Next Month
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF provenance_ledger_v2 FOR VALUES FROM (%L) TO (%L)',
                   next_partition_name, next_month_start, next_next_month_start);
END $$;
