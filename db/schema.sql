-- Placeholder for Maestro Postgres Schema

-- Table for Runbooks
CREATE TABLE IF NOT EXISTS runbooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL UNIQUE,
    version VARCHAR(50) NOT NULL,
    dag JSONB NOT NULL, -- Directed Acyclic Graph definition
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for Runs (instances of runbooks)
CREATE TABLE IF NOT EXISTS runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    runbook_id UUID NOT NULL REFERENCES runbooks(id),
    tenant_id VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL, -- e.g., QUEUED, LEASED, RUNNING, SUCCEEDED, FAILED, TIMED_OUT, ABORTED
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    metadata JSONB, -- Additional run-specific metadata
    error_message TEXT -- For failed runs
);

-- Table for Tasks (steps within a run)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id UUID NOT NULL REFERENCES runs(id),
    task_name VARCHAR(255) NOT NULL,
    state VARCHAR(50) NOT NULL, -- e.g., PENDING, LEASED, RUNNING, SUCCEEDED, FAILED
    worker_id VARCHAR(255), -- ID of the worker that leased the task
    lease_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    input JSONB, -- Task input parameters
    output JSONB, -- Task output artifacts
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    error_message TEXT -- For failed tasks
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_runs_runbook_id ON runs(runbook_id);
CREATE INDEX IF NOT EXISTS idx_runs_tenant_id ON runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_state ON tasks(state);