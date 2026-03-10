-- Idempotency Store for Safe Mutations
-- Maps an idempotency key to a resource ID and cached response

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    resource_id TEXT,
    response_payload JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    PRIMARY KEY (tenant_id, key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expiry ON idempotency_keys (expires_at);

-- Partition or Cleanup policy (future debt)
-- For now, a simple index is enough for manual pruning.
