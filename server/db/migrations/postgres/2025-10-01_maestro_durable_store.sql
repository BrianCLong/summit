-- Durable Store for Maestro Orchestrator (Runs, Tasks, Events)
-- Ensures persistence for crash recovery and auditability.

-- Runs table (if not exists, matching runs-repo.ts expectations)
CREATE TABLE IF NOT EXISTS runs (
  id UUID PRIMARY KEY,
  pipeline_id TEXT,
  pipeline_name TEXT,
  status TEXT NOT NULL DEFAULT 'queued',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  cost DECIMAL(10, 4) DEFAULT 0,
  input_params JSONB,
  output_data JSONB,
  error_message TEXT,
  executor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_params JSONB,
  output_data JSONB,
  error_message TEXT,
  idempotency_key TEXT,
  retries INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL,
  CONSTRAINT tasks_idempotency_key_unique UNIQUE (run_id, idempotency_key)
);

-- Events table (for audit and outbox pattern)
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY,
  run_id UUID REFERENCES runs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload JSONB,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id TEXT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_runs_tenant ON runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_run_id ON tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_events_run_id ON events(run_id);
