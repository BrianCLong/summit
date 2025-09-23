-- MVP-13 RC: Billing & Entitlements Tables
-- This migration adds tables for detailed entitlement management, usage tracking, and invoicing.

-- Entitlements table: Defines specific feature limits per tenant, overriding plan defaults.
CREATE TABLE IF NOT EXISTS entitlements (
  tenant_id UUID NOT NULL,
  feature TEXT NOT NULL,               -- e.g., "predict.suggestLinks"
  plan_id TEXT NOT NULL REFERENCES plan(id) ON DELETE CASCADE,
  limits_json JSONB NOT NULL DEFAULT '{}'::jsonb, -- Stores monthly, daily, rate limits
  seats INT,                           -- Number of seats if applicable
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,              -- NULL for perpetual entitlements
  actor TEXT,                          -- Who granted/modified this entitlement
  signature TEXT,                      -- Cryptographic signature of the entitlement grant
  PRIMARY KEY (tenant_id, feature)
);

-- Usage Events table: Detailed, raw events from metering.
CREATE TABLE IF NOT EXISTS usage_events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID NOT NULL,
  user_id UUID,                        -- Optional: user who performed the action
  feature TEXT NOT NULL,               -- e.g., "graph.query", "export.pdf"
  quantity INT NOT NULL DEFAULT 1,     -- Amount of usage (e.g., 1 for a query, 1000 for tokens)
  source TEXT,                         -- Where the event originated (e.g., "graphql-gateway", "ingestion-service")
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb -- Additional context (e.g., query hash, document ID)
);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_ts ON usage_events (tenant_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_tenant_feature_ts ON usage_events (tenant_id, feature, ts DESC);

-- Usage Aggregation (Daily Rollup) table: Aggregated usage for billing periods.
CREATE TABLE IF NOT EXISTS usage_agg_daily (
  date DATE NOT NULL,
  tenant_id UUID NOT NULL,
  feature TEXT NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  cost_estimate NUMERIC(10, 4),        -- Estimated cost based on current pricing
  PRIMARY KEY (date, tenant_id, feature)
);

-- Usage Aggregation (Hourly Rollup) table: More granular aggregation for near real-time reporting.
CREATE TABLE IF NOT EXISTS usage_agg_hourly (
  hour TIMESTAMPTZ NOT NULL,
  tenant_id UUID NOT NULL,
  feature TEXT NOT NULL,
  quantity BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (hour, tenant_id, feature)
);

-- Invoices table: Stores generated invoices.
CREATE TABLE IF NOT EXISTS invoices (
  invoice_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- e.g., 'draft', 'issued', 'paid', 'void'
  total_amount NUMERIC(10, 4),
  currency TEXT NOT NULL DEFAULT 'USD',
  signature TEXT,                      -- Cryptographic signature of the invoice content
  hash TEXT,                           -- Hash of the invoice content for integrity
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_period ON invoices (tenant_id, period_start DESC);

-- Invoice Lines table: Details of each line item on an invoice.
CREATE TABLE IF NOT EXISTS invoice_lines (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(invoice_id) ON DELETE CASCADE,
  feature TEXT NOT NULL,
  quantity BIGINT NOT NULL,
  unit_price NUMERIC(10, 4) NOT NULL,
  amount NUMERIC(10, 4) NOT NULL,
  metadata_json JSONB NOT NULL DEFAULT '{}'::jsonb -- Additional line item details
);

-- Credits table: Manages credit memos for tenants.
CREATE TABLE IF NOT EXISTS credits (
  credit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC(10, 4) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  created_by TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' -- e.g., 'active', 'redeemed', 'expired'
);
CREATE INDEX IF NOT EXISTS idx_credits_tenant ON credits (tenant_id);
