-- Hardening Orchestrator Persistence

-- 1. Add monotonic sequencing to events
ALTER TABLE orchestrator_events ADD COLUMN event_seq BIGSERIAL;
CREATE INDEX IF NOT EXISTS idx_orchestrator_events_seq ON orchestrator_events(event_seq);

-- 2. Add versioning to tasks for optimistic concurrency
ALTER TABLE orchestrator_tasks ADD COLUMN version INTEGER NOT NULL DEFAULT 1;

-- 3. Add enhanced outbox fields for better tracking
ALTER TABLE orchestrator_outbox ADD COLUMN locked_at TIMESTAMPTZ;
ALTER TABLE orchestrator_outbox ADD COLUMN locked_by TEXT;
ALTER TABLE orchestrator_outbox ADD COLUMN expires_at TIMESTAMPTZ;

-- 4. Update task uniqueness if not already optimal
-- Assuming task IDs are globally unique as per the previous implementation, 
-- but ensuring index for run_id + id if needed.
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_run_id_id ON orchestrator_tasks(run_id, id);
