-- Worker resilience and scheduling hardening

-- 1. Add attempt tracking and max attempts
ALTER TABLE orchestrator_tasks ADD COLUMN attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orchestrator_tasks ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 3;

-- 2. Add scheduling fields
ALTER TABLE orchestrator_tasks ADD COLUMN ready_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE orchestrator_tasks ADD COLUMN priority INTEGER NOT NULL DEFAULT 0;

-- 3. Update index for better scheduling performance
DROP INDEX IF EXISTS idx_orchestrator_tasks_claiming;
CREATE INDEX IF NOT EXISTS idx_orchestrator_tasks_scheduling ON orchestrator_tasks(status, priority DESC, ready_at ASC, claim_expires_at ASC)
WHERE status = 'pending' OR status = 'in_progress';
