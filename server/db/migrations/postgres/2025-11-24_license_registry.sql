-- Migration: License Registry and Enforcement
-- Date: 2025-11-24
-- Purpose: Implement comprehensive data license tracking, inheritance, and enforcement
--          for TOS compliance and data sharing restrictions

-- ============================================================================
-- 1. LICENSE REGISTRY
-- ============================================================================

-- Central registry of all data licenses
CREATE TABLE licenses (
  license_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- License identification
  license_key VARCHAR(255) NOT NULL,      -- Unique identifier (e.g., 'CC-BY-SA-4.0')
  license_name VARCHAR(255) NOT NULL,
  license_version VARCHAR(50),
  license_family VARCHAR(100),            -- 'Creative Commons', 'Proprietary', 'Open Data'

  -- License type classification
  license_type VARCHAR(50) NOT NULL CHECK (license_type IN (
    'INTERNAL_ONLY',    -- Cannot be shared externally
    'RELEASABLE',       -- Can be shared with authorized parties
    'ORCON',            -- Originator Controlled
    'NOFORN',           -- No Foreign Nationals
    'PROPIN',           -- Proprietary Information
    'PUBLIC',           -- Publicly releasable
    'CUSTOM'            -- Custom terms
  )),

  -- Permissions granted by license
  permissions JSONB NOT NULL DEFAULT '{
    "read": true,
    "copy": false,
    "modify": false,
    "distribute": false,
    "commercialUse": false,
    "createDerivatives": false
  }'::JSONB,

  -- Restrictions imposed by license
  restrictions JSONB NOT NULL DEFAULT '{
    "attribution": false,
    "shareAlike": false,
    "nonCommercial": false,
    "noDerivatives": false,
    "timeLimited": false,
    "geographicLimited": false
  }'::JSONB,

  -- Compatibility rules
  compatible_licenses UUID[],             -- Licenses this can be combined with
  incompatible_licenses UUID[],           -- Licenses that conflict
  derivative_license_policy VARCHAR(50) CHECK (derivative_license_policy IN (
    'SAME_LICENSE',      -- Derivatives must use same license
    'COMPATIBLE_ONLY',   -- Must use compatible license
    'ANY',              -- Any license allowed for derivatives
    'PROHIBITED'        -- No derivatives allowed
  )),

  -- Terms and conditions
  terms_url TEXT,
  full_text TEXT,
  summary TEXT,

  -- Compliance requirements
  requires_attribution BOOLEAN DEFAULT false,
  attribution_text TEXT,
  requires_notice BOOLEAN DEFAULT false,
  notice_text TEXT,
  requires_signature BOOLEAN DEFAULT false,

  -- Export controls
  export_controlled BOOLEAN DEFAULT false,
  export_control_classification VARCHAR(100), -- 'ITAR', 'EAR', etc.
  permitted_countries VARCHAR(10)[],          -- ISO country codes
  prohibited_countries VARCHAR(10)[],

  -- Temporal validity
  effective_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expiry_date TIMESTAMPTZ,
  auto_renew BOOLEAN DEFAULT false,

  -- Status
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN (
    'DRAFT', 'ACTIVE', 'SUSPENDED', 'REVOKED', 'EXPIRED', 'SUPERSEDED'
  )),
  superseded_by_license_id UUID REFERENCES licenses(license_id),

  -- Audit
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by VARCHAR(255),
  updated_at TIMESTAMPTZ,

  -- Metadata
  tags VARCHAR(100)[],
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX idx_licenses_tenant ON licenses(tenant_id);
CREATE INDEX idx_licenses_status ON licenses(status) WHERE status = 'ACTIVE';
CREATE INDEX idx_licenses_type ON licenses(license_type);
CREATE UNIQUE INDEX idx_licenses_tenant_key ON licenses(tenant_id, license_key);

-- ============================================================================
-- 2. DATA LICENSE ASSIGNMENTS
-- ============================================================================

-- Links licenses to specific data resources
CREATE TABLE data_license_assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID NOT NULL REFERENCES licenses(license_id),
  tenant_id VARCHAR(255) NOT NULL,

  -- Resource identification
  resource_type VARCHAR(100) NOT NULL,    -- 'entity', 'relationship', 'document', 'dataset'
  resource_id VARCHAR(255) NOT NULL,
  resource_metadata JSONB DEFAULT '{}'::JSONB,

  -- Assignment details
  assigned_by VARCHAR(255) NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assignment_reason TEXT,

  -- Inheritance rules
  applies_to_derivatives BOOLEAN DEFAULT true, -- Does license propagate to derived data?
  inheritance_depth INTEGER,                   -- NULL = unlimited, 0 = no inheritance, N = N levels

  -- Status
  assignment_status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE' CHECK (assignment_status IN (
    'ACTIVE', 'SUSPENDED', 'REVOKED'
  )),
  revoked_by VARCHAR(255),
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT
);

-- Indexes
CREATE INDEX idx_data_license_assignments_license ON data_license_assignments(license_id);
CREATE INDEX idx_data_license_assignments_resource ON data_license_assignments(resource_type, resource_id);
CREATE INDEX idx_data_license_assignments_tenant_status ON data_license_assignments(tenant_id, assignment_status);

-- Unique constraint: one active license per resource
CREATE UNIQUE INDEX idx_data_license_assignments_resource_unique
  ON data_license_assignments(resource_type, resource_id, tenant_id)
  WHERE assignment_status = 'ACTIVE';

-- ============================================================================
-- 3. LICENSE INHERITANCE TRACKING
-- ============================================================================

-- Tracks license propagation through data lineage
CREATE TABLE license_lineage (
  lineage_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Source (parent data)
  source_assignment_id UUID NOT NULL REFERENCES data_license_assignments(assignment_id),
  source_resource_type VARCHAR(100) NOT NULL,
  source_resource_id VARCHAR(255) NOT NULL,
  source_license_id UUID NOT NULL REFERENCES licenses(license_id),

  -- Derived (child data)
  derived_assignment_id UUID REFERENCES data_license_assignments(assignment_id),
  derived_resource_type VARCHAR(100) NOT NULL,
  derived_resource_id VARCHAR(255) NOT NULL,
  derived_license_id UUID REFERENCES licenses(license_id),

  -- Lineage tracking
  lineage_depth INTEGER NOT NULL DEFAULT 1,
  transformation_type VARCHAR(100),       -- 'query', 'aggregation', 'export', 'analysis'
  transformation_metadata JSONB DEFAULT '{}'::JSONB,

  -- Compatibility check
  compatibility_checked BOOLEAN DEFAULT false,
  compatibility_status VARCHAR(50) CHECK (compatibility_status IN (
    'COMPATIBLE', 'INCOMPATIBLE', 'REQUIRES_REVIEW', 'OVERRIDDEN'
  )),
  compatibility_reason TEXT,
  override_authority VARCHAR(255),        -- User who authorized incompatible combination

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL
);

-- Indexes
CREATE INDEX idx_license_lineage_source ON license_lineage(source_resource_type, source_resource_id);
CREATE INDEX idx_license_lineage_derived ON license_lineage(derived_resource_type, derived_resource_id);
CREATE INDEX idx_license_lineage_tenant ON license_lineage(tenant_id);

-- ============================================================================
-- 4. TOS ACCEPTANCE TRACKING
-- ============================================================================

-- Tracks user acceptance of Terms of Service and license agreements
CREATE TABLE tos_acceptances (
  acceptance_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- User information
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  user_role VARCHAR(100),

  -- TOS details
  tos_version VARCHAR(50) NOT NULL,
  tos_type VARCHAR(50) NOT NULL CHECK (tos_type IN (
    'PLATFORM_TOS',      -- Platform-wide terms
    'DATA_LICENSE',      -- Specific data license
    'EXPORT_TERMS',      -- Export agreement
    'NDA',               -- Non-disclosure agreement
    'DUA',               -- Data Use Agreement
    'PRIVACY_POLICY'     -- Privacy policy
  )),
  tos_content_hash VARCHAR(64) NOT NULL, -- SHA-256 of accepted terms

  -- Acceptance metadata
  acceptance_method VARCHAR(50) NOT NULL CHECK (acceptance_method IN (
    'CLICK_THROUGH',     -- Clicked "I Accept"
    'SIGNATURE',         -- Digital signature
    'IMPLICIT',          -- Implied by usage
    'CONTRACT'           -- Formal contract
  )),
  acceptance_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Related resources
  related_license_id UUID REFERENCES licenses(license_id),
  related_resource_type VARCHAR(100),
  related_resource_id VARCHAR(255),

  -- Validity
  valid_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ,                -- NULL = indefinite
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}'::JSONB
);

-- Indexes
CREATE INDEX idx_tos_acceptances_user ON tos_acceptances(user_id, acceptance_timestamp DESC);
CREATE INDEX idx_tos_acceptances_tenant ON tos_acceptances(tenant_id);
CREATE INDEX idx_tos_acceptances_tos_version ON tos_acceptances(tos_version, tos_type);
CREATE INDEX idx_tos_acceptances_valid ON tos_acceptances(user_id, tos_type, valid_from, valid_until)
  WHERE NOT revoked;

-- ============================================================================
-- 5. LICENSE ENFORCEMENT AUDIT
-- ============================================================================

-- Immutable log of all license enforcement decisions
CREATE TABLE license_enforcement_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Request context
  user_id VARCHAR(255) NOT NULL,
  user_email VARCHAR(255) NOT NULL,
  action VARCHAR(100) NOT NULL,           -- 'READ', 'EXPORT', 'MODIFY', 'DISTRIBUTE'
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,

  -- License evaluation
  applicable_licenses UUID[],             -- All licenses checked
  primary_license_id UUID REFERENCES licenses(license_id),
  license_decision VARCHAR(20) NOT NULL CHECK (license_decision IN (
    'ALLOW', 'DENY', 'ALLOW_WITH_CONDITIONS'
  )),
  decision_reason TEXT NOT NULL,

  -- Conditions imposed (if ALLOW_WITH_CONDITIONS)
  conditions JSONB DEFAULT '[]'::JSONB,   -- [{"type": "ATTRIBUTION", "text": "..."}]

  -- TOS validation
  tos_required BOOLEAN DEFAULT false,
  tos_accepted BOOLEAN,
  tos_acceptance_id UUID REFERENCES tos_acceptances(acceptance_id),

  -- Compliance checks
  export_control_checked BOOLEAN DEFAULT false,
  export_control_passed BOOLEAN,
  attribution_enforced BOOLEAN DEFAULT false,
  notice_displayed BOOLEAN DEFAULT false,

  -- Technical context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id UUID,

  -- Timestamp
  evaluated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit trail link
  audit_event_id UUID,                    -- Link to audit_events table
  provenance_event_id UUID                -- Link to event_store table
);

-- Indexes
CREATE INDEX idx_license_enforcement_tenant_time ON license_enforcement_log(tenant_id, evaluated_at DESC);
CREATE INDEX idx_license_enforcement_user ON license_enforcement_log(user_id, evaluated_at DESC);
CREATE INDEX idx_license_enforcement_decision ON license_enforcement_log(license_decision)
  WHERE license_decision = 'DENY';
CREATE INDEX idx_license_enforcement_license ON license_enforcement_log(primary_license_id);

-- Prevent modifications (immutability)
CREATE OR REPLACE FUNCTION prevent_license_enforcement_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'license_enforcement_log is immutable and cannot be modified';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_license_enforcement_update
  BEFORE UPDATE ON license_enforcement_log
  FOR EACH ROW EXECUTE FUNCTION prevent_license_enforcement_modification();

-- ============================================================================
-- 6. LICENSE COMPATIBILITY MATRIX
-- ============================================================================

-- Precomputed compatibility between license pairs
CREATE TABLE license_compatibility_matrix (
  compatibility_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  license_a_id UUID NOT NULL REFERENCES licenses(license_id),
  license_b_id UUID NOT NULL REFERENCES licenses(license_id),

  -- Compatibility assessment
  compatible BOOLEAN NOT NULL,
  compatibility_level VARCHAR(50) CHECK (compatibility_level IN (
    'FULLY_COMPATIBLE',   -- Can be freely combined
    'CONDITIONALLY',      -- Can be combined with restrictions
    'INCOMPATIBLE'        -- Cannot be combined
  )),

  -- Resulting license when combined
  combined_license_id UUID REFERENCES licenses(license_id),
  combination_rules JSONB DEFAULT '{}'::JSONB,

  -- Explanation
  compatibility_reason TEXT,
  legal_citation TEXT,

  -- Audit
  assessed_by VARCHAR(255) NOT NULL,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(255),
  review_date TIMESTAMPTZ
);

-- Indexes
CREATE INDEX idx_license_compat_licenses ON license_compatibility_matrix(license_a_id, license_b_id);
CREATE UNIQUE INDEX idx_license_compat_unique
  ON license_compatibility_matrix(
    LEAST(license_a_id::text, license_b_id::text)::uuid,
    GREATEST(license_a_id::text, license_b_id::text)::uuid
  );

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Check if action is permitted under license
CREATE OR REPLACE FUNCTION is_action_permitted_by_license(
  p_license_id UUID,
  p_action VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
BEGIN
  SELECT permissions INTO v_permissions
  FROM licenses
  WHERE license_id = p_license_id
    AND status = 'ACTIVE';

  IF v_permissions IS NULL THEN
    RETURN false;
  END IF;

  -- Map actions to permission keys
  CASE p_action
    WHEN 'READ', 'VIEW', 'QUERY' THEN
      RETURN (v_permissions->>'read')::boolean;
    WHEN 'COPY', 'DOWNLOAD' THEN
      RETURN (v_permissions->>'copy')::boolean;
    WHEN 'MODIFY', 'UPDATE' THEN
      RETURN (v_permissions->>'modify')::boolean;
    WHEN 'EXPORT', 'SHARE', 'DISTRIBUTE' THEN
      RETURN (v_permissions->>'distribute')::boolean;
    WHEN 'COMMERCIAL_USE' THEN
      RETURN (v_permissions->>'commercialUse')::boolean;
    WHEN 'CREATE_DERIVATIVES' THEN
      RETURN (v_permissions->>'createDerivatives')::boolean;
    ELSE
      RETURN false;
  END CASE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get active license for resource
CREATE OR REPLACE FUNCTION get_active_license_for_resource(
  p_tenant_id VARCHAR(255),
  p_resource_type VARCHAR(100),
  p_resource_id VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
  v_license_id UUID;
BEGIN
  SELECT dla.license_id INTO v_license_id
  FROM data_license_assignments dla
  JOIN licenses l ON dla.license_id = l.license_id
  WHERE dla.tenant_id = p_tenant_id
    AND dla.resource_type = p_resource_type
    AND dla.resource_id = p_resource_id
    AND dla.assignment_status = 'ACTIVE'
    AND l.status = 'ACTIVE'
    AND (l.expiry_date IS NULL OR l.expiry_date > NOW())
  LIMIT 1;

  RETURN v_license_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check TOS acceptance for user
CREATE OR REPLACE FUNCTION has_user_accepted_tos(
  p_user_id VARCHAR(255),
  p_tos_version VARCHAR(50),
  p_tos_type VARCHAR(50)
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM tos_acceptances
  WHERE user_id = p_user_id
    AND tos_version = p_tos_version
    AND tos_type = p_tos_type
    AND NOT revoked
    AND (valid_until IS NULL OR valid_until > NOW());

  RETURN v_count > 0;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check license compatibility
CREATE OR REPLACE FUNCTION are_licenses_compatible(
  p_license_a_id UUID,
  p_license_b_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_compatible BOOLEAN;
BEGIN
  SELECT compatible INTO v_compatible
  FROM license_compatibility_matrix
  WHERE (license_a_id = p_license_a_id AND license_b_id = p_license_b_id)
     OR (license_a_id = p_license_b_id AND license_b_id = p_license_a_id);

  -- If no entry exists, default to incompatible (fail-safe)
  RETURN COALESCE(v_compatible, false);
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 8. ROW-LEVEL SECURITY
-- ============================================================================

-- Enable RLS on licenses table
ALTER TABLE licenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY licenses_tenant_isolation ON licenses
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- Same for data_license_assignments
ALTER TABLE data_license_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY data_license_assignments_tenant_isolation ON data_license_assignments
  FOR ALL
  USING (tenant_id = current_setting('app.current_tenant_id', true));

-- ============================================================================
-- 9. SAMPLE DATA (for development/testing)
-- ============================================================================

-- Example: Internal only license
INSERT INTO licenses (
  tenant_id, license_key, license_name, license_type,
  permissions, restrictions, derivative_license_policy,
  requires_attribution, status, created_by
) VALUES (
  'tenant-001',
  'INTERNAL-ONLY-V1',
  'Internal Use Only',
  'INTERNAL_ONLY',
  '{"read": true, "copy": true, "modify": true, "distribute": false, "commercialUse": false, "createDerivatives": true}'::JSONB,
  '{"attribution": false, "shareAlike": false, "nonCommercial": true, "noDerivatives": false}'::JSONB,
  'SAME_LICENSE',
  false,
  'ACTIVE',
  'system'
);

-- Example: Creative Commons BY-SA
INSERT INTO licenses (
  tenant_id, license_key, license_name, license_version, license_family, license_type,
  permissions, restrictions, derivative_license_policy,
  requires_attribution, attribution_text, terms_url, status, created_by
) VALUES (
  'tenant-001',
  'CC-BY-SA-4.0',
  'Creative Commons Attribution-ShareAlike 4.0 International',
  '4.0',
  'Creative Commons',
  'PUBLIC',
  '{"read": true, "copy": true, "modify": true, "distribute": true, "commercialUse": true, "createDerivatives": true}'::JSONB,
  '{"attribution": true, "shareAlike": true, "nonCommercial": false, "noDerivatives": false}'::JSONB,
  'SAME_LICENSE',
  true,
  'Licensed under CC BY-SA 4.0',
  'https://creativecommons.org/licenses/by-sa/4.0/',
  'ACTIVE',
  'system'
);

-- ============================================================================
-- Migration complete
-- ============================================================================
