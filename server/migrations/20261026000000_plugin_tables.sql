-- Plugin System Schema

-- Plugins registry
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  manifest JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('registered', 'installed', 'enabled', 'disabled', 'error', 'deprecated')),
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_by TEXT NOT NULL,
  enabled_at TIMESTAMPTZ,
  enabled_by TEXT,
  last_executed_at TIMESTAMPTZ,
  execution_count BIGINT DEFAULT 0,
  error_count BIGINT DEFAULT 0,
  last_error TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins (status);
CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins (category);

-- Tenant configurations for plugins
CREATE TABLE IF NOT EXISTS plugin_tenant_config (
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}',
  permissions JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_by TEXT,
  PRIMARY KEY (plugin_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_tenant_config ON plugin_tenant_config (tenant_id);

-- Audit log for plugin executions
CREATE TABLE IF NOT EXISTS plugin_audit_log (
  id UUID PRIMARY KEY,
  plugin_id TEXT NOT NULL REFERENCES plugins(id),
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration INT NOT NULL, -- milliseconds
  success BOOLEAN NOT NULL,
  input JSONB,
  output JSONB,
  error TEXT,
  governance_verdict TEXT NOT NULL DEFAULT 'ALLOW'
);

CREATE INDEX IF NOT EXISTS idx_plugin_audit_plugin ON plugin_audit_log (plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_audit_tenant ON plugin_audit_log (tenant_id);
CREATE INDEX IF NOT EXISTS idx_plugin_audit_timestamp ON plugin_audit_log (timestamp DESC);
