-- Add idempotency_key to runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

-- Create unique index for idempotency
CREATE UNIQUE INDEX IF NOT EXISTS idx_runs_idempotency
ON runs (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
