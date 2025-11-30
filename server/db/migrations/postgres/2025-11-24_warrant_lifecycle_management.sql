-- Migration: Warrant Lifecycle Management
-- Date: 2025-11-24
-- Purpose: Implement comprehensive warrant tracking, validation, and lifecycle management
--          for legal authority binding in multi-tenant intelligence platform

-- ============================================================================
-- 1. WARRANT REGISTRY
-- ============================================================================

-- Core warrant/authority registry with full lifecycle tracking
CREATE TABLE warrants (
  warrant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Warrant identification
  warrant_number VARCHAR(255) NOT NULL, -- Official warrant/subpoena number
  warrant_type VARCHAR(50) NOT NULL CHECK (warrant_type IN (
    'WARRANT',           -- Search warrant
    'SUBPOENA',         -- Subpoena duces tecum
    'COURT_ORDER',      -- Court order
    'ADMIN_AUTH',       -- Administrative authority
    'LICENSE',          -- Software/data license
    'TOS',              -- Terms of Service acceptance
    'CONSENT',          -- Subject consent
    'EMERGENCY',        -- Emergency disclosure
    'MUTUAL_AID'        -- Mutual aid agreement
  )),

  -- Legal details
  issuing_authority VARCHAR(255) NOT NULL, -- Court/agency that issued
  jurisdiction VARCHAR(100) NOT NULL,       -- Legal jurisdiction
  case_number VARCHAR(255),                 -- Associated case/docket number
  legal_basis TEXT NOT NULL,                -- Legal statute/regulation basis

  -- Scope and limitations
  scope JSONB NOT NULL,                     -- Array of permitted actions/targets
  scope_description TEXT NOT NULL,          -- Human-readable scope explanation
  permitted_actions VARCHAR(50)[] NOT NULL, -- ['READ', 'EXPORT', 'QUERY', 'COPILOT']
  target_subjects VARCHAR(255)[],           -- Specific subjects/entities covered
  target_data_types VARCHAR(100)[],         -- Permitted data types
  geographic_scope VARCHAR(255)[],          -- Geographic limitations

  -- Temporal validity
  issued_date TIMESTAMPTZ NOT NULL,
  effective_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,                  -- NULL = no expiration
  expiry_warning_days INTEGER DEFAULT 30,   -- Days before expiry to warn

  -- Status tracking
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'PENDING',          -- Awaiting activation
    'ACTIVE',           -- Currently valid
    'EXPIRED',          -- Past expiry date
    'REVOKED',          -- Explicitly revoked
    'SUSPENDED',        -- Temporarily suspended
    'SUPERSEDED'        -- Replaced by newer warrant
  )),
  superseded_by_warrant_id UUID REFERENCES warrants(warrant_id),

  -- Approval workflow
  requires_approval BOOLEAN DEFAULT false,
  approval_status VARCHAR(50) CHECK (approval_status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'ESCALATED'
  )),
  approved_by VARCHAR(255),
  approval_timestamp TIMESTAMPTZ,
  approval_reason TEXT,

  -- Two-person control
  requires_two_person BOOLEAN DEFAULT false,
  second_approver VARCHAR(255),
  second_approval_timestamp TIMESTAMPTZ,

  -- Audit and provenance
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ,

  -- Document attachments
  document_url TEXT,                        -- Link to original warrant document
  document_hash VARCHAR(64),                -- SHA-256 of document
  attestation_signature TEXT,               -- Digital signature

  -- Metadata
  tags VARCHAR(100)[],
  notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes for performance
CREATE INDEX idx_warrants_tenant_id ON warrants(tenant_id);
CREATE INDEX idx_warrants_status ON warrants(status) WHERE status IN ('ACTIVE', 'PENDING');
CREATE INDEX idx_warrants_expiry ON warrants(expiry_date) WHERE expiry_date IS NOT NULL AND status = 'ACTIVE';
CREATE INDEX idx_warrants_type ON warrants(warrant_type);
CREATE INDEX idx_warrants_case_number ON warrants(case_number) WHERE case_number IS NOT NULL;
CREATE UNIQUE INDEX idx_warrants_tenant_number ON warrants(tenant_id, warrant_number);

-- Composite index for common queries
CREATE INDEX idx_warrants_tenant_status_expiry ON warrants(tenant_id, status, expiry_date);

-- ============================================================================
-- 2. WARRANT BINDINGS (Resource Authorization)
-- ============================================================================

-- Links warrants to specific resources/investigations/queries
CREATE TABLE warrant_bindings (
  binding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(warrant_id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,

  -- Resource identification
  resource_type VARCHAR(100) NOT NULL, -- 'investigation', 'entity', 'query', 'export'
  resource_id VARCHAR(255) NOT NULL,
  resource_metadata JSONB DEFAULT '{}'::JSONB,

  -- Access control
  permitted_users VARCHAR(255)[],      -- NULL = all authorized users
  permitted_roles VARCHAR(100)[],

  -- Binding status
  binding_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (binding_status IN (
    'ACTIVE', 'SUSPENDED', 'REVOKED'
  )),

  -- Usage tracking
  first_used_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  usage_count INTEGER DEFAULT 0,

  -- Audit
  bound_by VARCHAR(255) NOT NULL,
  bound_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unbound_by VARCHAR(255),
  unbound_at TIMESTAMPTZ,
  unbind_reason TEXT
);

-- Indexes
CREATE INDEX idx_warrant_bindings_warrant_id ON warrant_bindings(warrant_id);
CREATE INDEX idx_warrant_bindings_resource ON warrant_bindings(resource_type, resource_id);
CREATE INDEX idx_warrant_bindings_tenant_status ON warrant_bindings(tenant_id, binding_status);

-- Ensure one active binding per resource
CREATE UNIQUE INDEX idx_warrant_bindings_resource_unique
  ON warrant_bindings(resource_type, resource_id, tenant_id)
  WHERE binding_status = 'ACTIVE';

-- ============================================================================
-- 3. WARRANT USAGE AUDIT
-- ============================================================================

-- Immutable audit log of every warrant usage
CREATE TABLE warrant_usage_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(warrant_id),
  binding_id UUID REFERENCES warrant_bindings(binding_id),
  tenant_id VARCHAR(255) NOT NULL,

  -- User context
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_roles VARCHAR(100)[],

  -- Action performed
  action VARCHAR(100) NOT NULL, -- 'READ', 'EXPORT', 'QUERY', 'COPILOT', etc.
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,

  -- Query details (for auditing)
  query_text TEXT,
  query_parameters JSONB,
  results_count INTEGER,
  results_hash VARCHAR(64),

  -- Decision context
  authorization_decision VARCHAR(20) NOT NULL CHECK (authorization_decision IN (
    'ALLOW', 'DENY', 'CHALLENGE'
  )),
  decision_reason TEXT,
  policy_version VARCHAR(50),

  -- Purpose tracking
  purpose VARCHAR(255) NOT NULL,          -- Required: reason for access
  investigation_id VARCHAR(255),
  case_reference VARCHAR(255),

  -- Technical context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id UUID,

  -- Timestamp
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Compliance metadata
  minimum_necessary_justification TEXT,    -- HIPAA minimum necessary
  data_classification VARCHAR(50),
  retention_category VARCHAR(100)
);

-- Indexes for audit queries
CREATE INDEX idx_warrant_usage_warrant_id ON warrant_usage_log(warrant_id);
CREATE INDEX idx_warrant_usage_tenant_time ON warrant_usage_log(tenant_id, accessed_at DESC);
CREATE INDEX idx_warrant_usage_user ON warrant_usage_log(user_id, accessed_at DESC);
CREATE INDEX idx_warrant_usage_decision ON warrant_usage_log(authorization_decision)
  WHERE authorization_decision = 'DENY';

-- Prevent modifications (immutability)
CREATE OR REPLACE FUNCTION prevent_warrant_usage_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'warrant_usage_log is immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_warrant_usage_update
  BEFORE UPDATE ON warrant_usage_log
  FOR EACH ROW EXECUTE FUNCTION prevent_warrant_usage_modification();

-- ============================================================================
-- 4. WARRANT EXPIRATION MONITORING
-- ============================================================================

-- Scheduled jobs/alerts for expiring warrants
CREATE TABLE warrant_expiration_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(warrant_id),
  tenant_id VARCHAR(255) NOT NULL,

  -- Alert details
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'APPROACHING_EXPIRY',  -- Within warning period
    'EXPIRED',             -- Past expiry date
    'RENEWAL_REQUIRED',    -- Needs renewal action
    'RENEWAL_FAILED'       -- Attempted renewal failed
  )),

  -- Timing
  scheduled_for TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,

  -- Recipients
  notify_users VARCHAR(255)[],
  notify_roles VARCHAR(100)[],
  notification_channels VARCHAR(50)[], -- ['email', 'slack', 'webhook']

  -- Status
  alert_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (alert_status IN (
    'PENDING', 'SENT', 'FAILED', 'ACKNOWLEDGED', 'RESOLVED'
  )),
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  resolution_action TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_warrant_expiration_pending ON warrant_expiration_alerts(alert_status, scheduled_for)
  WHERE alert_status = 'PENDING';
CREATE INDEX idx_warrant_expiration_warrant ON warrant_expiration_alerts(warrant_id);

-- ============================================================================
-- 5. WARRANT APPROVAL WORKFLOW
-- ============================================================================

-- Tracks multi-step approval process for high-stakes warrants
CREATE TABLE warrant_approval_workflow (
  workflow_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(warrant_id),
  tenant_id VARCHAR(255) NOT NULL,

  -- Workflow configuration
  required_approvers INTEGER NOT NULL DEFAULT 1,
  required_roles VARCHAR(100)[] NOT NULL, -- Roles that must approve
  approval_sequence VARCHAR(20) NOT NULL DEFAULT 'ANY' CHECK (approval_sequence IN (
    'ANY',        -- Any required approver can approve
    'ALL',        -- All required approvers must approve
    'SEQUENTIAL'  -- Must approve in specific order
  )),

  -- Current state
  current_step INTEGER DEFAULT 1,
  workflow_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (workflow_status IN (
    'PENDING', 'IN_PROGRESS', 'APPROVED', 'REJECTED', 'CANCELLED', 'ESCALATED'
  )),

  -- Escalation
  escalation_path VARCHAR(255)[],         -- Chain of escalation roles
  escalated_to VARCHAR(255),
  escalation_reason TEXT,
  escalated_at TIMESTAMPTZ,

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Individual approval steps
CREATE TABLE warrant_approval_steps (
  step_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES warrant_approval_workflow(workflow_id) ON DELETE CASCADE,

  step_number INTEGER NOT NULL,
  approver_role VARCHAR(100) NOT NULL,
  approver_user_id VARCHAR(255),

  step_status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (step_status IN (
    'PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'
  )),

  decision_reason TEXT,
  decision_timestamp TIMESTAMPTZ,

  -- Audit
  ip_address INET,
  user_agent TEXT
);

-- Indexes
CREATE INDEX idx_approval_workflow_warrant ON warrant_approval_workflow(warrant_id);
CREATE INDEX idx_approval_workflow_status ON warrant_approval_workflow(workflow_status)
  WHERE workflow_status IN ('PENDING', 'IN_PROGRESS');
CREATE INDEX idx_approval_steps_workflow ON warrant_approval_steps(workflow_id, step_number);

-- ============================================================================
-- 6. WARRANT COMPLIANCE VIEWS
-- ============================================================================

-- Materialized view for fast compliance reporting
CREATE MATERIALIZED VIEW mv_warrant_compliance_summary AS
SELECT
  w.tenant_id,
  w.warrant_type,
  w.status,
  COUNT(*) as warrant_count,
  COUNT(*) FILTER (WHERE w.expiry_date < NOW()) as expired_count,
  COUNT(*) FILTER (WHERE w.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '30 days') as expiring_soon_count,
  COUNT(*) FILTER (WHERE wul.authorization_decision = 'DENY') as denied_access_count,
  MAX(wul.accessed_at) as last_used_at
FROM warrants w
LEFT JOIN warrant_usage_log wul ON w.warrant_id = wul.warrant_id
GROUP BY w.tenant_id, w.warrant_type, w.status;

CREATE UNIQUE INDEX idx_mv_warrant_compliance_pk
  ON mv_warrant_compliance_summary(tenant_id, warrant_type, status);

-- Refresh function (call from cron job)
CREATE OR REPLACE FUNCTION refresh_warrant_compliance_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_warrant_compliance_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Check if warrant is valid for given action
CREATE OR REPLACE FUNCTION is_warrant_valid(
  p_warrant_id UUID,
  p_action VARCHAR(50),
  p_resource_type VARCHAR(100) DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_warrant RECORD;
BEGIN
  SELECT * INTO v_warrant
  FROM warrants
  WHERE warrant_id = p_warrant_id;

  -- Warrant must exist
  IF v_warrant IS NULL THEN
    RETURN false;
  END IF;

  -- Must be active
  IF v_warrant.status != 'ACTIVE' THEN
    RETURN false;
  END IF;

  -- Check expiry
  IF v_warrant.expiry_date IS NOT NULL AND v_warrant.expiry_date < NOW() THEN
    RETURN false;
  END IF;

  -- Check if action is permitted
  IF NOT p_action = ANY(v_warrant.permitted_actions) THEN
    RETURN false;
  END IF;

  -- Check resource type if specified
  IF p_resource_type IS NOT NULL THEN
    IF v_warrant.target_data_types IS NOT NULL THEN
      IF NOT p_resource_type = ANY(v_warrant.target_data_types) THEN
        RETURN false;
      END IF;
    END IF;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get active warrant for resource
CREATE OR REPLACE FUNCTION get_active_warrant_for_resource(
  p_tenant_id VARCHAR(255),
  p_resource_type VARCHAR(100),
  p_resource_id VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
  v_warrant_id UUID;
BEGIN
  SELECT wb.warrant_id INTO v_warrant_id
  FROM warrant_bindings wb
  JOIN warrants w ON wb.warrant_id = w.warrant_id
  WHERE wb.tenant_id = p_tenant_id
    AND wb.resource_type = p_resource_type
    AND wb.resource_id = p_resource_id
    AND wb.binding_status = 'ACTIVE'
    AND w.status = 'ACTIVE'
    AND (w.expiry_date IS NULL OR w.expiry_date > NOW())
  LIMIT 1;

  RETURN v_warrant_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. ROW-LEVEL SECURITY (Optional - enable per tenant requirements)
-- ============================================================================

-- Enable RLS on warrants table
ALTER TABLE warrants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see warrants for their tenant
CREATE POLICY warrants_tenant_isolation ON warrants
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Policy: Platform admins can see all warrants
CREATE POLICY warrants_platform_admin ON warrants
  FOR ALL
  USING (
    current_setting('app.current_user_role', true) = 'PLATFORM_ADMIN'
  );

-- Same for warrant_bindings
ALTER TABLE warrant_bindings ENABLE ROW LEVEL SECURITY;

CREATE POLICY warrant_bindings_tenant_isolation ON warrant_bindings
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- ============================================================================
-- 9. GRANTS (adjust based on your role structure)
-- ============================================================================

-- Grant read access to application role
-- GRANT SELECT ON warrants, warrant_bindings, warrant_usage_log TO intelgraph_app;
-- GRANT INSERT, UPDATE ON warrants, warrant_bindings TO intelgraph_app;
-- GRANT INSERT ON warrant_usage_log TO intelgraph_app;

-- ============================================================================
-- 10. SAMPLE DATA (for development/testing only)
-- ============================================================================

-- Example: Active search warrant
INSERT INTO warrants (
  tenant_id, warrant_number, warrant_type, issuing_authority,
  jurisdiction, legal_basis, scope, scope_description,
  permitted_actions, issued_date, effective_date, expiry_date,
  status, created_by
) VALUES (
  'tenant-001',
  'SW-2025-12345',
  'WARRANT',
  'District Court of Eastern District',
  'US-Federal',
  '18 U.S.C. § 2703 - Stored Communications Act',
  '["entity:person:John_Doe", "entity:organization:ACME_Corp"]'::JSONB,
  'Search warrant for communications and financial records related to fraud investigation',
  ARRAY['READ', 'QUERY', 'EXPORT'],
  '2025-01-01 09:00:00+00',
  '2025-01-01 09:00:00+00',
  '2025-06-01 23:59:59+00',
  'ACTIVE',
  'admin@example.com'
);

-- ============================================================================
-- Migration complete
-- ============================================================================
