CREATE TABLE IF NOT EXISTS residency_exceptions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  target_region TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('storage', 'compute', 'logs', 'backup')),
  justification TEXT NOT NULL,
  approved_by TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residency_exceptions_tenant ON residency_exceptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_residency_exceptions_expires ON residency_exceptions(expires_at);
