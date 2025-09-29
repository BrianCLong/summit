-- MVP-13: Entitlements, Metering & Billing
-- This migration sets up the core tables for managing plans and tracking usage.

-- A plan defines a set of entitlements (e.g., free, pro, enterprise)
CREATE TABLE IF NOT EXISTS plan (
  id TEXT PRIMARY KEY, -- e.g., 'free', 'pro'
  name TEXT NOT NULL,
  tier INT NOT NULL CHECK (tier >= 0) -- Numeric tier for upgrade/downgrade logic
);

-- An entitlement represents a feature with a specific limit
CREATE TABLE IF NOT EXISTS entitlement (
  id BIGSERIAL PRIMARY KEY,
  plan_id TEXT REFERENCES plan(id) ON DELETE CASCADE,
  feature TEXT NOT NULL,               -- e.g., "predict.suggestLinks"
  limit_monthly BIGINT,                -- NULL = unlimited
  limit_daily BIGINT,
  limit_rate_per_min INT,              -- For token bucket rate limiting
  UNIQUE(plan_id, feature)
);

-- Assigns a plan to a tenant and allows for specific overrides
CREATE TABLE IF NOT EXISTS tenant_plan (
  tenant_id UUID PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES plan(id),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- JSONB to store any per-tenant deviations from the base plan
  overrides JSONB DEFAULT '{}'::jsonb 
);

-- Stores raw usage events as they are metered from the system
CREATE TABLE IF NOT EXISTS usage_event (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  feature TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 1,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Attributes for context, e.g., source IP, query complexity
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Indexes for efficient querying of usage data
CREATE INDEX IF NOT EXISTS idx_usage_event_tenant_ts ON usage_event (tenant_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_event_tenant_feature_ts ON usage_event (tenant_id, feature, ts DESC);
