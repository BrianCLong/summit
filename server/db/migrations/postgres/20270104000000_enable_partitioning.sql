-- Migration to enable partitioning for core tables

-- 1. audit_logs (Migrate existing table to partitioned table)
DO $$
BEGIN
    -- Check if audit_logs exists and is NOT already partitioned
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'audit_logs') AND
       NOT EXISTS (SELECT FROM pg_partitioned_table WHERE partrelid = 'audit_logs'::regclass) THEN

        RAISE NOTICE 'Migrating audit_logs to partitioned table...';

        -- Rename existing table
        ALTER TABLE audit_logs RENAME TO audit_logs_old;

        -- Create new partitioned table
        CREATE TABLE audit_logs (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES users(id),
            action VARCHAR(100) NOT NULL,
            resource_type VARCHAR(100) NOT NULL,
            resource_id VARCHAR(255),
            details JSONB,
            ip_address INET,
            user_agent TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);

        -- Re-create indexes
        CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
        CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
        CREATE INDEX IF NOT EXISTS idx_audit_logs_details_gin ON audit_logs USING GIN (details);

        -- Create default partition to catch any data that doesn't fit specific ranges
        CREATE TABLE audit_logs_default PARTITION OF audit_logs DEFAULT;

        -- Migrate data
        -- Use ON CONFLICT DO NOTHING just in case, though it should be empty
        INSERT INTO audit_logs (id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at)
        SELECT id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, COALESCE(created_at, NOW()) FROM audit_logs_old
        ON CONFLICT (id, created_at) DO NOTHING;

        RAISE NOTICE 'audit_logs migration complete. Old table renamed to audit_logs_old.';

    ELSE
        RAISE NOTICE 'audit_logs is already partitioned or does not exist.';
    END IF;
END $$;

-- 2. maestro_runs (Create partitioned table if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'maestro_runs') THEN
        CREATE TABLE maestro_runs (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            tenant_id VARCHAR(255) NOT NULL,
            pipeline_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) NOT NULL,
            config JSONB,
            artifacts JSONB,
            error_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, tenant_id)
        ) PARTITION BY LIST (tenant_id);

        CREATE INDEX idx_maestro_runs_tenant_id ON maestro_runs(tenant_id);
        CREATE INDEX idx_maestro_runs_created_at ON maestro_runs(created_at);

        -- Create default partition
        CREATE TABLE maestro_runs_default PARTITION OF maestro_runs DEFAULT;
    END IF;
END $$;

-- 3. metrics (Create partitioned table if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'metrics') THEN
        CREATE TABLE metrics (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            name VARCHAR(255) NOT NULL,
            value DOUBLE PRECISION NOT NULL,
            labels JSONB,
            timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, timestamp)
        ) PARTITION BY RANGE (timestamp);

        CREATE INDEX idx_metrics_timestamp ON metrics(timestamp);
        CREATE INDEX idx_metrics_name ON metrics(name);
        CREATE INDEX idx_metrics_labels_gin ON metrics USING GIN (labels);

        -- Create default partition
        CREATE TABLE metrics_default PARTITION OF metrics DEFAULT;
    END IF;
END $$;

-- 4. provenance_ledger_v2 (Create partitioned table if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provenance_ledger_v2') THEN
        CREATE TABLE provenance_ledger_v2 (
            id UUID NOT NULL DEFAULT gen_random_uuid(),
            entity_id VARCHAR(255) NOT NULL,
            activity_type VARCHAR(100) NOT NULL,
            agent_id VARCHAR(255),
            signature VARCHAR(512),
            details JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id, created_at)
        ) PARTITION BY RANGE (created_at);

        CREATE INDEX idx_provenance_ledger_v2_created_at ON provenance_ledger_v2(created_at);
        CREATE INDEX idx_provenance_ledger_v2_entity_id ON provenance_ledger_v2(entity_id);

        -- Create default partition
        CREATE TABLE provenance_ledger_v2_default PARTITION OF provenance_ledger_v2 DEFAULT;
    END IF;
END $$;
