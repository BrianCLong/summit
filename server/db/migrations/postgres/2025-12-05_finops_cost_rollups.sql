-- FinOps Cost Rollups
-- Purpose: persist daily tenant-level allocation by cost bucket with metering snapshot
-- Run: psql -d intelgraph -f server/db/migrations/postgres/2025-12-05_finops_cost_rollups.sql

BEGIN;

CREATE TABLE IF NOT EXISTS finops_cost_rollups (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  usage_date DATE NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  window_end TIMESTAMPTZ NOT NULL,
  compute_units NUMERIC(18,6) DEFAULT 0,
  storage_gb_hours NUMERIC(18,6) DEFAULT 0,
  egress_gb NUMERIC(18,6) DEFAULT 0,
  third_party_requests BIGINT DEFAULT 0,
  compute_cost_usd NUMERIC(14,6) DEFAULT 0,
  storage_cost_usd NUMERIC(14,6) DEFAULT 0,
  egress_cost_usd NUMERIC(14,6) DEFAULT 0,
  third_party_cost_usd NUMERIC(14,6) DEFAULT 0,
  total_cost_usd NUMERIC(14,6) DEFAULT 0,
  metering_snapshot JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, usage_date)
);

CREATE INDEX IF NOT EXISTS finops_cost_rollups_tenant_date_idx
  ON finops_cost_rollups (tenant_id, usage_date DESC);

COMMENT ON TABLE finops_cost_rollups IS 'Daily tenant cost rollups by bucket (compute, storage, egress, third_party).';

COMMIT;
