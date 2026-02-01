-- Initial orchestrator tables: runs, tasks, events
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  idempotency_key TEXT,
  status TEXT NOT NULL CHECK (status IN ('PENDING','RUNNING','PAUSED','SUCCEEDED','FAILED','CANCELLED')),
  version INTEGER NOT NULL DEFAULT 1,
  payload JSONB,
  result JSONB,
  owner TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  last_heartbeat_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orchestrator_runs_idempotency_key
  ON orchestrator_runs (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_orchestrator_runs_status ON orchestrator_runs(status);
CREATE INDEX IF NOT EXISTS ix_orchestrator_runs_created_at ON orchestrator_runs(created_at);
CREATE INDEX IF NOT EXISTS ix_orchestrator_runs_heartbeat ON orchestrator_runs(last_heartbeat_at);

CREATE TABLE IF NOT EXISTS orchestrator_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
  idempotency_key TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING','QUEUED','IN_PROGRESS','RETRYING','SUCCEEDED','FAILED','CANCELLED')),
  attempt INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  scheduled_for TIMESTAMPTZ,
  claimed_by TEXT,
  payload JSONB,
  result JSONB,
  error TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_orchestrator_tasks_run_id_idempotency_key
  ON orchestrator_tasks (run_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_tasks_ready ON orchestrator_tasks (run_id, status, scheduled_for)
  WHERE status IN ('PENDING','QUEUED');

CREATE INDEX IF NOT EXISTS ix_tasks_claimed_by ON orchestrator_tasks (claimed_by);
CREATE INDEX IF NOT EXISTS ix_tasks_scheduled_for ON orchestrator_tasks (scheduled_for);

CREATE TABLE IF NOT EXISTS orchestrator_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES orchestrator_tasks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  idempotency_key TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_events_run_id_idempotency_key
  ON orchestrator_events (run_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_events_run_created ON orchestrator_events (run_id, created_at);
CREATE INDEX IF NOT EXISTS ix_events_processed_at ON orchestrator_events (processed_at);
