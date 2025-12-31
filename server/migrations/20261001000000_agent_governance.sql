
-- Migration to add Agent capabilities and Provenance tracking
-- Filename: server/migrations/20261001000000_agent_governance.sql

-- 1. Create Agents Table if not exists (or alter if it exists partially)
CREATE TABLE IF NOT EXISTS maestro_agents (
    id UUID PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    capabilities TEXT[] DEFAULT '{}',
    template_id TEXT NOT NULL,
    config JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maestro_agents_tenant ON maestro_agents(tenant_id);

-- 2. Create Agent Provenance Table
CREATE TABLE IF NOT EXISTS maestro_run_provenance (
    run_id UUID PRIMARY KEY REFERENCES maestro_runs(id),
    tenant_id TEXT NOT NULL,
    agent_id UUID NOT NULL, -- Logical reference, FK not strictly enforced to allow archival
    template_id TEXT NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL,
    steps JSONB DEFAULT '[]', -- Array of ProvenanceStep
    receipt_hash TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provenance_tenant ON maestro_run_provenance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_provenance_agent ON maestro_run_provenance(agent_id);

-- 3. Add Usage Metrics to Maestro Runs (to avoid costly aggregation)
ALTER TABLE maestro_runs ADD COLUMN IF NOT EXISTS usage_metrics JSONB DEFAULT '{
    "total_actions": 0,
    "total_tokens": 0,
    "total_external_calls": 0,
    "total_cost_usd": 0.0
}';
