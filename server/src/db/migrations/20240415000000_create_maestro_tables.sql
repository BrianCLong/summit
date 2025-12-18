
-- Maestro Templates
CREATE TABLE IF NOT EXISTS maestro_templates (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  description TEXT,
  kind TEXT NOT NULL, -- 'workflow', 'agent', 'job'
  input_schema JSONB DEFAULT '{}'::jsonb,
  output_schema JSONB DEFAULT '{}'::jsonb,
  spec JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_maestro_templates_tenant ON maestro_templates(tenant_id);

-- Maestro Runs
CREATE TABLE IF NOT EXISTS maestro_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  template_id TEXT NOT NULL REFERENCES maestro_templates(id),
  template_version INTEGER NOT NULL,
  created_by_principal_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  input JSONB,
  output JSONB,
  error_summary TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_maestro_runs_tenant ON maestro_runs(tenant_id);
CREATE INDEX idx_maestro_runs_status ON maestro_runs(status);

-- Maestro Tasks
CREATE TABLE IF NOT EXISTS maestro_tasks (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES maestro_runs(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'ready', 'running', 'succeeded', 'failed', 'skipped', 'cancelled')),
  depends_on TEXT[], -- Array of parent task IDs
  attempt INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  backoff_strategy TEXT DEFAULT 'fixed',
  payload JSONB,
  result JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_maestro_tasks_run ON maestro_tasks(run_id);
CREATE INDEX idx_maestro_tasks_status ON maestro_tasks(status);

-- Maestro Agents
CREATE TABLE IF NOT EXISTS maestro_agents (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  capabilities TEXT[],
  template_id TEXT NOT NULL REFERENCES maestro_templates(id),
  config JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_maestro_agents_tenant ON maestro_agents(tenant_id);
