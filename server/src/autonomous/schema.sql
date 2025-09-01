-- Autonomous Build Operator - Production Schema
-- Addresses P0 durability gaps with idempotent, resumable state machine

-- Core orchestration state
CREATE TABLE runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal TEXT NOT NULL,
    mode TEXT CHECK (mode IN ('PLAN', 'APPLY', 'ROLLBACK')) NOT NULL DEFAULT 'PLAN',
    status TEXT CHECK (status IN ('pending', 'planning', 'planned', 'applying', 'completed', 'failed', 'cancelled', 'paused')) NOT NULL DEFAULT 'pending',
    autonomy INTEGER CHECK (autonomy >= 0 AND autonomy <= 5) NOT NULL DEFAULT 0,
    
    -- Resource constraints and budgets
    budget_tokens INTEGER DEFAULT 100000,
    budget_usd DECIMAL(10,2) DEFAULT 50.00,
    budget_time_minutes INTEGER DEFAULT 120,
    tokens_used INTEGER DEFAULT 0,
    usd_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Metadata and audit
    created_by TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    reason_for_access TEXT,
    approval_required BOOLEAN DEFAULT false,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    
    -- Configuration snapshot
    config JSONB NOT NULL DEFAULT '{}',
    
    CONSTRAINT runs_timing_check CHECK (
        (started_at IS NULL OR started_at >= created_at) AND
        (finished_at IS NULL OR finished_at >= COALESCE(started_at, created_at))
    )
);

-- Individual tasks within a run
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    
    -- Task definition
    type TEXT NOT NULL, -- codegen, testgen, deploy, rollback, etc.
    params JSONB NOT NULL DEFAULT '{}',
    dependencies TEXT[] DEFAULT '{}', -- task IDs this depends on
    
    -- Execution state
    status TEXT CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled', 'skipped')) NOT NULL DEFAULT 'pending',
    attempt INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Idempotency and safety
    idempotency_key TEXT UNIQUE NOT NULL,
    safety_category TEXT CHECK (safety_category IN ('READ', 'write', 'deploy', 'rollback')) NOT NULL DEFAULT 'read',
    requires_approval BOOLEAN DEFAULT false,
    
    -- Resource usage
    tokens_used INTEGER DEFAULT 0,
    usd_spent DECIMAL(10,2) DEFAULT 0.00,
    
    -- Timing
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,
    timeout_at TIMESTAMPTZ,
    
    -- Results
    result JSONB,
    error_message TEXT,
    error_details JSONB,
    
    -- Audit
    executed_by TEXT,
    execution_context JSONB DEFAULT '{}'
);

-- Immutable event log for full audit trail
CREATE TABLE events (
    id BIGSERIAL PRIMARY KEY,
    correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
    
    -- Context
    run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Event data
    event_type TEXT NOT NULL,
    level TEXT CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')) NOT NULL DEFAULT 'info',
    message TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    
    -- Metadata
    source TEXT NOT NULL DEFAULT 'autonomous-operator',
    user_id TEXT,
    tenant_id TEXT,
    
    -- Immutable timestamp
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Advisory locks for resource coordination
CREATE TABLE resource_locks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type TEXT NOT NULL, -- repo, service, environment, etc.
    resource_id TEXT NOT NULL,
    
    -- Lock owner
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Lock metadata
    lock_mode TEXT CHECK (lock_mode IN ('shared', 'exclusive')) NOT NULL DEFAULT 'exclusive',
    purpose TEXT NOT NULL,
    
    -- Timing
    acquired_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(resource_type, resource_id, lock_mode)
);

-- Policy decisions cache for performance
CREATE TABLE policy_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request context
    subject_hash TEXT NOT NULL, -- hash of subject + action + resource
    policy_version TEXT NOT NULL,
    
    -- Decision
    allowed BOOLEAN NOT NULL,
    reason TEXT,
    conditions JSONB DEFAULT '{}',
    
    -- TTL
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    
    UNIQUE(subject_hash, policy_version)
);

-- Budget tracking per provider
CREATE TABLE budget_usage (
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    
    -- Usage counters
    tokens_used INTEGER DEFAULT 0,
    usd_spent DECIMAL(10,2) DEFAULT 0.00,
    requests_made INTEGER DEFAULT 0,
    
    -- Timing
    first_used_at TIMESTAMPTZ DEFAULT NOW(),
    last_used_at TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (run_id, provider)
);

-- Approvals queue for human-in-the-loop
CREATE TABLE approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Request
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Approval details
    approval_type TEXT NOT NULL, -- plan, apply, deploy, rollback
    requested_by TEXT NOT NULL,
    reason TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    
    -- Preview/diff
    preview_url TEXT,
    diff_summary TEXT,
    risk_assessment JSONB DEFAULT '{}',
    
    -- Decision
    status TEXT CHECK (status IN ('pending', 'approved', 'denied', 'expired')) NOT NULL DEFAULT 'pending',
    decided_by TEXT,
    decision_reason TEXT,
    decided_at TIMESTAMPTZ,
    
    -- Timing
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

-- Artifacts produced by tasks
CREATE TABLE artifacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Context
    run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    
    -- Artifact metadata
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- code, test, docs, config, binary
    mime_type TEXT,
    size_bytes BIGINT,
    
    -- Storage
    storage_path TEXT NOT NULL,
    checksum_sha256 TEXT NOT NULL,
    
    -- Security
    signed_by TEXT,
    signature TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_runs_status ON runs(status);
CREATE INDEX idx_runs_created_by ON runs(created_by);
CREATE INDEX idx_runs_tenant_id ON runs(tenant_id);
CREATE INDEX idx_runs_created_at ON runs(created_at DESC);

CREATE INDEX idx_tasks_run_id ON tasks(run_id);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_idempotency_key ON tasks(idempotency_key);
CREATE INDEX idx_tasks_safety_category ON tasks(safety_category);
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);

CREATE INDEX idx_events_run_id ON events(run_id);
CREATE INDEX idx_events_task_id ON events(task_id);
CREATE INDEX idx_events_correlation_id ON events(correlation_id);
CREATE INDEX idx_events_created_at ON events(created_at DESC);
CREATE INDEX idx_events_level ON events(level);

CREATE INDEX idx_resource_locks_resource ON resource_locks(resource_type, resource_id);
CREATE INDEX idx_resource_locks_expires_at ON resource_locks(expires_at);

CREATE INDEX idx_policy_decisions_hash ON policy_decisions(subject_hash);
CREATE INDEX idx_policy_decisions_expires_at ON policy_decisions(expires_at);

CREATE INDEX idx_approvals_status ON approvals(status);
CREATE INDEX idx_approvals_requested_at ON approvals(requested_at DESC);
CREATE INDEX idx_approvals_expires_at ON approvals(expires_at);

-- Triggers for automatic cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_locks()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM resource_locks WHERE expires_at < NOW();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_locks
    AFTER INSERT OR UPDATE ON resource_locks
    EXECUTE FUNCTION cleanup_expired_locks();

CREATE OR REPLACE FUNCTION cleanup_expired_policy_decisions()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM policy_decisions WHERE expires_at < NOW();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cleanup_expired_policy_decisions
    AFTER INSERT OR UPDATE ON policy_decisions
    EXECUTE FUNCTION cleanup_expired_policy_decisions();

-- Materialized views for analytics
CREATE MATERIALIZED VIEW mv_run_statistics AS
SELECT 
    DATE_TRUNC('day', created_at) as date,
    COUNT(*) as total_runs,
    COUNT(*) FILTER (WHERE status = 'completed') as completed_runs,
    COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
    AVG(EXTRACT(EPOCH FROM (finished_at - started_at))/60) as avg_duration_minutes,
    AVG(tokens_used) as avg_tokens_used,
    AVG(usd_spent) as avg_usd_spent
FROM runs 
WHERE started_at IS NOT NULL
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

CREATE UNIQUE INDEX idx_mv_run_statistics_date ON mv_run_statistics(date);

-- Refresh the materialized view daily
CREATE OR REPLACE FUNCTION refresh_run_statistics()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_run_statistics;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE runs IS 'Core orchestration runs with budget tracking and approval gates';
COMMENT ON TABLE tasks IS 'Individual tasks within runs with idempotency and safety controls';
COMMENT ON TABLE events IS 'Immutable audit log for all orchestration events';
COMMENT ON TABLE resource_locks IS 'Advisory locks to prevent resource conflicts';
COMMENT ON TABLE policy_decisions IS 'Cached policy evaluation results for performance';
COMMENT ON TABLE budget_usage IS 'Per-provider budget tracking and usage analytics';
COMMENT ON TABLE approvals IS 'Human-in-the-loop approval queue for sensitive operations';
COMMENT ON TABLE artifacts IS 'Signed artifacts produced by orchestration tasks';

COMMENT ON COLUMN runs.autonomy IS 'Autonomy level: 0=manual, 1=assisted, 2=guarded, 3=auto-merge, 4=auto-deploy, 5=fully-autonomous';
COMMENT ON COLUMN tasks.idempotency_key IS 'Unique key for idempotent task execution';
COMMENT ON COLUMN tasks.safety_category IS 'Safety classification requiring different approval levels';
COMMENT ON COLUMN events.correlation_id IS 'Correlation ID for tracing related events across services';