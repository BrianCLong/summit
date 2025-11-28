-- Migration: 2025-11-21_agent_governance
-- Description: Adds tables for Agent Governance (Passport), Control Plane, and ROI Intelligence.

-- Agents table (The "Passport")
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT DEFAULT '1.0.0',
  capabilities TEXT[], -- e.g., ['github:read', 'k8s:deploy']
  compliance_tags TEXT[], -- e.g., ['SOC2', 'PII_SAFE']
  status TEXT DEFAULT 'DRAFT', -- 'DRAFT', 'ACTIVE', 'REVOKED', 'DEPRECATED'
  owner_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies attached to agents
CREATE TABLE IF NOT EXISTS agent_policies (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  policy_type TEXT NOT NULL, -- 'OPA_REGO', 'MANUAL_APPROVAL', 'THRESHOLD'
  configuration JSONB NOT NULL, -- The actual policy content or config
  is_blocking BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROI Metrics for tracking value
CREATE TABLE IF NOT EXISTS agent_roi_metrics (
  id UUID PRIMARY KEY,
  agent_id UUID REFERENCES agents(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL, -- 'TIME_SAVED_MINUTES', 'INCIDENTS_PREVENTED', 'DOLLARS_SAVED', 'PR_MERGED'
  value NUMERIC NOT NULL,
  context JSONB, -- { "pr_id": "123", "workflow": "ci-check" }
  recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_agents_tenant ON agents(tenant_id);
CREATE INDEX idx_agent_policies_agent ON agent_policies(agent_id);
CREATE INDEX idx_agent_roi_agent ON agent_roi_metrics(agent_id);
CREATE INDEX idx_agent_roi_type ON agent_roi_metrics(metric_type);
