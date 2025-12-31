-- Plugin System Schema

-- Plugins Registry
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  version TEXT NOT NULL,
  description TEXT,
  author TEXT NOT NULL,
  category TEXT NOT NULL,
  manifest JSONB NOT NULL,
  status TEXT NOT NULL,
  installed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  installed_by TEXT NOT NULL,
  enabled_at TIMESTAMPTZ,
  enabled_by TEXT,
  last_executed_at TIMESTAMPTZ,
  execution_count BIGINT DEFAULT 0,
  error_count BIGINT DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plugins_category ON plugins(category);
CREATE INDEX IF NOT EXISTS idx_plugins_status ON plugins(status);

-- Tenant-specific Plugin Configuration
CREATE TABLE IF NOT EXISTS plugin_tenant_config (
  plugin_id TEXT NOT NULL REFERENCES plugins(id) ON DELETE CASCADE,
  tenant_id TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  enabled BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]', -- specific permissions granted to this plugin for this tenant
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by TEXT,
  PRIMARY KEY (plugin_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_plugin_tenant_config_tenant ON plugin_tenant_config(tenant_id);

-- Plugin Audit Log
CREATE TABLE IF NOT EXISTS plugin_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plugin_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  duration INTEGER, -- ms
  success BOOLEAN DEFAULT TRUE,
  input JSONB,
  output JSONB,
  error TEXT,
  governance_verdict TEXT, -- ALLOW/DENY
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_plugin_audit_plugin ON plugin_audit_log(plugin_id);
CREATE INDEX IF NOT EXISTS idx_plugin_audit_tenant ON plugin_audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_plugin_audit_timestamp ON plugin_audit_log(timestamp DESC);
