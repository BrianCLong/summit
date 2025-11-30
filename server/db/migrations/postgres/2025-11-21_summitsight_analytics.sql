-- Summitsight Analytics & Executive Intelligence Layer Schema
-- Migration: 2025-11-21_summitsight_analytics.sql

-- 1. Dimensions
CREATE TABLE IF NOT EXISTS summitsight_dim_tenant (
    tenant_id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL,
    region TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS summitsight_dim_agent (
    agent_id TEXT PRIMARY KEY, -- e.g., 'researcher-v1'
    name TEXT NOT NULL,
    model TEXT NOT NULL, -- e.g., 'gpt-4'
    version TEXT NOT NULL,
    capabilities JSONB
);

-- 2. Fact Tables

-- Runs Fact: Execution performance and outcome
CREATE TABLE IF NOT EXISTS summitsight_fact_runs (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL, -- FK logic handled by app to allow loose coupling if tenants table is in diff schema, but we index it
    run_id UUID NOT NULL,
    workflow_name TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_ms INTEGER,
    status TEXT NOT NULL, -- 'completed', 'failed', 'cancelled'
    cost_usd NUMERIC(10, 5),
    outcome_summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summitsight_runs_tenant_time ON summitsight_fact_runs (tenant_id, start_time);
CREATE INDEX IF NOT EXISTS idx_summitsight_runs_status ON summitsight_fact_runs (status);

-- Tasks Fact: Granular task execution
CREATE TABLE IF NOT EXISTS summitsight_fact_tasks (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    run_id UUID NOT NULL,
    task_type TEXT NOT NULL,
    agent_id TEXT,
    model_used TEXT,
    input_tokens INTEGER,
    output_tokens INTEGER,
    cost_usd NUMERIC(10, 6),
    latency_ms INTEGER,
    status TEXT NOT NULL,
    error_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summitsight_tasks_tenant_time ON summitsight_fact_tasks (tenant_id, created_at);

-- Security Fact: Incidents and threats
CREATE TABLE IF NOT EXISTS summitsight_fact_security (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
    source TEXT NOT NULL, -- 'auth', 'firewall', 'agent_monitor'
    description TEXT,
    risk_score INTEGER,
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summitsight_sec_tenant_time ON summitsight_fact_security (tenant_id, detected_at);

-- Ops Fact: CI/CD and System Operations
CREATE TABLE IF NOT EXISTS summitsight_fact_ops (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID, -- Nullable for system-wide ops
    metric_type TEXT NOT NULL, -- 'deployment', 'merge_train', 'uptime', 'api_latency'
    value NUMERIC NOT NULL,
    unit TEXT NOT NULL,
    context JSONB, -- Extra tags like repo_name, commit_sha
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- IP & Innovation Fact
CREATE TABLE IF NOT EXISTS summitsight_fact_ip (
    fact_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    concept_id TEXT,
    novelty_score NUMERIC,
    domain TEXT,
    patent_filed BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL
);

-- 3. KPI Engine Storage

CREATE TABLE IF NOT EXISTS summitsight_kpi_registry (
    kpi_id TEXT PRIMARY KEY, -- e.g., 'eng.deployment_frequency'
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- 'engineering', 'business', 'security', 'foresight', 'compliance'
    owner TEXT, -- 'CTO', 'CISO'
    calculation_method TEXT, -- SQL or 'derived'
    threshold_yellow NUMERIC,
    threshold_red NUMERIC,
    unit TEXT,
    direction TEXT DEFAULT 'higher_is_better' -- or 'lower_is_better'
);

-- Pre-aggregated KPI values for fast dashboards
CREATE TABLE IF NOT EXISTS summitsight_kpi_values (
    value_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id TEXT NOT NULL REFERENCES summitsight_kpi_registry(kpi_id),
    tenant_id UUID, -- Null for global KPIs
    time_bucket TIMESTAMP WITH TIME ZONE NOT NULL, -- Start of the day/hour
    period TEXT NOT NULL, -- 'daily', 'hourly', 'monthly'
    value NUMERIC NOT NULL,
    dimension_filters JSONB, -- Store breakdown context
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_summitsight_kpi_lookup ON summitsight_kpi_values (kpi_id, tenant_id, time_bucket, period);

-- 4. Forecasting & Correlation

CREATE TABLE IF NOT EXISTS summitsight_forecasts (
    forecast_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_id TEXT NOT NULL REFERENCES summitsight_kpi_registry(kpi_id),
    tenant_id UUID,
    forecast_date TIMESTAMP WITH TIME ZONE NOT NULL, -- Future date
    predicted_value NUMERIC NOT NULL,
    confidence_interval_lower NUMERIC,
    confidence_interval_upper NUMERIC,
    model_version TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS summitsight_risk_assessments (
    assessment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    risk_category TEXT NOT NULL, -- 'auth', 'data', 'model'
    risk_score NUMERIC NOT NULL,
    factors JSONB, -- Details on why
    assessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Seed Default KPI Definitions
INSERT INTO summitsight_kpi_registry (kpi_id, name, description, category, owner, unit, direction) VALUES
('eng.deployment_freq', 'Deployment Frequency', 'Number of deployments per day', 'engineering', 'CTO', 'count', 'higher_is_better'),
('eng.lead_time', 'Lead Time for Changes', 'Time from commit to production', 'engineering', 'CTO', 'hours', 'lower_is_better'),
('eng.change_fail_rate', 'Change Failure Rate', 'Percentage of deployments causing failure', 'engineering', 'CTO', 'percent', 'lower_is_better'),
('sec.mttd', 'Mean Time To Detect', 'Average time to detect a security incident', 'security', 'CISO', 'minutes', 'lower_is_better'),
('sec.incident_rate', 'Security Incident Rate', 'Number of confirmed incidents', 'security', 'CISO', 'count', 'lower_is_better'),
('biz.churn_prob', 'Churn Probability', 'Predicted likelihood of tenant churn', 'business', 'CRO', 'percent', 'lower_is_better'),
('biz.margin', 'Gross Margin', 'Revenue minus COGS', 'business', 'CFO', 'percent', 'higher_is_better'),
('ip.novelty_velocity', 'IP Novelty Velocity', 'Rate of new high-novelty concepts generated', 'foresight', 'Chief Scientist', 'score', 'higher_is_better')
ON CONFLICT (kpi_id) DO NOTHING;
