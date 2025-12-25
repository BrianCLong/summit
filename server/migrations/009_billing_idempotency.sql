
-- server/migrations/009_billing_idempotency.sql

ALTER TABLE usage_events ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_usage_events_idempotency
ON usage_events (tenant_id, idempotency_key)
WHERE idempotency_key IS NOT NULL;
