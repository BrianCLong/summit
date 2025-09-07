-- Canary Limits: Daily budgets, alert thresholds, overrides, and seed data
-- Production-ready canary tenant configuration

BEGIN;

-- Enhance tenant_budget table with canary-specific fields
ALTER TABLE tenant_budget
  ADD COLUMN IF NOT EXISTS alert_threshold NUMERIC(5,4) NOT NULL DEFAULT 0.80, -- 80% warning threshold
  ADD COLUMN IF NOT EXISTS canary BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS auto_escalate BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_escalated_at TIMESTAMPTZ;

-- Ensure daily_usd_limit exists (may have been added in base migration)
ALTER TABLE tenant_budget
  ADD COLUMN IF NOT EXISTS daily_usd_limit NUMERIC(12,4);

-- Set default daily limit based on monthly (monthly/30)
UPDATE tenant_budget 
SET daily_usd_limit = ROUND(monthly_usd_limit / 30, 2)
WHERE daily_usd_limit IS NULL;

-- Make daily_usd_limit NOT NULL after setting defaults
ALTER TABLE tenant_budget
  ALTER COLUMN daily_usd_limit SET NOT NULL,
  ALTER COLUMN daily_usd_limit SET DEFAULT 25.00;

-- =====================================================================================
-- TENANT BUDGET OVERRIDES: Time-boxed emergency bypasses
-- =====================================================================================

CREATE TABLE IF NOT EXISTS tenant_budget_override (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  
  -- Override permissions
  allow_unpersisted BOOLEAN NOT NULL DEFAULT FALSE,
  allow_unapproved_ops BOOLEAN NOT NULL DEFAULT FALSE, -- Skip four-eyes requirement
  budget_multiplier NUMERIC(3,2) DEFAULT 1.0, -- Temporarily increase budget by factor
  
  -- Metadata
  note TEXT NOT NULL,
  created_by TEXT NOT NULL,
  approved_by TEXT, -- Requires approval for sensitive overrides
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  
  -- Audit
  used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  
  -- Constraints
  CONSTRAINT valid_expiry CHECK (expires_at > created_at),
  CONSTRAINT max_duration CHECK (expires_at <= created_at + INTERVAL '24 hours'), -- Max 24h override
  CONSTRAINT valid_multiplier CHECK (budget_multiplier >= 1.0 AND budget_multiplier <= 3.0),
  
  FOREIGN KEY (tenant_id) REFERENCES tenant_budget(tenant_id) ON DELETE CASCADE
);

-- Indexes for override lookups
CREATE INDEX IF NOT EXISTS tenant_budget_override_tenant_active_idx 
  ON tenant_budget_override (tenant_id, expires_at) 
  WHERE expires_at > NOW() AND revoked_at IS NULL;

CREATE INDEX IF NOT EXISTS tenant_budget_override_expires_idx 
  ON tenant_budget_override (expires_at);

-- =====================================================================================
-- MATERIALIZED VIEW: Real-time daily spending per tenant
-- =====================================================================================

DROP MATERIALIZED VIEW IF EXISTS tenant_daily_spend;

CREATE MATERIALIZED VIEW tenant_daily_spend AS
SELECT
  bl.tenant_id,
  DATE(bl.created_at AT TIME ZONE 'UTC') AS spend_date,
  COUNT(*) AS operation_count,
  COALESCE(SUM(bl.actual_total_usd), SUM(bl.est_total_usd)) AS total_usd,
  SUM(bl.est_total_usd) AS estimated_usd,
  SUM(bl.actual_total_usd) AS actual_usd,
  MAX(bl.created_at) AS last_operation_at
FROM budget_ledger bl
WHERE bl.created_at >= DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC') - INTERVAL '7 days' -- Last 7 days
  AND bl.status IN ('estimated', 'reconciled')
GROUP BY bl.tenant_id, DATE(bl.created_at AT TIME ZONE 'UTC');

-- Unique index for efficient lookups
CREATE UNIQUE INDEX IF NOT EXISTS tenant_daily_spend_tenant_date_idx 
  ON tenant_daily_spend (tenant_id, spend_date);

-- =====================================================================================
-- FUNCTIONS: Budget checking with override support
-- =====================================================================================

-- Enhanced budget check function with override support
CREATE OR REPLACE FUNCTION check_tenant_budget_with_overrides(
  p_tenant_id TEXT,
  p_estimated_usd NUMERIC,
  p_check_persisted BOOLEAN DEFAULT FALSE,
  p_check_approval BOOLEAN DEFAULT FALSE
) RETURNS TABLE (
  can_afford BOOLEAN,
  current_daily_spend NUMERIC,
  daily_limit NUMERIC,
  current_monthly_spend NUMERIC,
  monthly_limit NUMERIC,
  utilization_pct NUMERIC,
  override_active BOOLEAN,
  requires_persisted BOOLEAN,
  requires_approval BOOLEAN,
  reason TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_tenant_budget tenant_budget%ROWTYPE;
  v_daily_spend NUMERIC := 0;
  v_monthly_spend NUMERIC := 0;
  v_override_count INTEGER := 0;
  v_effective_daily_limit NUMERIC;
  v_effective_monthly_limit NUMERIC;
BEGIN
  -- Get tenant budget configuration
  SELECT * INTO v_tenant_budget
  FROM tenant_budget tb
  WHERE tb.tenant_id = p_tenant_id AND tb.deleted_at IS NULL;
  
  IF v_tenant_budget.tenant_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 
                        FALSE, p_check_persisted, p_check_approval, 'Tenant not found'::TEXT;
    RETURN;
  END IF;
  
  -- Get current daily spending
  SELECT COALESCE(tds.total_usd, 0) INTO v_daily_spend
  FROM tenant_daily_spend tds
  WHERE tds.tenant_id = p_tenant_id 
    AND tds.spend_date = DATE(NOW() AT TIME ZONE 'UTC');
  
  -- Get current monthly spending (approximation from last 30 days)
  SELECT COALESCE(SUM(tds.total_usd), 0) INTO v_monthly_spend
  FROM tenant_daily_spend tds
  WHERE tds.tenant_id = p_tenant_id 
    AND tds.spend_date >= DATE(NOW() AT TIME ZONE 'UTC') - INTERVAL '30 days';
  
  -- Check for active overrides
  SELECT COUNT(*) INTO v_override_count
  FROM tenant_budget_override tbo
  WHERE tbo.tenant_id = p_tenant_id
    AND tbo.expires_at > NOW()
    AND tbo.revoked_at IS NULL;
  
  -- Calculate effective limits (with override multiplier if applicable)
  v_effective_daily_limit := v_tenant_budget.daily_usd_limit;
  v_effective_monthly_limit := v_tenant_budget.monthly_usd_limit;
  
  IF v_override_count > 0 THEN
    SELECT COALESCE(MAX(budget_multiplier), 1.0) INTO v_effective_daily_limit
    FROM tenant_budget_override
    WHERE tenant_id = p_tenant_id AND expires_at > NOW() AND revoked_at IS NULL;
    
    v_effective_daily_limit := v_tenant_budget.daily_usd_limit * v_effective_daily_limit;
    v_effective_monthly_limit := v_tenant_budget.monthly_usd_limit * v_effective_daily_limit;
  END IF;
  
  -- Calculate utilization
  DECLARE
    v_utilization NUMERIC := ROUND(((v_daily_spend + p_estimated_usd) / v_effective_daily_limit) * 100, 2);
    v_can_afford BOOLEAN := (v_daily_spend + p_estimated_usd) <= v_effective_daily_limit 
                           AND (v_monthly_spend + p_estimated_usd) <= v_effective_monthly_limit;
    v_reason TEXT := CASE 
      WHEN v_can_afford THEN 'Within budget'
      WHEN (v_daily_spend + p_estimated_usd) > v_effective_daily_limit THEN 'Daily limit exceeded'
      ELSE 'Monthly limit exceeded'
    END;
  BEGIN
    RETURN QUERY SELECT 
      v_can_afford,
      v_daily_spend,
      v_effective_daily_limit,
      v_monthly_spend,
      v_effective_monthly_limit,
      v_utilization,
      v_override_count > 0,
      p_check_persisted,
      p_check_approval,
      v_reason;
  END;
END;
$$;

-- =====================================================================================
-- CANARY TENANT SEEDING: Test, demo, and maestro-internal
-- =====================================================================================

-- Insert/update canary tenant configurations
INSERT INTO tenant_budget (
  tenant_id, 
  monthly_usd_limit, 
  daily_usd_limit, 
  alert_threshold, 
  hard_cap, 
  canary,
  auto_escalate,
  updated_by,
  created_by,
  notes
) VALUES
  ('test', 750.00, 25.00, 0.80, TRUE, TRUE, TRUE, 'ops', 'canary-seed', 'Canary tenant for testing - auto-escalates to $50/day after 1 clean week'),
  ('demo', 750.00, 25.00, 0.80, TRUE, TRUE, TRUE, 'ops', 'canary-seed', 'Demo tenant for customer showcases - auto-escalates to $50/day after 1 clean week'),
  ('maestro-internal', 750.00, 25.00, 0.80, TRUE, TRUE, TRUE, 'ops', 'canary-seed', 'Internal Maestro operations - auto-escalates to $50/day after 1 clean week'),
  ('production-sample', 2000.00, 100.00, 0.85, TRUE, FALSE, FALSE, 'ops', 'canary-seed', 'Production tenant example - higher limits, no auto-escalation')
ON CONFLICT (tenant_id) DO UPDATE SET
  monthly_usd_limit = EXCLUDED.monthly_usd_limit,
  daily_usd_limit = EXCLUDED.daily_usd_limit,
  alert_threshold = EXCLUDED.alert_threshold,
  hard_cap = EXCLUDED.hard_cap,
  canary = EXCLUDED.canary,
  auto_escalate = EXCLUDED.auto_escalate,
  updated_at = NOW(),
  updated_by = EXCLUDED.updated_by,
  notes = EXCLUDED.notes;

-- =====================================================================================
-- REFRESH PROCEDURE: Update materialized view (call from cron every minute)
-- =====================================================================================

CREATE OR REPLACE FUNCTION refresh_daily_spend()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_daily_spend;
  
  -- Log refresh for monitoring
  INSERT INTO system_log (event_type, message, created_at)
  VALUES ('materialized_view_refresh', 'tenant_daily_spend refreshed', NOW())
  ON CONFLICT DO NOTHING; -- In case system_log doesn't exist yet
  
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail
  NULL;
END;
$$;

-- =====================================================================================
-- VIEWS: Easy querying for alerts and monitoring
-- =====================================================================================

-- Canary budget status view for monitoring
CREATE OR REPLACE VIEW canary_budget_status AS
SELECT
  tb.tenant_id,
  tb.daily_usd_limit,
  tb.monthly_usd_limit,
  tb.alert_threshold,
  tb.auto_escalate,
  tb.last_escalated_at,
  COALESCE(tds.total_usd, 0) AS today_spend,
  ROUND((COALESCE(tds.total_usd, 0) / tb.daily_usd_limit) * 100, 2) AS daily_utilization_pct,
  CASE
    WHEN COALESCE(tds.total_usd, 0) >= tb.daily_usd_limit THEN 'EXCEEDED'
    WHEN COALESCE(tds.total_usd, 0) >= (tb.daily_usd_limit * tb.alert_threshold) THEN 'WARNING'
    ELSE 'OK'
  END AS status,
  -- Check for active overrides
  EXISTS(
    SELECT 1 FROM tenant_budget_override tbo
    WHERE tbo.tenant_id = tb.tenant_id
      AND tbo.expires_at > NOW()
      AND tbo.revoked_at IS NULL
  ) AS has_active_override,
  tds.operation_count AS today_operations,
  tds.last_operation_at
FROM tenant_budget tb
LEFT JOIN tenant_daily_spend tds ON tb.tenant_id = tds.tenant_id 
  AND tds.spend_date = DATE(NOW() AT TIME ZONE 'UTC')
WHERE tb.canary = TRUE 
  AND tb.deleted_at IS NULL;

COMMIT;