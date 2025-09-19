-- IntelGraph Autonomous Orchestrator - Durable State Machine Schema
-- Implements production-ready persistence with idempotency, outbox pattern, and crash recovery
-- Version: 1.0.0

-- Drop existing tables if they exist (for migrations)
DROP TABLE IF EXISTS orchestration_events CASCADE;
DROP TABLE IF EXISTS orchestration_outbox CASCADE;
DROP TABLE IF EXISTS orchestration_tasks CASCADE;
DROP TABLE IF EXISTS orchestration_runs CASCADE;
DROP TABLE IF EXISTS orchestration_locks CASCADE;
DROP TABLE IF EXISTS orchestration_policies CASCADE;

-- Extensions needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Core orchestration runs table
CREATE TABLE orchestration_runs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    goal TEXT NOT NULL,
    context JSONB NOT NULL DEFAULT '{}',
    mode TEXT CHECK (mode IN ('PLAN', 'APPLY', 'ROLLBACK', 'DRY_RUN')) NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'PAUSED')) NOT NULL DEFAULT 'PENDING',
    autonomy_level INTEGER CHECK (autonomy_level >= 0 AND autonomy_level <= 5) NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 50,
    tenant_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    reason_for_access TEXT,
    approval_status TEXT CHECK (approval_status IN ('PENDING', 'APPROVED', 'DENIED', 'NOT_REQUIRED')) DEFAULT 'NOT_REQUIRED',
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    budget_limit_usd DECIMAL(10,2) DEFAULT 10.00,
    budget_consumed_usd DECIMAL(10,2) DEFAULT 0.00,
    estimated_duration_minutes INTEGER DEFAULT 30,
    metadata JSONB DEFAULT '{}',
    correlation_id TEXT,
    parent_run_id UUID REFERENCES orchestration_runs(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    last_heartbeat TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

CREATE INDEX idx_orchestration_runs_status ON orchestration_runs(status);
CREATE INDEX idx_orchestration_runs_tenant ON orchestration_runs(tenant_id);
CREATE INDEX idx_orchestration_runs_correlation ON orchestration_runs(correlation_id);
CREATE INDEX idx_orchestration_runs_created ON orchestration_runs(created_at DESC);
CREATE INDEX idx_orchestration_runs_parent ON orchestration_runs(parent_run_id);

-- Tasks within runs with idempotency
CREATE TABLE orchestration_tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
    parent_task_id UUID REFERENCES orchestration_tasks(id),
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    params JSONB NOT NULL DEFAULT '{}',
    constraints JSONB DEFAULT '{}',
    status TEXT CHECK (status IN ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED')) NOT NULL DEFAULT 'PENDING',
    idempotency_key TEXT UNIQUE NOT NULL,
    attempt_count INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    estimated_cost_usd DECIMAL(8,4) DEFAULT 0.0000,
    actual_cost_usd DECIMAL(8,4) DEFAULT 0.0000,
    timeout_seconds INTEGER DEFAULT 300,
    execution_context JSONB DEFAULT '{}',
    plan_data JSONB,
    outcome JSONB,
    error_details JSONB,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    depends_on UUID[] DEFAULT ARRAY[]::UUID[],
    position_in_run INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_orchestration_tasks_run ON orchestration_tasks(run_id);
CREATE INDEX idx_orchestration_tasks_status ON orchestration_tasks(status);
CREATE INDEX idx_orchestration_tasks_idempotency ON orchestration_tasks(idempotency_key);
CREATE INDEX idx_orchestration_tasks_parent ON orchestration_tasks(parent_task_id);
CREATE INDEX idx_orchestration_tasks_type ON orchestration_tasks(type);

-- Event log with structured logging and correlation
CREATE TABLE orchestration_events (
    id BIGSERIAL PRIMARY KEY,
    run_id UUID REFERENCES orchestration_runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES orchestration_tasks(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    level TEXT CHECK (level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')) NOT NULL DEFAULT 'INFO',
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    correlation_id TEXT,
    trace_id TEXT,
    span_id TEXT,
    source_service TEXT DEFAULT 'orchestrator',
    source_version TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    immutable_hash TEXT,
    sequence_number BIGINT
);

CREATE INDEX idx_orchestration_events_run ON orchestration_events(run_id);
CREATE INDEX idx_orchestration_events_task ON orchestration_events(task_id);
CREATE INDEX idx_orchestration_events_timestamp ON orchestration_events(timestamp DESC);
CREATE INDEX idx_orchestration_events_correlation ON orchestration_events(correlation_id);
CREATE INDEX idx_orchestration_events_type ON orchestration_events(event_type);
CREATE INDEX idx_orchestration_events_level ON orchestration_events(level);

-- Outbox pattern for reliable event processing
CREATE TABLE orchestration_outbox (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    aggregate_type TEXT NOT NULL,
    aggregate_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    event_data JSONB NOT NULL,
    correlation_id TEXT,
    trace_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    next_retry_at TIMESTAMPTZ,
    error_details TEXT,
    partition_key TEXT
);

CREATE INDEX idx_orchestration_outbox_created ON orchestration_outbox(created_at);
CREATE INDEX idx_orchestration_outbox_processed ON orchestration_outbox(processed_at);
CREATE INDEX idx_orchestration_outbox_retry ON orchestration_outbox(next_retry_at) WHERE processed_at IS NULL;
CREATE INDEX idx_orchestration_outbox_aggregate ON orchestration_outbox(aggregate_type, aggregate_id);

-- Advisory locks for resource coordination
CREATE TABLE orchestration_locks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource_type TEXT NOT NULL,
    resource_id TEXT NOT NULL,
    lock_type TEXT CHECK (lock_type IN ('SHARED', 'EXCLUSIVE')) NOT NULL DEFAULT 'EXCLUSIVE',
    run_id UUID NOT NULL REFERENCES orchestration_runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES orchestration_tasks(id) ON DELETE CASCADE,
    owner_context JSONB DEFAULT '{}',
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_orchestration_locks_resource ON orchestration_locks(resource_type, resource_id, lock_type);
CREATE INDEX idx_orchestration_locks_run ON orchestration_locks(run_id);
CREATE INDEX idx_orchestration_locks_expires ON orchestration_locks(expires_at);

-- Policy definitions and evaluations
CREATE TABLE orchestration_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL DEFAULT '1.0.0',
    category TEXT CHECK (category IN ('SAFETY', 'BUDGET', 'APPROVAL', 'SECURITY', 'AUDIT')) NOT NULL,
    rules JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 100,
    conditions JSONB DEFAULT '{}',
    actions JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    effective_from TIMESTAMPTZ DEFAULT NOW(),
    effective_until TIMESTAMPTZ
);

CREATE INDEX idx_orchestration_policies_category ON orchestration_policies(category);
CREATE INDEX idx_orchestration_policies_enabled ON orchestration_policies(enabled);
CREATE INDEX idx_orchestration_policies_effective ON orchestration_policies(effective_from, effective_until);

-- Functions for idempotency and event handling

-- Generate stable idempotency key
CREATE OR REPLACE FUNCTION generate_idempotency_key(task_type TEXT, params JSONB)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(task_type || jsonb_canonical(params), 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create immutable hash for events
CREATE OR REPLACE FUNCTION generate_event_hash(run_id UUID, task_id UUID, event_type TEXT, message TEXT, payload JSONB)
RETURNS TEXT AS $$
BEGIN
    RETURN encode(digest(
        COALESCE(run_id::text, '') || 
        COALESCE(task_id::text, '') || 
        event_type || 
        message || 
        COALESCE(jsonb_canonical(payload), '{}'), 
        'sha256'
    ), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Auto-update event hash trigger
CREATE OR REPLACE FUNCTION update_event_hash()
RETURNS TRIGGER AS $$
BEGIN
    NEW.immutable_hash = generate_event_hash(NEW.run_id, NEW.task_id, NEW.event_type, NEW.message, NEW.payload);
    IF NEW.sequence_number IS NULL THEN
        NEW.sequence_number = nextval('orchestration_events_id_seq');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_event_hash
    BEFORE INSERT ON orchestration_events
    FOR EACH ROW EXECUTE FUNCTION update_event_hash();

-- Function to safely claim a task with idempotency
CREATE OR REPLACE FUNCTION claim_task(task_uuid UUID, worker_id TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    success BOOLEAN := FALSE;
BEGIN
    UPDATE orchestration_tasks 
    SET status = 'RUNNING', 
        started_at = NOW(),
        attempt_count = attempt_count + 1,
        execution_context = jsonb_set(
            COALESCE(execution_context, '{}'), 
            '{worker_id}', 
            to_jsonb(worker_id)
        )
    WHERE id = task_uuid 
      AND status = 'PENDING' 
      AND attempt_count < max_attempts;
    
    GET DIAGNOSTICS success = FOUND;
    RETURN success;
END;
$$ LANGUAGE plpgsql;

-- Function to acquire resource lock
CREATE OR REPLACE FUNCTION acquire_lock(
    p_resource_type TEXT, 
    p_resource_id TEXT, 
    p_lock_type TEXT,
    p_run_id UUID,
    p_task_id UUID DEFAULT NULL,
    p_timeout_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    lock_acquired BOOLEAN := FALSE;
BEGIN
    BEGIN
        INSERT INTO orchestration_locks (
            resource_type, resource_id, lock_type, run_id, task_id, expires_at
        ) VALUES (
            p_resource_type, p_resource_id, p_lock_type, p_run_id, p_task_id,
            NOW() + INTERVAL '1 minute' * p_timeout_minutes
        );
        lock_acquired := TRUE;
    EXCEPTION WHEN unique_violation THEN
        -- Check if existing lock has expired
        DELETE FROM orchestration_locks 
        WHERE resource_type = p_resource_type 
          AND resource_id = p_resource_id
          AND lock_type = p_lock_type
          AND expires_at < NOW();
          
        -- Try again
        BEGIN
            INSERT INTO orchestration_locks (
                resource_type, resource_id, lock_type, run_id, task_id, expires_at
            ) VALUES (
                p_resource_type, p_resource_id, p_lock_type, p_run_id, p_task_id,
                NOW() + INTERVAL '1 minute' * p_timeout_minutes
            );
            lock_acquired := TRUE;
        EXCEPTION WHEN unique_violation THEN
            lock_acquired := FALSE;
        END;
    END;
    
    RETURN lock_acquired;
END;
$$ LANGUAGE plpgsql;

-- Function to release locks
CREATE OR REPLACE FUNCTION release_locks(p_run_id UUID)
RETURNS INTEGER AS $$
DECLARE
    released_count INTEGER;
BEGIN
    DELETE FROM orchestration_locks WHERE run_id = p_run_id;
    GET DIAGNOSTICS released_count = ROW_COUNT;
    RETURN released_count;
END;
$$ LANGUAGE plpgsql;

-- Cleanup expired locks periodically
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER;
BEGIN
    DELETE FROM orchestration_locks WHERE expires_at < NOW();
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql;

-- Views for monitoring and observability

-- Active orchestration summary
CREATE VIEW active_orchestration_summary AS
SELECT 
    r.id as run_id,
    r.goal,
    r.status as run_status,
    r.autonomy_level,
    r.tenant_id,
    r.user_id,
    r.budget_consumed_usd,
    r.created_at,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.status = 'SUCCEEDED' THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.status = 'FAILED' THEN 1 END) as failed_tasks,
    COUNT(CASE WHEN t.status = 'RUNNING' THEN 1 END) as running_tasks,
    r.correlation_id
FROM orchestration_runs r
LEFT JOIN orchestration_tasks t ON r.id = t.run_id
WHERE r.status IN ('RUNNING', 'PENDING', 'PAUSED')
GROUP BY r.id, r.goal, r.status, r.autonomy_level, r.tenant_id, r.user_id, 
         r.budget_consumed_usd, r.created_at, r.correlation_id;

-- Task performance metrics
CREATE VIEW task_performance_metrics AS
SELECT 
    t.type,
    t.name,
    COUNT(*) as execution_count,
    AVG(EXTRACT(EPOCH FROM (t.finished_at - t.started_at))) as avg_duration_seconds,
    AVG(t.actual_cost_usd) as avg_cost_usd,
    COUNT(CASE WHEN t.status = 'SUCCEEDED' THEN 1 END)::float / COUNT(*) as success_rate,
    AVG(t.attempt_count) as avg_attempts
FROM orchestration_tasks t
WHERE t.finished_at IS NOT NULL
GROUP BY t.type, t.name;

-- Recent events with context
CREATE VIEW recent_orchestration_events AS
SELECT 
    e.id,
    e.timestamp,
    e.level,
    e.event_type,
    e.message,
    e.correlation_id,
    r.goal as run_goal,
    r.tenant_id,
    r.user_id,
    t.type as task_type,
    t.name as task_name
FROM orchestration_events e
LEFT JOIN orchestration_runs r ON e.run_id = r.id
LEFT JOIN orchestration_tasks t ON e.task_id = t.id
ORDER BY e.timestamp DESC
LIMIT 1000;

-- Grant permissions (adjust as needed for your deployment)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO orchestrator_service;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO orchestrator_service;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO orchestrator_service;

-- Initial seed data
INSERT INTO orchestration_policies (name, category, rules, created_by) VALUES
('default_safety_policy', 'SAFETY', '{
    "blocked_actions": ["delete_production_data", "external_network_access"],
    "require_approval": ["deploy_to_production", "modify_security_settings"],
    "max_budget_per_run": 100.00,
    "max_autonomy_level": 3
}', 'system'),
('budget_enforcement', 'BUDGET', '{
    "daily_limit_usd": 1000.00,
    "per_run_limit_usd": 100.00,
    "alert_threshold": 0.8,
    "auto_pause_at_limit": true
}', 'system'),
('approval_gates', 'APPROVAL', '{
    "require_approval_for": {
        "autonomy_levels": [4, 5],
        "high_cost_actions": 50.00,
        "production_deployments": true,
        "data_modifications": true
    },
    "approval_timeout_hours": 24
}', 'system');

COMMENT ON TABLE orchestration_runs IS 'Core orchestration runs with approval gates and budget tracking';
COMMENT ON TABLE orchestration_tasks IS 'Individual tasks within runs with idempotency guarantees';
COMMENT ON TABLE orchestration_events IS 'Immutable audit trail with structured logging';
COMMENT ON TABLE orchestration_outbox IS 'Reliable event processing with retry logic';
COMMENT ON TABLE orchestration_locks IS 'Resource coordination with advisory locking';
COMMENT ON TABLE orchestration_policies IS 'Policy engine rules and configurations';