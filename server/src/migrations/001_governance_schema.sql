-- ============================================================================
-- Governance Schema Migration
-- Adds warrant management, access purposes, and enhanced audit capabilities
-- ============================================================================

-- ============================================================================
-- 1. WARRANTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS warrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_number TEXT NOT NULL UNIQUE,
  warrant_type TEXT NOT NULL CHECK (warrant_type IN ('search_warrant', 'subpoena', 'court_order', 'consent', 'administrative')),
  issuing_authority TEXT NOT NULL,
  issued_date TIMESTAMPTZ NOT NULL,
  expiry_date TIMESTAMPTZ,
  jurisdiction TEXT NOT NULL,
  scope_description TEXT NOT NULL,
  scope_constraints JSONB DEFAULT '{}'::jsonb,
  tenant_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'superseded')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(warrant_number, '') || ' ' ||
      coalesce(issuing_authority, '') || ' ' ||
      coalesce(scope_description, '')
    )
  ) STORED,

  -- Constraints
  CONSTRAINT valid_expiry_date CHECK (expiry_date IS NULL OR expiry_date > issued_date)
);

CREATE INDEX IF NOT EXISTS idx_warrants_tenant ON warrants(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warrants_status ON warrants(status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_warrants_expiry ON warrants(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warrants_issued_date ON warrants(issued_date DESC);
CREATE INDEX IF NOT EXISTS idx_warrants_search ON warrants USING gin(search_vector);
CREATE INDEX IF NOT EXISTS idx_warrants_type ON warrants(warrant_type);
CREATE INDEX IF NOT EXISTS idx_warrants_jurisdiction ON warrants(jurisdiction);

COMMENT ON TABLE warrants IS 'Legal warrants and authorities for data access';
COMMENT ON COLUMN warrants.scope_constraints IS 'JSON object with resourceTypes, allowedOperations, timeRange, purposes';

-- ============================================================================
-- 2. WARRANT USAGE TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS warrant_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warrant_id UUID NOT NULL REFERENCES warrants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  operation TEXT NOT NULL,
  purpose TEXT NOT NULL,
  reason_for_access TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  audit_event_id UUID,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,

  -- Outcome
  access_granted BOOLEAN NOT NULL,
  denial_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_warrant_usage_warrant ON warrant_usage(warrant_id);
CREATE INDEX IF NOT EXISTS idx_warrant_usage_tenant ON warrant_usage(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warrant_usage_user ON warrant_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_warrant_usage_timestamp ON warrant_usage(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_warrant_usage_resource ON warrant_usage(resource_type, resource_id);

COMMENT ON TABLE warrant_usage IS 'Tracks every use of a warrant for audit trail';

-- ============================================================================
-- 3. ACCESS PURPOSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purpose_code TEXT NOT NULL UNIQUE,
  purpose_name TEXT NOT NULL,
  description TEXT,
  requires_warrant BOOLEAN DEFAULT false,
  requires_approval BOOLEAN DEFAULT false,
  approval_roles TEXT[] DEFAULT ARRAY[]::TEXT[],
  retention_days INT DEFAULT 2555,
  allowed_operations TEXT[] DEFAULT ARRAY['read']::TEXT[],
  max_data_sensitivity TEXT, -- Max sensitivity level allowed for this purpose
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_purposes_code ON access_purposes(purpose_code) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_access_purposes_requires_warrant ON access_purposes(requires_warrant) WHERE requires_warrant = true;

COMMENT ON TABLE access_purposes IS 'Defines valid purposes for data access and their constraints';

-- Pre-populate with standard purposes
INSERT INTO access_purposes (purpose_code, purpose_name, description, requires_warrant, requires_approval, retention_days, allowed_operations, max_data_sensitivity) VALUES
  ('investigation', 'Criminal Investigation', 'Access for active criminal investigation', true, true, 2555, ARRAY['read', 'export'], 'top_secret'),
  ('threat_intel', 'Threat Intelligence', 'Threat intelligence gathering and analysis', false, true, 365, ARRAY['read'], 'restricted'),
  ('compliance', 'Compliance Review', 'Compliance and regulatory review', false, true, 2555, ARRAY['read', 'export'], 'restricted'),
  ('audit', 'System Audit', 'Internal security and system audit', false, false, 2555, ARRAY['read'], 'confidential'),
  ('incident_response', 'Incident Response', 'Security incident response', false, true, 365, ARRAY['read', 'write'], 'restricted'),
  ('training', 'Training/Testing', 'Training and system testing with anonymized data', false, false, 30, ARRAY['read'], 'internal'),
  ('analytics', 'Data Analytics', 'Aggregated analytics and reporting', false, false, 365, ARRAY['read'], 'internal'),
  ('maintenance', 'System Maintenance', 'System maintenance and troubleshooting', false, true, 90, ARRAY['read'], 'internal')
ON CONFLICT (purpose_code) DO NOTHING;

-- ============================================================================
-- 4. ACCESS REQUESTS (for appeal system)
-- ============================================================================

CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_user_id TEXT NOT NULL,
  requester_tenant_id TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  requested_purpose TEXT NOT NULL,
  justification TEXT NOT NULL,
  requested_operations TEXT[] NOT NULL,
  requested_sensitivity TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied', 'expired')),
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- Approval details (if approved)
  approval_expires_at TIMESTAMPTZ,
  granted_warrant_id UUID REFERENCES warrants(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_access_requests_requester ON access_requests(requester_user_id, requester_tenant_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_access_requests_created ON access_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_access_requests_resource ON access_requests(resource_type, resource_id);

COMMENT ON TABLE access_requests IS 'Access request and appeal system';

-- ============================================================================
-- 5. ENHANCED AUDIT EVENTS (if not already created by advanced-audit-system)
-- ============================================================================

-- Add governance columns to existing audit_events table if they don't exist
DO $$
BEGIN
  -- Check if governance columns exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'audit_events' AND column_name = 'purpose') THEN

    ALTER TABLE audit_events ADD COLUMN purpose TEXT;
    ALTER TABLE audit_events ADD COLUMN legal_basis TEXT[];
    ALTER TABLE audit_events ADD COLUMN warrant_id UUID REFERENCES warrants(id);
    ALTER TABLE audit_events ADD COLUMN reason_for_access TEXT;
    ALTER TABLE audit_events ADD COLUMN policy_decision JSONB;
    ALTER TABLE audit_events ADD COLUMN resource_policy_tags JSONB;
    ALTER TABLE audit_events ADD COLUMN appeal_available BOOLEAN DEFAULT false;
    ALTER TABLE audit_events ADD COLUMN appeal_contact TEXT;

    CREATE INDEX idx_audit_events_warrant ON audit_events(warrant_id) WHERE warrant_id IS NOT NULL;
    CREATE INDEX idx_audit_events_purpose ON audit_events(purpose) WHERE purpose IS NOT NULL;

    COMMENT ON COLUMN audit_events.purpose IS 'Purpose for accessing the resource';
    COMMENT ON COLUMN audit_events.legal_basis IS 'Legal basis for access (e.g., court_order, consent)';
    COMMENT ON COLUMN audit_events.warrant_id IS 'Associated warrant if applicable';
    COMMENT ON COLUMN audit_events.reason_for_access IS 'User-provided justification';
    COMMENT ON COLUMN audit_events.policy_decision IS 'OPA policy decision details';
  END IF;
END $$;

-- ============================================================================
-- 6. POLICY TAG METADATA (PostgreSQL cache for Neo4j tags)
-- ============================================================================

CREATE TABLE IF NOT EXISTS policy_tag_metadata (
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,

  -- Policy tags
  policy_origin TEXT,
  policy_sensitivity TEXT,
  policy_legal_basis TEXT[],
  policy_purpose TEXT[],
  policy_data_classification TEXT,
  policy_retention_days INT,
  policy_source_warrant UUID REFERENCES warrants(id),
  policy_collection_date TIMESTAMPTZ,
  policy_expiry_date TIMESTAMPTZ,
  policy_jurisdiction TEXT,

  -- Access tracking
  policy_access_count INT DEFAULT 0,
  policy_last_accessed TIMESTAMPTZ,
  policy_owner TEXT,

  -- PII flags
  policy_pii_flags JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (resource_type, resource_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_policy_tags_tenant ON policy_tag_metadata(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policy_tags_sensitivity ON policy_tag_metadata(policy_sensitivity);
CREATE INDEX IF NOT EXISTS idx_policy_tags_expiry ON policy_tag_metadata(policy_expiry_date) WHERE policy_expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_policy_tags_warrant ON policy_tag_metadata(policy_source_warrant) WHERE policy_source_warrant IS NOT NULL;

COMMENT ON TABLE policy_tag_metadata IS 'Cached policy tags from Neo4j for quick lookups';

-- ============================================================================
-- 7. DATA RETENTION POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS data_retention_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name TEXT NOT NULL,
  resource_types TEXT[] NOT NULL,
  data_classifications TEXT[],
  sensitivity_levels TEXT[],
  retention_days INT NOT NULL,
  legal_hold_override BOOLEAN DEFAULT false,
  auto_delete_enabled BOOLEAN DEFAULT false,
  tenant_id TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_policies_tenant ON data_retention_policies(tenant_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_retention_policies_resource_types ON data_retention_policies USING gin(resource_types);

COMMENT ON TABLE data_retention_policies IS 'Automated data retention and deletion policies';

-- ============================================================================
-- 8. FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to auto-expire warrants
CREATE OR REPLACE FUNCTION auto_expire_warrants()
RETURNS void AS $$
BEGIN
  UPDATE warrants
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active'
  AND expiry_date IS NOT NULL
  AND expiry_date < NOW();
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION auto_expire_warrants IS 'Automatically expire warrants past their expiry date';

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DO $$
DECLARE
  table_name TEXT;
BEGIN
  FOR table_name IN
    SELECT unnest(ARRAY['warrants', 'access_purposes', 'access_requests',
                        'policy_tag_metadata', 'data_retention_policies'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS update_%I_updated_at ON %I;
        CREATE TRIGGER update_%I_updated_at
          BEFORE UPDATE ON %I
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
      ', table_name, table_name, table_name, table_name);
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 9. VIEWS FOR REPORTING
-- ============================================================================

-- Active warrants view
CREATE OR REPLACE VIEW active_warrants_v AS
SELECT
  w.*,
  COUNT(wu.id) as usage_count,
  MAX(wu.timestamp) as last_used
FROM warrants w
LEFT JOIN warrant_usage wu ON wu.warrant_id = w.id
WHERE w.status = 'active'
GROUP BY w.id;

COMMENT ON VIEW active_warrants_v IS 'Active warrants with usage statistics';

-- Pending access requests view
CREATE OR REPLACE VIEW pending_access_requests_v AS
SELECT
  ar.*,
  ap.requires_warrant,
  ap.requires_approval,
  ap.approval_roles
FROM access_requests ar
JOIN access_purposes ap ON ap.purpose_code = ar.requested_purpose
WHERE ar.status = 'pending'
ORDER BY ar.created_at ASC;

COMMENT ON VIEW pending_access_requests_v IS 'Pending access requests with approval requirements';

-- ============================================================================
-- 10. SCHEDULED JOBS (for pg_cron if available)
-- ============================================================================

-- Expire old warrants daily
-- Requires pg_cron extension
-- SELECT cron.schedule('expire-warrants', '0 2 * * *', 'SELECT auto_expire_warrants()');

-- ============================================================================
-- 11. GRANTS (adjust based on your roles)
-- ============================================================================

-- Grant permissions to application roles
DO $$
BEGIN
  -- If roles exist, grant permissions
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    GRANT SELECT, INSERT ON warrants TO app_user;
    GRANT SELECT, INSERT ON warrant_usage TO app_user;
    GRANT SELECT ON access_purposes TO app_user;
    GRANT SELECT, INSERT, UPDATE ON access_requests TO app_user;
    GRANT SELECT ON policy_tag_metadata TO app_user;
    GRANT SELECT ON data_retention_policies TO app_user;
    GRANT SELECT ON active_warrants_v TO app_user;
    GRANT SELECT ON pending_access_requests_v TO app_user;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
    GRANT ALL ON warrants TO app_admin;
    GRANT ALL ON warrant_usage TO app_admin;
    GRANT ALL ON access_purposes TO app_admin;
    GRANT ALL ON access_requests TO app_admin;
    GRANT ALL ON policy_tag_metadata TO app_admin;
    GRANT ALL ON data_retention_policies TO app_admin;
    GRANT ALL ON active_warrants_v TO app_admin;
    GRANT ALL ON pending_access_requests_v TO app_admin;
  END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Log migration
DO $$
BEGIN
  RAISE NOTICE 'Governance schema migration completed successfully';
  RAISE NOTICE 'Created tables: warrants, warrant_usage, access_purposes, access_requests, policy_tag_metadata, data_retention_policies';
  RAISE NOTICE 'Created views: active_warrants_v, pending_access_requests_v';
  RAISE NOTICE 'Pre-populated 8 access purposes';
END $$;
