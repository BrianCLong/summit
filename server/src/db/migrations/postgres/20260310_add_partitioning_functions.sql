-- Migration to add partitioning functions and convert event_log to composite partitioning

BEGIN;

-- 1. Check if event_log is already partitioned. If not, convert it.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'event_log' AND c.relkind = 'r'
    ) THEN
        -- Rename existing regular table
        ALTER TABLE event_log RENAME TO event_log_legacy;

        -- Create parent partitioned table (Partition by Tenant)
        CREATE TABLE event_log (
            id UUID NOT NULL,
            tenant_id UUID NOT NULL,
            type VARCHAR(255) NOT NULL,
            occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
            actor_id VARCHAR(255),
            payload JSONB NOT NULL,
            schema_version VARCHAR(50),
            receipt_ref VARCHAR(255),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            PRIMARY KEY (tenant_id, occurred_at, id)
        ) PARTITION BY LIST (tenant_id);

        -- We don't migrate data automatically here to avoid locking/performance issues on large tables.
        -- Legacy data remains in event_log_legacy.
    END IF;
END $$;

-- Ensure event_log exists as partitioned table if it didn't exist before
CREATE TABLE IF NOT EXISTS event_log (
    id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    type VARCHAR(255) NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    actor_id VARCHAR(255),
    payload JSONB NOT NULL,
    schema_version VARCHAR(50),
    receipt_ref VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tenant_id, occurred_at, id)
) PARTITION BY LIST (tenant_id);


-- 2. Define Metrics View (Stub for now, populated by function logic if needed)
CREATE TABLE IF NOT EXISTS event_store_partition_metrics (
    partition_name TEXT PRIMARY KEY,
    total_bytes BIGINT,
    total_pretty TEXT,
    bounds TEXT
);


-- 3. Define ensure_event_store_partition function
CREATE OR REPLACE FUNCTION ensure_event_store_partition(
    p_tenant_id UUID,
    p_months_ahead INTEGER,
    p_retention_months INTEGER
) RETURNS VOID AS $$
DECLARE
    v_tenant_partition_name TEXT;
    v_date DATE;
    v_start_date DATE;
    v_end_date DATE;
    v_partition_name TEXT;
    v_retention_date DATE;
BEGIN
    v_tenant_partition_name := 'event_log_' || replace(p_tenant_id::text, '-', '_');

    -- 1. Ensure Tenant Partition exists (Partitioned by Range for time)
    -- We check if the table exists. If not, create it as a partition of event_log.
    IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_tenant_partition_name) THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF event_log FOR VALUES IN (%L) PARTITION BY RANGE (occurred_at)',
            v_tenant_partition_name, p_tenant_id
        );
    END IF;

    -- 2. Ensure Time Partitions exist for future months
    -- Loop from current month up to p_months_ahead
    v_date := date_trunc('month', NOW());

    FOR i IN 0..p_months_ahead LOOP
        v_start_date := v_date + (i || ' month')::interval;
        v_end_date := v_start_date + '1 month'::interval;
        v_partition_name := v_tenant_partition_name || '_' || to_char(v_start_date, 'YYYY_MM');

        IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = v_partition_name) THEN
            EXECUTE format(
                'CREATE TABLE %I PARTITION OF %I FOR VALUES FROM (%L) TO (%L)',
                v_partition_name, v_tenant_partition_name, v_start_date, v_end_date
            );
        END IF;
    END LOOP;

    -- 3. Cleanup old partitions (Retention)
    v_retention_date := date_trunc('month', NOW()) - (p_retention_months || ' month')::interval;

    FOR v_partition_name IN
        SELECT inhrelid::regclass::text
        FROM pg_inherits
        JOIN pg_class parent ON pg_inherits.inhparent = parent.oid
        WHERE parent.relname = v_tenant_partition_name
    LOOP
        -- Extract date from partition name (assuming format _YYYY_MM)
        -- This uses regex to find the date part.
        -- Matches _2025_01 at the end.
        DECLARE
            v_part_year INT;
            v_part_month INT;
            v_part_date DATE;
        BEGIN
            IF v_partition_name ~ '_(\d{4})_(\d{2})$' THEN
                v_part_year := (substring(v_partition_name from '_(\d{4})_(\d{2})$'))[1]::int;
                v_part_month := (substring(v_partition_name from '_(\d{4})_(\d{2})$'))[2]::int;
                v_part_date := make_date(v_part_year, v_part_month, 1);

                IF v_part_date < v_retention_date THEN
                    -- Detach and Drop (or just Drop)
                    EXECUTE format('DROP TABLE %I', v_partition_name);
                END IF;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore parsing errors
        END;
    END LOOP;

    -- 4. Update Metrics (Optional simple log)
    -- In a real scenario, we would calculate sizes here.
    INSERT INTO event_store_partition_metrics (partition_name, total_bytes, total_pretty, bounds)
    VALUES (v_tenant_partition_name, 0, '0 MB', 'active')
    ON CONFLICT (partition_name) DO NOTHING;

END;
$$ LANGUAGE plpgsql;


-- 4. Define ensure_event_store_partitions_for_all function
CREATE OR REPLACE FUNCTION ensure_event_store_partitions_for_all(
    p_months_ahead INTEGER,
    p_retention_months INTEGER
) RETURNS INTEGER AS $$
DECLARE
    v_tenant_id UUID;
    v_count INTEGER := 0;
BEGIN
    -- Iterate over all unique tenant_ids currently in the system.
    -- Assuming we have a tenants table or we extract from existing event_log_legacy/users.
    -- For this migration, we'll try to find tenants from distinct values if no tenant table.
    -- BETTER: Use the 'tenants' table if it exists (usually it does in SaaS).
    -- If not, fallback to distinct tenant_id from legacy table.

    -- Let's try to select from tenants table first (dynamic sql to avoid error if missing)
    -- For safety in this script, we will assume we iterate known partitions or a 'tenants' table.
    -- If 'tenants' table exists:
    FOR v_tenant_id IN
        SELECT id FROM tenants -- This assumes 'tenants' table exists with 'id' column
    LOOP
        PERFORM ensure_event_store_partition(v_tenant_id, p_months_ahead, p_retention_months);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
EXCEPTION WHEN undefined_table THEN
    -- If tenants table doesn't exist, try getting from legacy log
    FOR v_tenant_id IN
        SELECT DISTINCT tenant_id FROM event_log_legacy
    LOOP
        PERFORM ensure_event_store_partition(v_tenant_id, p_months_ahead, p_retention_months);
        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

COMMIT;
