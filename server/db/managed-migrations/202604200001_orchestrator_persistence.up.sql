-- Up Migration: Orchestrator Persistence
-- Committee Requirements: Durable source of truth, Idempotency, Outbox pattern

CREATE TABLE IF NOT EXISTS orchestrator_runs (
  id TEXT PRIMARY KEY,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orchestrator_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES orchestrator_runs(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL,
  owner TEXT, -- agentId
  blocked_by TEXT[] NOT NULL DEFAULT '{}',
  blocks TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}',
  -- Idempotency constraint for tasks if needed, though ID is usually unique
  CONSTRAINT orchestrator_tasks_run_id_fkey FOREIGN KEY (run_id) REFERENCES orchestrator_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_run_id ON orchestrator_tasks(run_id);
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_status ON orchestrator_tasks(status);

CREATE TABLE IF NOT EXISTS orchestrator_events (
  evidence_id TEXT PRIMARY KEY,
  run_id TEXT REFERENCES orchestrator_runs(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  team_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_events_run_id ON orchestrator_events(run_id);

CREATE TABLE IF NOT EXISTS orchestrator_outbox (
  id BIGSERIAL PRIMARY KEY,
  topic TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_processed_at ON orchestrator_outbox(processed_at) WHERE processed_at IS NULL;
