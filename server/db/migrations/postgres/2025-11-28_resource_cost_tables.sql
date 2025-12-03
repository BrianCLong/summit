-- Resource Cost Tables
-- Date: 2025-11-28
-- Purpose: Create tables for tracking tenant resource usage and budgets with service-level granularity
-- Impact: Enables granular cost analysis and budget enforcement

-- ============================================================================
-- SECTION 1: Tenant Resource Usage
-- ============================================================================

-- Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS tenant_resource_usage (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  service_name VARCHAR(255) DEFAULT 'unknown',
  compute_units DECIMAL(12, 6) DEFAULT 0,
  storage_gb DECIMAL(12, 6) DEFAULT 0,
  network_gb DECIMAL(12, 6) DEFAULT 0,
  api_calls INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  queries INTEGER DEFAULT 0,
  data_ingested DECIMAL(12, 6) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add service_name column if table exists but column is missing
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_resource_usage' AND column_name = 'service_name') THEN
    ALTER TABLE tenant_resource_usage ADD COLUMN service_name VARCHAR(255) DEFAULT 'unknown';
  END IF;
END $$;

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_tenant_resource_usage_tenant_time
  ON tenant_resource_usage(tenant_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_tenant_resource_usage_service
  ON tenant_resource_usage(tenant_id, service_name, timestamp DESC);

COMMENT ON TABLE tenant_resource_usage IS 'Tracks resource usage metrics per tenant and service over time.';

-- ============================================================================
-- SECTION 2: Tenant Budgets
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_budgets (
  tenant_id VARCHAR(255) PRIMARY KEY,
  budget_config JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

COMMENT ON TABLE tenant_budgets IS 'Stores budget configuration and alerts settings for tenants.';

-- ============================================================================
-- SECTION 3: Cost Alerts
-- ============================================================================

CREATE TABLE IF NOT EXISTS cost_alerts (
  id SERIAL PRIMARY KEY,
  alert_key VARCHAR(255) UNIQUE NOT NULL, -- unique key to prevent duplicate alerts (e.g. tenant_period_threshold)
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_cost_alerts_timestamp
  ON cost_alerts(timestamp DESC);

COMMENT ON TABLE cost_alerts IS 'History of triggered cost alerts to prevent spamming.';
