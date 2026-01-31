-- Scalability & Maintenance Hardening

-- 1. Task Claiming Support
ALTER TABLE orchestrator_tasks ADD COLUMN claimed_by TEXT;
ALTER TABLE orchestrator_tasks ADD COLUMN claimed_at TIMESTAMPTZ;
ALTER TABLE orchestrator_tasks ADD COLUMN claim_expires_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_claiming ON orchestrator_tasks(status, claim_expires_at) 
WHERE status = 'pending' OR status = 'in_progress';

-- 2. Pruning Metadata (if not already present)
-- We'll use created_at/updated_at for pruning.
-- Adding a 'finished_at' to runs to make pruning completed runs easier.
ALTER TABLE orchestrator_runs ADD COLUMN finished_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_orchestrator_runs_finished_at ON orchestrator_runs(finished_at) WHERE finished_at IS NOT NULL;

-- 3. DLQ support for outbox
-- Already have last_error and attempts. 
-- Adding a 'permanent_failure' flag if it exceeds max retries.
ALTER TABLE orchestrator_outbox ADD COLUMN is_permanent_failure BOOLEAN DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_dlq ON orchestrator_outbox(is_permanent_failure) WHERE is_permanent_failure = TRUE;
