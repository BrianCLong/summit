-- Migration to setup partitioned tables for Audit Events and Telemetry

-- Ensure extension for UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Rename existing tables to legacy, OR ensure legacy table exists if starting fresh
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'audit_events' AND relkind = 'r') THEN
        ALTER TABLE audit_events RENAME TO audit_events_legacy;
    ELSE
        -- Ensure legacy table exists for View compatibility (even if empty)
        -- Match schema from AdvancedAuditSystem
        CREATE TABLE IF NOT EXISTS audit_events_legacy (
            id UUID DEFAULT gen_random_uuid(),
            event_type TEXT NOT NULL,
            level TEXT NOT NULL,
            timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            correlation_id UUID,
            session_id UUID,
            request_id UUID,
            user_id TEXT,
            tenant_id TEXT NOT NULL,
            service_id TEXT NOT NULL,
            resource_type TEXT,
            resource_id TEXT,
            resource_path TEXT,
            action TEXT NOT NULL,
            outcome TEXT NOT NULL,
            message TEXT NOT NULL,
            details JSONB DEFAULT '{}',
            ip_address INET,
            user_agent TEXT,
            compliance_relevant BOOLEAN DEFAULT FALSE,
            compliance_frameworks TEXT[] DEFAULT '{}',
            data_classification TEXT,
            hash TEXT,
            signature TEXT,
            previous_event_hash TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;

    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'telemetry_events' AND relkind = 'r') THEN
        ALTER TABLE telemetry_events RENAME TO telemetry_events_legacy;
    ELSE
        CREATE TABLE IF NOT EXISTS telemetry_events_legacy (
            id UUID DEFAULT gen_random_uuid(),
            source VARCHAR(255),
            event_name VARCHAR(255) NOT NULL,
            properties JSONB,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Create Partitioned Audit Events Table (as _partitioned)
-- Schema matches AdvancedAuditSystem
CREATE TABLE IF NOT EXISTS audit_events_partitioned (
        id UUID NOT NULL,
        event_type TEXT NOT NULL,
        level TEXT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        correlation_id UUID,
        session_id UUID,
        request_id UUID,
        user_id TEXT,
        tenant_id TEXT NOT NULL,
        service_id TEXT NOT NULL,
        resource_type TEXT,
        resource_id TEXT,
        resource_path TEXT,
        action TEXT NOT NULL,
        outcome TEXT NOT NULL,
        message TEXT NOT NULL,
        details JSONB DEFAULT '{}',
        ip_address INET,
        user_agent TEXT,
        compliance_relevant BOOLEAN DEFAULT FALSE,
        compliance_frameworks TEXT[] DEFAULT '{}',
        data_classification TEXT,
        hash TEXT,
        signature TEXT,
        previous_event_hash TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (id, timestamp) -- Partition key must be part of PK
) PARTITION BY RANGE (timestamp);

-- 3. Create Partitioned Telemetry Events Table (as _partitioned)
CREATE TABLE IF NOT EXISTS telemetry_events_partitioned (
    id UUID DEFAULT gen_random_uuid(),
    source VARCHAR(255),
    event_name VARCHAR(255) NOT NULL,
    properties JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (id, timestamp)
) PARTITION BY RANGE (timestamp);

-- 4. Create Initial Partitions
DO $$
DECLARE
    current_month_start DATE := date_trunc('month', NOW());
    next_month_start DATE := date_trunc('month', NOW() + interval '1 month');
    month_after_next_start DATE := date_trunc('month', NOW() + interval '2 months');

    audit_part_current TEXT := 'audit_events_partitioned_y' || to_char(current_month_start, 'YYYY') || 'm' || to_char(current_month_start, 'MM');
    audit_part_next TEXT := 'audit_events_partitioned_y' || to_char(next_month_start, 'YYYY') || 'm' || to_char(next_month_start, 'MM');

    -- Telemetry daily
    today_start DATE := date_trunc('day', NOW());
    tomorrow_start DATE := date_trunc('day', NOW() + interval '1 day');
    day_after_start DATE := date_trunc('day', NOW() + interval '2 days');

    tele_day_curr TEXT := 'telemetry_events_partitioned_y' || to_char(today_start, 'YYYY') || 'm' || to_char(today_start, 'MM') || 'd' || to_char(today_start, 'DD');
    tele_day_next TEXT := 'telemetry_events_partitioned_y' || to_char(tomorrow_start, 'YYYY') || 'm' || to_char(tomorrow_start, 'MM') || 'd' || to_char(tomorrow_start, 'DD');
BEGIN
    -- Audit
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_events_partitioned FOR VALUES FROM (%L) TO (%L)',
                   audit_part_current, current_month_start, next_month_start);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_events_partitioned FOR VALUES FROM (%L) TO (%L)',
                   audit_part_next, next_month_start, month_after_next_start);

    -- Telemetry
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF telemetry_events_partitioned FOR VALUES FROM (%L) TO (%L)',
              tele_day_curr, today_start, tomorrow_start);
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF telemetry_events_partitioned FOR VALUES FROM (%L) TO (%L)',
              tele_day_next, tomorrow_start, day_after_start);
END $$;

-- 5. Create Default Partitions
CREATE TABLE IF NOT EXISTS audit_events_partitioned_default PARTITION OF audit_events_partitioned DEFAULT;
CREATE TABLE IF NOT EXISTS telemetry_events_partitioned_default PARTITION OF telemetry_events_partitioned DEFAULT;

-- 6. Create Views to maintain application compatibility (Read)
CREATE OR REPLACE VIEW audit_events AS
SELECT
    id, event_type, level, timestamp, correlation_id, session_id, request_id,
    user_id, tenant_id, service_id, resource_type, resource_id, resource_path,
    action, outcome, message, details, ip_address, user_agent, compliance_relevant,
    compliance_frameworks, data_classification, hash, signature, previous_event_hash, created_at
FROM audit_events_partitioned
UNION ALL
SELECT
    id, event_type, level, timestamp, correlation_id, session_id, request_id,
    user_id, tenant_id, service_id, resource_type, resource_id, resource_path,
    action, outcome, message, details, ip_address, user_agent, compliance_relevant,
    compliance_frameworks, data_classification, hash, signature, previous_event_hash, created_at
FROM audit_events_legacy;

CREATE OR REPLACE VIEW telemetry_events AS
SELECT id, source, event_name, properties, timestamp FROM telemetry_events_partitioned
UNION ALL
SELECT id, source, event_name, properties, timestamp FROM telemetry_events_legacy;

-- 7. Create Triggers to handle Writes (Insert into View -> Partitioned Table)
CREATE OR REPLACE FUNCTION audit_events_insert_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Assign defaults to NEW so they are returned
    IF NEW.id IS NULL THEN
        NEW.id := gen_random_uuid();
    END IF;
    IF NEW.timestamp IS NULL THEN
        NEW.timestamp := NOW();
    END IF;
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    IF NEW.details IS NULL THEN
        NEW.details := '{}'::jsonb;
    END IF;
    IF NEW.compliance_relevant IS NULL THEN
        NEW.compliance_relevant := FALSE;
    END IF;
    IF NEW.compliance_frameworks IS NULL THEN
        NEW.compliance_frameworks := '{}'::text[];
    END IF;

    INSERT INTO audit_events_partitioned (
        id, event_type, level, timestamp, correlation_id, session_id, request_id,
        user_id, tenant_id, service_id, resource_type, resource_id, resource_path,
        action, outcome, message, details, ip_address, user_agent, compliance_relevant,
        compliance_frameworks, data_classification, hash, signature, previous_event_hash, created_at
    )
    VALUES (
        NEW.id,
        NEW.event_type,
        NEW.level,
        NEW.timestamp,
        NEW.correlation_id,
        NEW.session_id,
        NEW.request_id,
        NEW.user_id,
        NEW.tenant_id,
        NEW.service_id,
        NEW.resource_type,
        NEW.resource_id,
        NEW.resource_path,
        NEW.action,
        NEW.outcome,
        NEW.message,
        NEW.details,
        NEW.ip_address,
        NEW.user_agent,
        NEW.compliance_relevant,
        NEW.compliance_frameworks,
        NEW.data_classification,
        NEW.hash,
        NEW.signature,
        NEW.previous_event_hash,
        NEW.created_at
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_insert_trigger
INSTEAD OF INSERT ON audit_events
FOR EACH ROW EXECUTE FUNCTION audit_events_insert_func();

CREATE OR REPLACE FUNCTION telemetry_events_insert_func()
RETURNS TRIGGER AS $$
BEGIN
    -- Assign defaults
    IF NEW.id IS NULL THEN
        NEW.id := gen_random_uuid();
    END IF;
    IF NEW.timestamp IS NULL THEN
        NEW.timestamp := NOW();
    END IF;

    INSERT INTO telemetry_events_partitioned (id, source, event_name, properties, timestamp)
    VALUES (
        NEW.id,
        NEW.source,
        NEW.event_name,
        NEW.properties,
        NEW.timestamp
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER telemetry_events_insert_trigger
INSTEAD OF INSERT ON telemetry_events
FOR EACH ROW EXECUTE FUNCTION telemetry_events_insert_func();
