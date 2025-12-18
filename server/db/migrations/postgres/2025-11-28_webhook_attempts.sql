-- Detailed delivery attempts for webhook retries
CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    attempt_number INTEGER NOT NULL,
    status TEXT NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    error_message TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_attempts_delivery_id ON webhook_delivery_attempts(delivery_id);
CREATE INDEX IF NOT EXISTS idx_webhook_attempts_webhook_id ON webhook_delivery_attempts(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_attempts_tenant_id ON webhook_delivery_attempts(tenant_id);

-- Enrich deliveries with observability for retry planning
ALTER TABLE webhook_deliveries
    ADD COLUMN IF NOT EXISTS last_attempt_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS last_error TEXT;
