-- Enterprise Sales Operating Plan schema
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS enterprise_sales_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    icp_fit SMALLINT NOT NULL CHECK (icp_fit BETWEEN 1 AND 5),
    arr_potential NUMERIC(16,2) NOT NULL CHECK (arr_potential > 0),
    strategic_value SMALLINT NOT NULL CHECK (strategic_value BETWEEN 1 AND 5),
    account_general TEXT NOT NULL,
    stop_loss_rule TEXT NOT NULL,
    exit_criteria TEXT NOT NULL,
    map JSONB NOT NULL,
    dossier JSONB NOT NULL,
    win_themes JSONB NOT NULL,
    procurement JSONB NOT NULL,
    poc JSONB NOT NULL,
    deployment JSONB NOT NULL,
    renewal JSONB NOT NULL,
    expansion JSONB NOT NULL,
    risk_register JSONB NOT NULL,
    metrics JSONB NOT NULL,
    coverage_score NUMERIC(6,2) NOT NULL,
    predictive_score NUMERIC(6,2) NOT NULL,
    overall_score NUMERIC(10,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS enterprise_sales_activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES enterprise_sales_accounts(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_enterprise_sales_activity_account ON enterprise_sales_activity_log(account_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_sales_activity_type ON enterprise_sales_activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_enterprise_sales_accounts_score ON enterprise_sales_accounts(overall_score DESC);

-- Ensure updated_at is refreshed on mutation
CREATE OR REPLACE FUNCTION set_enterprise_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_enterprise_sales_updated_at ON enterprise_sales_accounts;
CREATE TRIGGER trg_enterprise_sales_updated_at
BEFORE UPDATE ON enterprise_sales_accounts
FOR EACH ROW EXECUTE FUNCTION set_enterprise_sales_updated_at();
