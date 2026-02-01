-- Migration: 002_durable_store.sql
-- Goal: Implement durable persistence for events and outbox, plus idempotency support.

BEGIN;

-- 1. Events: Immutable audit trail for all state changes
CREATE TABLE IF NOT EXISTS workflow_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES workflow_runs(run_id) ON DELETE CASCADE,
    step_id VARCHAR(255),
    event_type VARCHAR(100) NOT NULL, -- 'run_started', 'step_succeeded', 'step_failed'
    payload JSONB NOT NULL,
    trace_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Outbox: At-least-once event delivery for external systems
CREATE TABLE IF NOT EXISTS workflow_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES workflow_runs(run_id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'published', 'failed'
    trace_context JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    last_error TEXT
);

-- 3. Idempotency and Fault Tolerance Enhancements
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
ALTER TABLE workflow_runs ADD COLUMN IF NOT EXISTS workflow_definition JSONB;
ALTER TABLE workflow_runs ADD CONSTRAINT unique_run_idempotency_key UNIQUE (idempotency_key);

ALTER TABLE step_executions ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);
ALTER TABLE step_executions ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;
ALTER TABLE step_executions ADD COLUMN IF NOT EXISTS worker_id VARCHAR(255);

-- 4. Hot-Path Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_events_run_id ON workflow_events(run_id);
CREATE INDEX IF NOT EXISTS idx_workflow_outbox_status_pending ON workflow_outbox(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_step_executions_recovery ON step_executions(status, last_heartbeat) 
    WHERE status IN ('running', 'pending');

COMMIT;
