CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, event_type, target_url)
);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, subscription_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next_attempt
  ON webhook_deliveries (tenant_id, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription
  ON webhook_deliveries (tenant_id, subscription_id);
CREATE INDEX IF NOT EXISTS idx_webhook_attempts_delivery
  ON webhook_delivery_attempts (delivery_id, attempt_number);
