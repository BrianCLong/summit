
-- Playbooks table
CREATE TABLE IF NOT EXISTS maestro.playbooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  workflow JSONB NOT NULL, -- The definition of steps
  triggers JSONB, -- Triggers like "Incident Created"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID,
  metadata JSONB DEFAULT '{}'
);

-- Integrations table
CREATE TABLE IF NOT EXISTS maestro.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL, -- "Splunk", "Jira"
  type TEXT NOT NULL,
  config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Playbook Runs table
CREATE TABLE IF NOT EXISTS maestro.playbook_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  playbook_id UUID REFERENCES maestro.playbooks(id),
  case_id UUID REFERENCES maestro.cases(id), -- Optional link to a case
  status TEXT NOT NULL, -- running, completed, failed, pending
  context JSONB DEFAULT '{}', -- Variables passed to the run
  steps_state JSONB DEFAULT '[]', -- Execution state of steps
  result JSONB, -- Final output
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  triggered_by UUID -- User or System
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_playbooks_tenant ON maestro.playbooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_tenant ON maestro.playbook_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_playbook_runs_case ON maestro.playbook_runs(case_id);
CREATE INDEX IF NOT EXISTS idx_integrations_tenant ON maestro.integrations(tenant_id);
