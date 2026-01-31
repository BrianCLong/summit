-- Orchestrator Retention Hardening (v1)

-- 1. Index for pruning processed outbox entries
CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_pruning_processed 
ON orchestrator_outbox(processed_at) 
WHERE processed_at IS NOT NULL;

-- 2. Index for pruning permanently failed outbox entries
CREATE INDEX IF NOT EXISTS idx_orchestrator_outbox_pruning_failed
ON orchestrator_outbox(created_at)
WHERE is_permanent_failure = TRUE;

-- 3. Index for general task pruning if needed (already have idx_orchestrator_runs_finished_at)
-- This index helps find old tasks associated with finished runs.
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_pruning ON orchestrator_tasks(completed_at) WHERE completed_at IS NOT NULL;
