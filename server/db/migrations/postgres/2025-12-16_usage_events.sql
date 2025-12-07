-- Migration for Usage & Billing Architecture: usage_events table

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  principal_id UUID REFERENCES users(id) ON DELETE SET NULL,
  dimension TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  unit TEXT NOT NULL,
  source TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add indexes for common query patterns: by tenant, dimension, and time
CREATE INDEX IF NOT EXISTS usage_events_tenant_id_occurred_at_idx ON usage_events(tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS usage_events_dimension_idx ON usage_events(dimension);
CREATE INDEX IF NOT EXISTS usage_events_source_idx ON usage_events(source);
