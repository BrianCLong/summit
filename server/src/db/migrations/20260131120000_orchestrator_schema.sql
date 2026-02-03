-- Hardened Orchestrator Schema Migration
-- Standardizes on orchestrator_* prefix and adds indices for retention

-- 1. Runs
CREATE TABLE IF NOT EXISTS orchestrator_runs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'running',
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Tasks
CREATE TABLE IF NOT EXISTS orchestrator_tasks (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES orchestrator_runs(id),
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payload JSONB NOT NULL DEFAULT '{}',
    result JSONB,
    error TEXT,
    attempt INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    priority_val INTEGER NOT NULL DEFAULT 0,
    version INTEGER NOT NULL DEFAULT 1,
    claimed_by TEXT,
    lease_until TIMESTAMPTZ,
    last_heartbeat_at TIMESTAMPTZ,
    ready_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_ready ON orchestrator_tasks (status, ready_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_lease ON orchestrator_tasks (status, lease_until) WHERE status = 'running';
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_run ON orchestrator_tasks (run_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_retention ON orchestrator_tasks (updated_at) WHERE status IN ('succeeded', 'failed', 'cancelled');

-- 3. Events (Monotonic Log)
CREATE SEQUENCE IF NOT EXISTS orchestrator_event_seq;

CREATE TABLE IF NOT EXISTS orchestrator_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_seq BIGINT NOT NULL DEFAULT nextval('orchestrator_event_seq'),
    tenant_id TEXT NOT NULL,
    run_id TEXT REFERENCES orchestrator_runs(id),
    task_id TEXT REFERENCES orchestrator_tasks(id),
    type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orchestrator_events_seq ON orchestrator_events (event_seq);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_run_seq ON orchestrator_events (run_id, event_seq);
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_retention ON orchestrator_events (created_at);

-- 4. Outbox (Reliable Side-effects)
CREATE TABLE IF NOT EXISTS orchestrator_outbox (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING',
    retry_count INTEGER NOT NULL DEFAULT 0,
    last_error TEXT,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_unprocessed ON orchestrator_outbox (created_at) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_processed ON orchestrator_outbox (processed_at) WHERE status IN ('SENT', 'DEAD');
