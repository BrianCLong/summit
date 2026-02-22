-- Event Log v2: Time-based Partitioning for orchestrator_events and orchestrator_outbox
-- This follows a Phase A (Create partitioned tables) strategy.

-- 1. Create Partitioned Events Table
CREATE TABLE IF NOT EXISTS orchestrator_events_p (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    event_seq BIGINT NOT NULL DEFAULT nextval('orchestrator_event_seq'),
    tenant_id TEXT NOT NULL,
    run_id TEXT,
    task_id TEXT,
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Primary key must include partition key
ALTER TABLE orchestrator_events_p
    ADD CONSTRAINT orchestrator_events_p_pk
    PRIMARY KEY (created_at, event_seq);

-- Indices on parent (will be propagated to partitions)
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_p_run_seq ON orchestrator_events_p (run_id, event_seq);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_p_task_created ON orchestrator_events_p (task_id, created_at);

-- 2. Create Initial Partitions for Events
CREATE TABLE IF NOT EXISTS orchestrator_events_2026_01
    PARTITION OF orchestrator_events_p
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS orchestrator_events_2026_02
    PARTITION OF orchestrator_events_p
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS orchestrator_events_2026_03
    PARTITION OF orchestrator_events_p
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

-- 3. Create Partitioned Outbox Table
CREATE TABLE IF NOT EXISTS orchestrator_outbox_p (
    id BIGSERIAL NOT NULL,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- Primary key includes partition key
ALTER TABLE orchestrator_outbox_p
    ADD CONSTRAINT orchestrator_outbox_p_pk
    PRIMARY KEY (created_at, id);

-- Indices for processing
CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_p_unprocessed
    ON orchestrator_outbox_p (created_at, id)
    WHERE status = 'PENDING';

CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_p_processed
    ON orchestrator_outbox_p (processed_at)
    WHERE status IN ('SENT', 'DEAD');

-- 4. Create Initial Partitions for Outbox
CREATE TABLE IF NOT EXISTS orchestrator_outbox_2026_01
    PARTITION OF orchestrator_outbox_p
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE IF NOT EXISTS orchestrator_outbox_2026_02
    PARTITION OF orchestrator_outbox_p
    FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

CREATE TABLE IF NOT EXISTS orchestrator_outbox_2026_03
    PARTITION OF orchestrator_outbox_p
    FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');
