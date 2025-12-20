-- Webhook subscriptions and delivery tracking
-- Provides per-tenant webhook subscriptions, delivery metadata, and attempt history

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS webhook_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_subscriptions_tenant_event_url
  ON webhook_subscriptions (tenant_id, event_type, target_url);
CREATE INDEX IF NOT EXISTS idx_webhook_subscriptions_active
  ON webhook_subscriptions (tenant_id, active);

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id TEXT NOT NULL,
  subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_deliveries_status_check CHECK (
    status IN ('pending', 'in_progress', 'succeeded', 'failed', 'poisoned')
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_deliveries_idempotency
  ON webhook_deliveries (tenant_id, subscription_id, idempotency_key);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status_next
  ON webhook_deliveries (tenant_id, status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_subscription
  ON webhook_deliveries (subscription_id);

CREATE TABLE IF NOT EXISTS webhook_delivery_attempts (
  id BIGSERIAL PRIMARY KEY,
  delivery_id UUID NOT NULL REFERENCES webhook_deliveries(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  attempt_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  response_status INTEGER,
  response_body TEXT,
  error TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT webhook_delivery_attempts_status_check CHECK (
    status IN ('pending', 'in_progress', 'succeeded', 'failed', 'poisoned')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_delivery
  ON webhook_delivery_attempts (delivery_id, attempt_number);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_attempts_tenant
  ON webhook_delivery_attempts (tenant_id, status);
