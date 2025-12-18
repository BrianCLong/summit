-- Migration: Authorization Audit Log
-- Date: 2025-11-24
-- Purpose: Dedicated audit table for authorization decisions
--          Complements existing audit_events table with authz-specific fields

-- ============================================================================
-- AUTHORIZATION AUDIT LOG
-- ============================================================================

-- Immutable log of all authorization decisions
CREATE TABLE authorization_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- User context
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255),
  user_roles VARCHAR(100)[],

  -- Action and resource
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,

  -- Decision
  decision VARCHAR(20) NOT NULL CHECK (decision IN ('ALLOW', 'DENY', 'CHALLENGE')),
  reason TEXT NOT NULL,

  -- Authorization factors
  rbac_result BOOLEAN,
  abac_result BOOLEAN,
  warrant_id UUID REFERENCES warrants(warrant_id),
  license_id UUID REFERENCES licenses(license_id),
  tos_accepted BOOLEAN,

  -- Purpose tracking
  purpose VARCHAR(255) NOT NULL,
  investigation_id VARCHAR(255),
  case_reference VARCHAR(255),

  -- Technical context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id UUID,

  -- Policy metadata
  policy_version VARCHAR(50),
  policies_evaluated VARCHAR(100)[],
  rules_matched VARCHAR(100)[],
  rules_failed VARCHAR(100)[],
  evaluation_time_ms INTEGER,

  -- Compliance
  minimum_necessary_justification TEXT,
  data_classification VARCHAR(50),
  retention_category VARCHAR(100),

  -- Timestamp
  decided_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for performance
CREATE INDEX idx_authz_audit_tenant_time ON authorization_audit_log(tenant_id, decided_at DESC);
CREATE INDEX idx_authz_audit_user ON authorization_audit_log(user_id, decided_at DESC);
CREATE INDEX idx_authz_audit_resource ON authorization_audit_log(resource_type, resource_id);
CREATE INDEX idx_authz_audit_decision ON authorization_audit_log(decision) WHERE decision = 'DENY';
CREATE INDEX idx_authz_audit_warrant ON authorization_audit_log(warrant_id) WHERE warrant_id IS NOT NULL;
CREATE INDEX idx_authz_audit_license ON authorization_audit_log(license_id) WHERE license_id IS NOT NULL;
CREATE INDEX idx_authz_audit_investigation ON authorization_audit_log(investigation_id) WHERE investigation_id IS NOT NULL;

-- Composite index for common queries
CREATE INDEX idx_authz_audit_tenant_user_time ON authorization_audit_log(tenant_id, user_id, decided_at DESC);

-- Prevent modifications (immutability)
CREATE OR REPLACE FUNCTION prevent_authz_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'authorization_audit_log is immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_authz_audit_update
  BEFORE UPDATE ON authorization_audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_authz_audit_modification();

-- ============================================================================
-- MATERIALIZED VIEW: Authorization Denials Summary
-- ============================================================================

CREATE MATERIALIZED VIEW mv_authz_denials_summary AS
SELECT
  tenant_id,
  user_id,
  action,
  resource_type,
  COUNT(*) as denial_count,
  ARRAY_AGG(DISTINCT reason) as denial_reasons,
  MAX(decided_at) as last_denial_at,
  MIN(decided_at) as first_denial_at
FROM authorization_audit_log
WHERE decision = 'DENY'
  AND decided_at > NOW() - INTERVAL '30 days'
GROUP BY tenant_id, user_id, action, resource_type
HAVING COUNT(*) >= 3; -- Only show users with 3+ denials

CREATE UNIQUE INDEX idx_mv_authz_denials_pk
  ON mv_authz_denials_summary(tenant_id, user_id, action, resource_type);

-- Refresh function
CREATE OR REPLACE FUNCTION refresh_authz_denials_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_authz_denials_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

ALTER TABLE authorization_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY authz_audit_tenant_isolation ON authorization_audit_log
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Platform admins can see all audit logs
CREATE POLICY authz_audit_platform_admin ON authorization_audit_log
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'PLATFORM_ADMIN'
  );

-- ============================================================================
-- Migration complete
-- ============================================================================
