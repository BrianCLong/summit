-- Create Audit Access Logs table for compliance tracking
-- Implements "who saw what when" logging with hash integrity

CREATE SCHEMA IF NOT EXISTS maestro;

CREATE TABLE IF NOT EXISTS maestro.audit_access_logs (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  case_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  reason TEXT NOT NULL,
  legal_basis TEXT NOT NULL,
  warrant_id TEXT,
  authority_reference TEXT,
  approval_chain JSONB DEFAULT '[]',
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT,
  request_id TEXT,
  correlation_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  hash TEXT,
  previous_hash TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON maestro.audit_access_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_case ON maestro.audit_access_logs (tenant_id, case_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON maestro.audit_access_logs (tenant_id, user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON maestro.audit_access_logs (tenant_id, action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON maestro.audit_access_logs (tenant_id, correlation_id);
