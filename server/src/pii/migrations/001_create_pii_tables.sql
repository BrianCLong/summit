-- Migration: Create PII Detection and Sensitivity Metadata Tables
-- Version: 001
-- Description: Initial setup for PII detection system

-- ============================================================================
-- 1. Catalog Sensitivity Metadata Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS catalog_sensitivity (
  id SERIAL PRIMARY KEY,
  catalog_id VARCHAR(255) UNIQUE NOT NULL,
  catalog_type VARCHAR(50) NOT NULL CHECK (catalog_type IN ('table', 'column', 'dataset', 'service', 'api')),
  fully_qualified_name VARCHAR(500) NOT NULL,

  -- Sensitivity metadata
  sensitivity_class VARCHAR(50) NOT NULL CHECK (sensitivity_class IN ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'HIGHLY_SENSITIVE', 'TOP_SECRET')),
  pii_types JSONB DEFAULT '[]'::jsonb,
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  regulatory_tags JSONB DEFAULT '[]'::jsonb,
  policy_tags JSONB DEFAULT '[]'::jsonb,

  -- Access control
  min_clearance INTEGER DEFAULT 0 CHECK (min_clearance >= 0 AND min_clearance <= 10),
  requires_step_up BOOLEAN DEFAULT FALSE,
  requires_purpose BOOLEAN DEFAULT FALSE,
  max_export_records INTEGER DEFAULT 1000,

  -- Retention policy
  retention_days_min INTEGER DEFAULT 0,
  retention_days_max INTEGER DEFAULT 2555,
  encryption_required BOOLEAN DEFAULT FALSE,
  encryption_method VARCHAR(50),

  -- Lineage
  sensitivity_source VARCHAR(100) DEFAULT 'pii-detector',
  sensitivity_detected_at TIMESTAMP DEFAULT NOW(),
  sensitivity_last_validated TIMESTAMP,
  sensitivity_validated_by VARCHAR(100),

  -- Scan status
  last_scanned TIMESTAMP DEFAULT NOW(),
  scan_status VARCHAR(20) DEFAULT 'pending' CHECK (scan_status IN ('pending', 'completed', 'failed', 'skipped')),
  scan_error TEXT,

  -- Field-level sensitivity (for tables/schemas)
  field_sensitivity JSONB DEFAULT '{}'::jsonb,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for catalog_sensitivity
CREATE INDEX IF NOT EXISTS idx_catalog_sensitivity_class
  ON catalog_sensitivity(sensitivity_class);

CREATE INDEX IF NOT EXISTS idx_catalog_type
  ON catalog_sensitivity(catalog_type);

CREATE INDEX IF NOT EXISTS idx_catalog_severity
  ON catalog_sensitivity(severity);

CREATE INDEX IF NOT EXISTS idx_catalog_clearance
  ON catalog_sensitivity(min_clearance);

CREATE INDEX IF NOT EXISTS idx_catalog_fqn
  ON catalog_sensitivity(fully_qualified_name);

CREATE INDEX IF NOT EXISTS idx_catalog_scan_status
  ON catalog_sensitivity(scan_status);

-- GIN indexes for JSONB columns
CREATE INDEX IF NOT EXISTS idx_catalog_pii_types
  ON catalog_sensitivity USING GIN(pii_types);

CREATE INDEX IF NOT EXISTS idx_catalog_regulatory_tags
  ON catalog_sensitivity USING GIN(regulatory_tags);

CREATE INDEX IF NOT EXISTS idx_catalog_field_sensitivity
  ON catalog_sensitivity USING GIN(field_sensitivity);

-- ============================================================================
-- 2. PII Detection History (Audit Trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS pii_detection_history (
  id SERIAL PRIMARY KEY,
  catalog_id VARCHAR(255) NOT NULL,
  record_id VARCHAR(255),

  -- Detection details
  pii_type VARCHAR(100) NOT NULL,
  value_hash VARCHAR(64), -- SHA-256 hash of detected value
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Context
  field_path TEXT,
  detector_used VARCHAR(100),
  schema_hint VARCHAR(255),

  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),

  -- Foreign key
  CONSTRAINT fk_catalog
    FOREIGN KEY (catalog_id)
    REFERENCES catalog_sensitivity(catalog_id)
    ON DELETE CASCADE
);

-- Indexes for pii_detection_history
CREATE INDEX IF NOT EXISTS idx_detection_catalog_id
  ON pii_detection_history(catalog_id);

CREATE INDEX IF NOT EXISTS idx_detection_pii_type
  ON pii_detection_history(pii_type);

CREATE INDEX IF NOT EXISTS idx_detection_severity
  ON pii_detection_history(severity);

CREATE INDEX IF NOT EXISTS idx_detection_timestamp
  ON pii_detection_history(detected_at DESC);

-- ============================================================================
-- 3. Redaction Audit Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS redaction_audit_log (
  id SERIAL PRIMARY KEY,

  -- User context
  user_id VARCHAR(255) NOT NULL,
  user_role VARCHAR(50),
  user_clearance INTEGER,

  -- Access details
  action VARCHAR(50) NOT NULL CHECK (action IN ('DATA_ACCESS', 'EXPORT', 'ACCESS_DENIED', 'QUERY')),
  resource_id VARCHAR(255),
  catalog_id VARCHAR(255),

  -- Redaction details
  fields_redacted JSONB DEFAULT '[]'::jsonb,
  redaction_count INTEGER DEFAULT 0,
  dlp_rules JSONB DEFAULT '[]'::jsonb,

  -- Context
  purpose VARCHAR(100),
  step_up_token VARCHAR(255),
  approval_token VARCHAR(255),

  -- Result
  access_granted BOOLEAN DEFAULT TRUE,
  denial_reason TEXT,

  -- Metadata
  ip_address INET,
  user_agent TEXT,
  request_metadata JSONB,

  -- Timestamp
  accessed_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for redaction_audit_log
CREATE INDEX IF NOT EXISTS idx_audit_user_id
  ON redaction_audit_log(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_action
  ON redaction_audit_log(action);

CREATE INDEX IF NOT EXISTS idx_audit_timestamp
  ON redaction_audit_log(accessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_catalog_id
  ON redaction_audit_log(catalog_id);

CREATE INDEX IF NOT EXISTS idx_audit_access_granted
  ON redaction_audit_log(access_granted);

-- GIN indexes for JSONB
CREATE INDEX IF NOT EXISTS idx_audit_fields_redacted
  ON redaction_audit_log USING GIN(fields_redacted);

CREATE INDEX IF NOT EXISTS idx_audit_dlp_rules
  ON redaction_audit_log USING GIN(dlp_rules);

-- ============================================================================
-- 4. Trigger Functions
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_catalog_sensitivity_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update timestamp
DROP TRIGGER IF EXISTS catalog_sensitivity_update_timestamp ON catalog_sensitivity;
CREATE TRIGGER catalog_sensitivity_update_timestamp
  BEFORE UPDATE ON catalog_sensitivity
  FOR EACH ROW
  EXECUTE FUNCTION update_catalog_sensitivity_timestamp();

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to check if user has clearance for catalog item
CREATE OR REPLACE FUNCTION has_clearance(
  p_catalog_id VARCHAR(255),
  p_user_clearance INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_required_clearance INTEGER;
BEGIN
  SELECT min_clearance INTO v_required_clearance
  FROM catalog_sensitivity
  WHERE catalog_id = p_catalog_id;

  IF NOT FOUND THEN
    RETURN TRUE; -- No sensitivity metadata, allow access
  END IF;

  RETURN p_user_clearance >= v_required_clearance;
END;
$$ LANGUAGE plpgsql;

-- Function to get sensitive catalog items
CREATE OR REPLACE FUNCTION get_sensitive_catalogs(
  p_sensitivity_class VARCHAR(50) DEFAULT NULL,
  p_min_clearance INTEGER DEFAULT NULL
) RETURNS TABLE (
  catalog_id VARCHAR(255),
  fully_qualified_name VARCHAR(500),
  sensitivity_class VARCHAR(50),
  min_clearance INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.catalog_id,
    cs.fully_qualified_name,
    cs.sensitivity_class,
    cs.min_clearance
  FROM catalog_sensitivity cs
  WHERE
    (p_sensitivity_class IS NULL OR cs.sensitivity_class = p_sensitivity_class)
    AND (p_min_clearance IS NULL OR cs.min_clearance >= p_min_clearance)
  ORDER BY cs.min_clearance DESC, cs.last_scanned DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. Sample Data (Optional - for testing)
-- ============================================================================

-- Uncomment to insert sample catalog entries
/*
INSERT INTO catalog_sensitivity (
  catalog_id,
  catalog_type,
  fully_qualified_name,
  sensitivity_class,
  pii_types,
  severity,
  regulatory_tags,
  min_clearance,
  requires_step_up,
  requires_purpose
) VALUES
(
  'test:users:table',
  'table',
  'test.public.users',
  'HIGHLY_SENSITIVE',
  '["email", "phoneNumber", "socialSecurityNumber"]'::jsonb,
  'high',
  '["GDPR", "CCPA"]'::jsonb,
  3,
  TRUE,
  TRUE
),
(
  'test:products:table',
  'table',
  'test.public.products',
  'PUBLIC',
  '[]'::jsonb,
  'low',
  '[]'::jsonb,
  0,
  FALSE,
  FALSE
);
*/

-- ============================================================================
-- 7. Views
-- ============================================================================

-- View for high-risk catalog items
CREATE OR REPLACE VIEW high_risk_catalog AS
SELECT
  catalog_id,
  fully_qualified_name,
  sensitivity_class,
  min_clearance,
  pii_types,
  regulatory_tags,
  last_scanned,
  scan_status
FROM catalog_sensitivity
WHERE
  sensitivity_class IN ('HIGHLY_SENSITIVE', 'TOP_SECRET')
  OR min_clearance >= 3
ORDER BY min_clearance DESC, last_scanned DESC;

-- View for recent PII detections
CREATE OR REPLACE VIEW recent_pii_detections AS
SELECT
  pdh.catalog_id,
  cs.fully_qualified_name,
  pdh.pii_type,
  pdh.severity,
  pdh.field_path,
  pdh.detected_at
FROM pii_detection_history pdh
JOIN catalog_sensitivity cs ON pdh.catalog_id = cs.catalog_id
WHERE pdh.detected_at >= NOW() - INTERVAL '30 days'
ORDER BY pdh.detected_at DESC
LIMIT 100;

-- View for access denials
CREATE OR REPLACE VIEW access_denials AS
SELECT
  user_id,
  user_role,
  user_clearance,
  action,
  resource_id,
  denial_reason,
  accessed_at
FROM redaction_audit_log
WHERE access_granted = FALSE
ORDER BY accessed_at DESC
LIMIT 100;

-- ============================================================================
-- 8. Grants (Adjust based on your user roles)
-- ============================================================================

-- Grant read access to application user
-- GRANT SELECT ON catalog_sensitivity TO summit_app_user;
-- GRANT SELECT ON pii_detection_history TO summit_app_user;
-- GRANT SELECT ON redaction_audit_log TO summit_app_user;

-- Grant write access for ingestion
-- GRANT INSERT, UPDATE ON catalog_sensitivity TO summit_app_user;
-- GRANT INSERT ON pii_detection_history TO summit_app_user;
-- GRANT INSERT ON redaction_audit_log TO summit_app_user;

-- ============================================================================
-- Migration Complete
-- ============================================================================

-- Verify tables were created
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('catalog_sensitivity', 'pii_detection_history', 'redaction_audit_log')
ORDER BY table_name;
