-- Budget Ledger Migration: Tenant budgets + audit trail for FinOps
-- Usage: psql -d intelgraph -f db/migrations/20250906_budget_ledger.sql

BEGIN;

-- =====================================================================================
-- TENANT BUDGET TABLE: Source of truth for monthly spending limits
-- =====================================================================================

CREATE TABLE IF NOT EXISTS tenant_budget (
  tenant_id TEXT PRIMARY KEY,
  monthly_usd_limit NUMERIC(12,4) NOT NULL CHECK (monthly_usd_limit >= 0),
  daily_usd_limit NUMERIC(12,4) CHECK (daily_usd_limit >= 0 AND daily_usd_limit <= monthly_usd_limit),
  hard_cap BOOLEAN NOT NULL DEFAULT TRUE,
  notification_threshold NUMERIC(3,2) DEFAULT 0.8 CHECK (notification_threshold >= 0 AND notification_threshold <= 1),
  emergency_contact EMAIL,
  updated_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Metadata for audit
  created_by TEXT NOT NULL DEFAULT 'system',
  notes TEXT,
  
  -- Soft deletion
  deleted_at TIMESTAMPTZ,
  deleted_by TEXT
);

-- Indexes for tenant budget
CREATE INDEX IF NOT EXISTS tenant_budget_updated_at_idx ON tenant_budget (updated_at DESC);
CREATE INDEX IF NOT EXISTS tenant_budget_active_idx ON tenant_budget (tenant_id) WHERE deleted_at IS NULL;

-- =====================================================================================
-- BUDGET LEDGER TABLE: Detailed spending audit trail
-- =====================================================================================

CREATE TABLE IF NOT EXISTS budget_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  correlation_id UUID NOT NULL, -- Links to Neo4j compensation log
  
  -- Operation context
  operation_name TEXT NOT NULL,
  field_name TEXT,
  user_id TEXT,
  request_id TEXT,
  
  -- Provider/model info
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  
  -- Estimated costs (from pre-flight)
  est_prompt_tokens BIGINT NOT NULL CHECK (est_prompt_tokens >= 0),
  est_completion_tokens BIGINT NOT NULL CHECK (est_completion_tokens >= 0),
  est_total_tokens BIGINT GENERATED ALWAYS AS (est_prompt_tokens + est_completion_tokens) STORED,
  est_total_usd NUMERIC(12,6) NOT NULL CHECK (est_total_usd >= 0),
  
  -- Actual costs (from post-reconciliation)
  actual_prompt_tokens BIGINT CHECK (actual_prompt_tokens >= 0),
  actual_completion_tokens BIGINT CHECK (actual_completion_tokens >= 0),
  actual_total_tokens BIGINT GENERATED ALWAYS AS (COALESCE(actual_prompt_tokens, 0) + COALESCE(actual_completion_tokens, 0)) STORED,
  actual_total_usd NUMERIC(12,6) CHECK (actual_total_usd >= 0),
  
  -- Accuracy tracking
  estimation_method TEXT NOT NULL DEFAULT 'heuristic' CHECK (estimation_method IN ('precise', 'heuristic', 'cached')),
  accuracy_ratio NUMERIC(5,3) GENERATED ALWAYS AS (
    CASE 
      WHEN est_total_usd > 0 AND actual_total_usd IS NOT NULL 
      THEN actual_total_usd / est_total_usd 
      ELSE NULL 
    END
  ) STORED,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'estimated' CHECK (status IN ('estimated', 'reconciled', 'failed', 'rolled_back')),
  reconciled_at TIMESTAMPTZ,
  failed_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Foreign key constraint
  FOREIGN KEY (tenant_id) REFERENCES tenant_budget(tenant_id) ON DELETE CASCADE
);

-- Indexes for budget ledger (optimized for queries)
CREATE INDEX IF NOT EXISTS budget_ledger_tenant_created_idx ON budget_ledger (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS budget_ledger_correlation_idx ON budget_ledger (correlation_id);
CREATE INDEX IF NOT EXISTS budget_ledger_provider_model_idx ON budget_ledger (provider, model, created_at DESC);
CREATE INDEX IF NOT EXISTS budget_ledger_status_idx ON budget_ledger (status, created_at DESC);
CREATE INDEX IF NOT EXISTS budget_ledger_reconciliation_idx ON budget_ledger (status, reconciled_at) WHERE status = 'estimated';

-- Partial index for active (non-rolled-back) entries
CREATE INDEX IF NOT EXISTS budget_ledger_active_spending_idx ON budget_ledger (tenant_id, created_at DESC) 
  WHERE status IN ('estimated', 'reconciled');

-- =====================================================================================
-- SPENDING AGGREGATION VIEWS: Pre-computed for performance
-- =====================================================================================

-- Daily spending per tenant (estimated + actual)
CREATE OR REPLACE VIEW daily_spending AS
SELECT 
  tenant_id,
  DATE(created_at AT TIME ZONE 'UTC') as spend_date,
  provider,
  model,
  COUNT(*) as operation_count,
  SUM(est_total_usd) as estimated_usd,
  SUM(actual_total_usd) as actual_usd,
  COALESCE(SUM(actual_total_usd), SUM(est_total_usd)) as total_usd,
  AVG(accuracy_ratio) FILTER (WHERE accuracy_ratio IS NOT NULL) as avg_accuracy_ratio,
  COUNT(*) FILTER (WHERE status = 'reconciled') as reconciled_count
FROM budget_ledger 
WHERE status IN ('estimated', 'reconciled')
GROUP BY tenant_id, spend_date, provider, model;

-- Monthly spending rollup per tenant
CREATE OR REPLACE VIEW monthly_spending AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', created_at AT TIME ZONE 'UTC') as spend_month,
  COUNT(*) as operation_count,
  SUM(est_total_usd) as estimated_usd,
  SUM(actual_total_usd) as actual_usd,
  COALESCE(SUM(actual_total_usd), SUM(est_total_usd)) as total_usd,
  AVG(accuracy_ratio) FILTER (WHERE accuracy_ratio IS NOT NULL) as avg_accuracy_ratio
FROM budget_ledger 
WHERE status IN ('estimated', 'reconciled')
GROUP BY tenant_id, spend_month;

-- Tenant budget utilization (current month)
CREATE OR REPLACE VIEW budget_utilization AS
SELECT 
  tb.tenant_id,
  tb.monthly_usd_limit,
  tb.daily_usd_limit,
  tb.hard_cap,
  tb.notification_threshold,
  COALESCE(ms.total_usd, 0) as current_month_spend,
  ROUND(COALESCE(ms.total_usd, 0) / tb.monthly_usd_limit * 100, 2) as utilization_pct,
  CASE 
    WHEN COALESCE(ms.total_usd, 0) >= tb.monthly_usd_limit THEN 'OVER_BUDGET'
    WHEN COALESCE(ms.total_usd, 0) >= tb.monthly_usd_limit * tb.notification_threshold THEN 'APPROACHING_LIMIT'
    ELSE 'WITHIN_BUDGET'
  END as status,
  tb.monthly_usd_limit - COALESCE(ms.total_usd, 0) as remaining_budget
FROM tenant_budget tb
LEFT JOIN monthly_spending ms ON tb.tenant_id = ms.tenant_id 
  AND ms.spend_month = DATE_TRUNC('month', NOW() AT TIME ZONE 'UTC')
WHERE tb.deleted_at IS NULL;

-- =====================================================================================
-- STORED PROCEDURES: Budget enforcement and reconciliation
-- =====================================================================================

-- Function to check if tenant can afford an operation
CREATE OR REPLACE FUNCTION check_tenant_budget(
  p_tenant_id TEXT,
  p_estimated_usd NUMERIC
) RETURNS TABLE (
  can_afford BOOLEAN,
  current_spend NUMERIC,
  budget_limit NUMERIC,
  utilization_pct NUMERIC,
  reason TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  v_current_spend NUMERIC;
  v_budget_limit NUMERIC;
  v_hard_cap BOOLEAN;
  v_utilization NUMERIC;
BEGIN
  -- Get current budget info
  SELECT 
    COALESCE(bu.current_month_spend, 0),
    bu.monthly_usd_limit,
    tb.hard_cap
  INTO v_current_spend, v_budget_limit, v_hard_cap
  FROM tenant_budget tb
  LEFT JOIN budget_utilization bu ON tb.tenant_id = bu.tenant_id
  WHERE tb.tenant_id = p_tenant_id AND tb.deleted_at IS NULL;
  
  -- Handle tenant not found
  IF v_budget_limit IS NULL THEN
    RETURN QUERY SELECT FALSE, 0::NUMERIC, 0::NUMERIC, 0::NUMERIC, 'Tenant not found'::TEXT;
    RETURN;
  END IF;
  
  v_utilization := ROUND((v_current_spend + p_estimated_usd) / v_budget_limit * 100, 2);
  
  -- Check budget constraints
  IF v_hard_cap AND (v_current_spend + p_estimated_usd) > v_budget_limit THEN
    RETURN QUERY SELECT FALSE, v_current_spend, v_budget_limit, v_utilization, 'Hard cap exceeded'::TEXT;
  ELSE
    RETURN QUERY SELECT TRUE, v_current_spend, v_budget_limit, v_utilization, 'Within budget'::TEXT;
  END IF;
END;
$$;

-- Function to record spending entry
CREATE OR REPLACE FUNCTION record_spending(
  p_tenant_id TEXT,
  p_correlation_id UUID,
  p_operation_name TEXT,
  p_field_name TEXT,
  p_user_id TEXT,
  p_provider TEXT,
  p_model TEXT,
  p_est_prompt_tokens BIGINT,
  p_est_completion_tokens BIGINT,
  p_est_total_usd NUMERIC,
  p_estimation_method TEXT DEFAULT 'heuristic'
) RETURNS UUID LANGUAGE plpgsql AS $$
DECLARE
  v_entry_id UUID;
BEGIN
  INSERT INTO budget_ledger (
    tenant_id, correlation_id, operation_name, field_name, user_id,
    provider, model, est_prompt_tokens, est_completion_tokens, est_total_usd,
    estimation_method
  ) VALUES (
    p_tenant_id, p_correlation_id, p_operation_name, p_field_name, p_user_id,
    p_provider, p_model, p_est_prompt_tokens, p_est_completion_tokens, p_est_total_usd,
    p_estimation_method
  ) RETURNING id INTO v_entry_id;
  
  RETURN v_entry_id;
END;
$$;

-- Function to update with actual spending
CREATE OR REPLACE FUNCTION reconcile_spending(
  p_ledger_id UUID,
  p_actual_prompt_tokens BIGINT,
  p_actual_completion_tokens BIGINT,
  p_actual_total_usd NUMERIC
) RETURNS BOOLEAN LANGUAGE plpgsql AS $$
BEGIN
  UPDATE budget_ledger 
  SET 
    actual_prompt_tokens = p_actual_prompt_tokens,
    actual_completion_tokens = p_actual_completion_tokens,
    actual_total_usd = p_actual_total_usd,
    status = 'reconciled',
    reconciled_at = NOW(),
    updated_at = NOW()
  WHERE id = p_ledger_id AND status = 'estimated';
  
  RETURN FOUND;
END;
$$;

-- =====================================================================================
-- TRIGGERS: Automatic timestamp updates
-- =====================================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tenant_budget_updated_at
  BEFORE UPDATE ON tenant_budget
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE TRIGGER budget_ledger_updated_at
  BEFORE UPDATE ON budget_ledger
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================================
-- INITIAL DATA: Default tenant configurations
-- =====================================================================================

-- Insert default tenant budgets (adjust as needed)
INSERT INTO tenant_budget (tenant_id, monthly_usd_limit, daily_usd_limit, updated_by, created_by, notes)
VALUES 
  ('default', 100.00, 10.00, 'system', 'migration', 'Default tenant budget'),
  ('test', 25.00, 5.00, 'system', 'migration', 'Test tenant budget'),
  ('demo', 50.00, 8.00, 'system', 'migration', 'Demo tenant budget')
ON CONFLICT (tenant_id) DO NOTHING;

-- =====================================================================================
-- PERMISSIONS: Grant access to application user
-- =====================================================================================

-- Grant permissions to application database user
-- GRANT SELECT, INSERT, UPDATE ON tenant_budget TO intelgraph_app;
-- GRANT SELECT, INSERT, UPDATE ON budget_ledger TO intelgraph_app;
-- GRANT SELECT ON daily_spending, monthly_spending, budget_utilization TO intelgraph_app;
-- GRANT EXECUTE ON FUNCTION check_tenant_budget(TEXT, NUMERIC) TO intelgraph_app;
-- GRANT EXECUTE ON FUNCTION record_spending(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, BIGINT, BIGINT, NUMERIC, TEXT) TO intelgraph_app;
-- GRANT EXECUTE ON FUNCTION reconcile_spending(UUID, BIGINT, BIGINT, NUMERIC) TO intelgraph_app;

COMMIT;