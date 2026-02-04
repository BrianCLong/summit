-- Partitioning implementation for Event Store
-- Migration: 20270101000000_implement_event_store_partitioning

BEGIN;

-- 1. Rename existing table
ALTER TABLE event_store RENAME TO event_store_legacy;

-- 2. Create new partitioned table
CREATE TABLE event_store (
  event_id UUID DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_version INTEGER NOT NULL DEFAULT 1,

  -- Event payload
  event_data JSONB NOT NULL,
  event_metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit context
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  correlation_id VARCHAR(255),
  causation_id UUID,

  -- Compliance tracking
  legal_basis VARCHAR(50),
  data_classification VARCHAR(50) DEFAULT 'INTERNAL',
  retention_policy VARCHAR(100) DEFAULT 'STANDARD',

  -- Session context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(255),

  -- Tamper-proof integrity
  event_hash VARCHAR(64) NOT NULL,
  previous_event_hash VARCHAR(64),

  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (event_id, tenant_id)
) PARTITION BY LIST (tenant_id);

-- 3. Recreate Indexes
CREATE INDEX idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id);
CREATE INDEX idx_event_store_event_type ON event_store(event_type);
CREATE INDEX idx_event_store_tenant_id ON event_store(tenant_id);
CREATE INDEX idx_event_store_user_id ON event_store(user_id);
CREATE INDEX idx_event_store_timestamp ON event_store(event_timestamp DESC);
CREATE INDEX idx_event_store_correlation_id ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX idx_event_store_version ON event_store(aggregate_id, aggregate_version);
CREATE INDEX idx_event_store_classification ON event_store(data_classification);

-- Unique constraint must include partition key
CREATE UNIQUE INDEX idx_event_store_aggregate_version
  ON event_store(aggregate_type, aggregate_id, aggregate_version, tenant_id);

-- 4. Triggers (Immutable)
CREATE OR REPLACE FUNCTION prevent_event_store_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Event store is immutable. Events cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_event_store_update
  BEFORE UPDATE ON event_store
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

CREATE TRIGGER prevent_event_store_delete
  BEFORE DELETE ON event_store
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

-- 5. Partition Maintenance Functions

-- Function to ensure partition exists for a tenant
CREATE OR REPLACE FUNCTION ensure_event_store_partition(
    p_tenant_id VARCHAR,
    p_months_ahead INTEGER DEFAULT 2,
    p_retention_months INTEGER DEFAULT 18
)
RETURNS VOID AS $$
DECLARE
    v_partition_name VARCHAR;
BEGIN
    -- Sanitize tenant_id for table name
    v_partition_name := 'event_store_' || lower(regexp_replace(p_tenant_id, '[^a-zA-Z0-9]', '_', 'g'));

    -- Check if partition exists
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = v_partition_name
        AND n.nspname = 'public'
    ) THEN
        -- Create partition for the tenant
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF event_store FOR VALUES IN (%L)',
            v_partition_name,
            p_tenant_id
        );

        RAISE NOTICE 'Created partition % for tenant %', v_partition_name, p_tenant_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to iterate all tenants and ensure partitions
CREATE OR REPLACE FUNCTION ensure_event_store_partitions_for_all(
    p_months_ahead INTEGER DEFAULT 2,
    p_retention_months INTEGER DEFAULT 18
)
RETURNS INTEGER AS $$
DECLARE
    v_tenant_record RECORD;
    v_count INTEGER := 0;
BEGIN
    -- Find tenants from legacy store
    FOR v_tenant_record IN
        SELECT DISTINCT tenant_id FROM event_store_legacy WHERE tenant_id IS NOT NULL
    LOOP
        PERFORM ensure_event_store_partition(v_tenant_record.tenant_id, p_months_ahead, p_retention_months);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- 6. Initial Partition Creation and Data Migration
-- Bootstrap partitions for existing data
SELECT ensure_event_store_partitions_for_all();

-- Migrate data from legacy table
-- Using INSERT SELECT with ON CONFLICT DO NOTHING to be safe
INSERT INTO event_store (
    event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
    event_data, event_metadata, tenant_id, user_id, correlation_id, causation_id,
    legal_basis, data_classification, retention_policy,
    ip_address, user_agent, session_id, request_id,
    event_hash, previous_event_hash, event_timestamp, created_at
)
SELECT
    event_id, event_type, aggregate_type, aggregate_id, aggregate_version,
    event_data, event_metadata, tenant_id, user_id, correlation_id, causation_id,
    legal_basis, data_classification, retention_policy,
    ip_address, user_agent, session_id, request_id,
    event_hash, previous_event_hash, event_timestamp, created_at
FROM event_store_legacy
ON CONFLICT DO NOTHING;

-- 7. Comment
COMMENT ON TABLE event_store IS 'Append-only event store partitioned by tenant for scalability and compliance isolation';

COMMIT;
