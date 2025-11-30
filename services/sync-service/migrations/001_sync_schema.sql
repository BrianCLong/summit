-- Sync Service Database Schema
-- Version: 1.0
-- Purpose: Support air-gapped data synchronization between core and edge deployments

-- ============================================================================
-- Sync Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) NOT NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('export', 'import', 'verify', 'sign')),
  actor VARCHAR(255) NOT NULL,
  actor_role VARCHAR(100),
  source_deployment VARCHAR(255) NOT NULL,
  target_deployment VARCHAR(255),
  scope JSONB NOT NULL,
  result VARCHAR(50) NOT NULL CHECK (result IN ('success', 'failure', 'partial')),
  statistics JSONB,
  errors JSONB DEFAULT '[]'::jsonb,
  reason TEXT NOT NULL,
  classification VARCHAR(50) NOT NULL,
  hash VARCHAR(64) NOT NULL,
  previous_hash VARCHAR(64),
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_audit_log_bundle_id ON sync_audit_log(bundle_id);
CREATE INDEX idx_sync_audit_log_operation ON sync_audit_log(operation);
CREATE INDEX idx_sync_audit_log_actor ON sync_audit_log(actor);
CREATE INDEX idx_sync_audit_log_timestamp ON sync_audit_log(timestamp DESC);
CREATE INDEX idx_sync_audit_log_classification ON sync_audit_log(classification);

COMMENT ON TABLE sync_audit_log IS 'Audit trail for all sync operations with merkle chain integrity';
COMMENT ON COLUMN sync_audit_log.hash IS 'SHA-256 hash of this record';
COMMENT ON COLUMN sync_audit_log.previous_hash IS 'Hash of previous record for chain integrity';

-- ============================================================================
-- Sync Operations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('export', 'import')),
  direction VARCHAR(50) NOT NULL CHECK (direction IN ('push_up', 'pull_down')),
  status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'aborted')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  initiated_by VARCHAR(255) NOT NULL,
  initiated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  errors JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_operations_bundle_id ON sync_operations(bundle_id);
CREATE INDEX idx_sync_operations_status ON sync_operations(status);
CREATE INDEX idx_sync_operations_initiated_by ON sync_operations(initiated_by);
CREATE INDEX idx_sync_operations_initiated_at ON sync_operations(initiated_at DESC);

COMMENT ON TABLE sync_operations IS 'Tracking table for ongoing and completed sync operations';

-- ============================================================================
-- Sync Conflicts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'duplicate_id',
    'version_mismatch',
    'classification_mismatch',
    'tenant_mismatch',
    'data_corruption',
    'permission_denied'
  )),
  resource_type VARCHAR(50) NOT NULL CHECK (resource_type IN (
    'case',
    'entity',
    'relationship',
    'evidence',
    'analytic'
  )),
  resource_id VARCHAR(255) NOT NULL,
  existing_data JSONB NOT NULL,
  incoming_data JSONB NOT NULL,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution VARCHAR(50) CHECK (resolution IN ('overwritten', 'merged', 'skipped', 'manual')),
  resolved_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_conflicts_bundle_id ON sync_conflicts(bundle_id);
CREATE INDEX idx_sync_conflicts_type ON sync_conflicts(type);
CREATE INDEX idx_sync_conflicts_resource_type ON sync_conflicts(resource_type);
CREATE INDEX idx_sync_conflicts_resource_id ON sync_conflicts(resource_id);
CREATE INDEX idx_sync_conflicts_resolved_at ON sync_conflicts(resolved_at);

COMMENT ON TABLE sync_conflicts IS 'Tracks data conflicts encountered during imports with resolution tracking';

-- ============================================================================
-- Bundle Metadata Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_bundles (
  id VARCHAR(255) PRIMARY KEY,
  version VARCHAR(50) NOT NULL,
  direction VARCHAR(50) NOT NULL CHECK (direction IN ('push_up', 'pull_down')),
  source_deployment_id VARCHAR(255) NOT NULL,
  source_deployment_name VARCHAR(255) NOT NULL,
  source_environment VARCHAR(50) NOT NULL CHECK (source_environment IN ('core', 'edge')),
  target_deployment_id VARCHAR(255),
  target_deployment_name VARCHAR(255),
  target_environment VARCHAR(50) CHECK (target_environment IN ('core', 'edge')),
  classification VARCHAR(50) NOT NULL,
  scope JSONB NOT NULL,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ,
  file_path TEXT,
  file_size BIGINT,
  checksum_manifest VARCHAR(64) NOT NULL,
  checksum_content VARCHAR(64) NOT NULL,
  checksum_overall VARCHAR(64) NOT NULL,
  checksum_algorithm VARCHAR(50) NOT NULL DEFAULT 'sha256',
  signature_count INTEGER DEFAULT 0,
  signatures JSONB DEFAULT '[]'::jsonb,
  encrypted BOOLEAN DEFAULT FALSE,
  encryption_algorithm VARCHAR(50),
  encryption_key_id VARCHAR(255),
  statistics JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_bundles_source_deployment ON sync_bundles(source_deployment_id);
CREATE INDEX idx_sync_bundles_target_deployment ON sync_bundles(target_deployment_id);
CREATE INDEX idx_sync_bundles_created_at ON sync_bundles(created_at DESC);
CREATE INDEX idx_sync_bundles_expires_at ON sync_bundles(expires_at);
CREATE INDEX idx_sync_bundles_classification ON sync_bundles(classification);
CREATE INDEX idx_sync_bundles_direction ON sync_bundles(direction);

COMMENT ON TABLE sync_bundles IS 'Metadata for sync bundles with checksums and signatures';

-- ============================================================================
-- Deployment Registry Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_deployments (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  environment VARCHAR(50) NOT NULL CHECK (environment IN ('core', 'edge')),
  classification VARCHAR(50) NOT NULL,
  public_key TEXT NOT NULL,
  last_sync_at TIMESTAMPTZ,
  last_sync_direction VARCHAR(50),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'quarantined')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_deployments_environment ON sync_deployments(environment);
CREATE INDEX idx_sync_deployments_classification ON sync_deployments(classification);
CREATE INDEX idx_sync_deployments_status ON sync_deployments(status);
CREATE INDEX idx_sync_deployments_last_sync_at ON sync_deployments(last_sync_at DESC);

COMMENT ON TABLE sync_deployments IS 'Registry of known deployments for sync operations';

-- ============================================================================
-- Sync Statistics Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS sync_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) NOT NULL REFERENCES sync_bundles(id),
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('export', 'import')),
  cases_count INTEGER DEFAULT 0,
  entities_count INTEGER DEFAULT 0,
  relationships_count INTEGER DEFAULT 0,
  evidence_count INTEGER DEFAULT 0,
  analytics_count INTEGER DEFAULT 0,
  conflicts_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  duration_ms BIGINT,
  data_size_bytes BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_statistics_bundle_id ON sync_statistics(bundle_id);
CREATE INDEX idx_sync_statistics_operation ON sync_statistics(operation);
CREATE INDEX idx_sync_statistics_created_at ON sync_statistics(created_at DESC);

COMMENT ON TABLE sync_statistics IS 'Detailed statistics for sync operations for reporting and analysis';

-- ============================================================================
-- Triggers for Updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sync_operations_updated_at
  BEFORE UPDATE ON sync_operations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_conflicts_updated_at
  BEFORE UPDATE ON sync_conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_bundles_updated_at
  BEFORE UPDATE ON sync_bundles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sync_deployments_updated_at
  BEFORE UPDATE ON sync_deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Views
-- ============================================================================

-- Recent sync operations with bundle details
CREATE OR REPLACE VIEW v_recent_sync_operations AS
SELECT
  so.id,
  so.bundle_id,
  so.type,
  so.direction,
  so.status,
  so.progress,
  so.initiated_by,
  so.initiated_at,
  so.completed_at,
  sb.source_deployment_name,
  sb.target_deployment_name,
  sb.classification,
  sb.statistics,
  so.errors
FROM sync_operations so
LEFT JOIN sync_bundles sb ON so.bundle_id = sb.id
ORDER BY so.initiated_at DESC;

-- Unresolved conflicts summary
CREATE OR REPLACE VIEW v_unresolved_conflicts AS
SELECT
  bundle_id,
  resource_type,
  type AS conflict_type,
  COUNT(*) AS conflict_count,
  MIN(detected_at) AS first_detected,
  MAX(detected_at) AS last_detected
FROM sync_conflicts
WHERE resolved_at IS NULL
GROUP BY bundle_id, resource_type, type
ORDER BY last_detected DESC;

-- Sync health metrics
CREATE OR REPLACE VIEW v_sync_health_metrics AS
SELECT
  operation,
  result,
  COUNT(*) AS operation_count,
  AVG(EXTRACT(EPOCH FROM (completed_at - initiated_at))) AS avg_duration_seconds,
  MAX(timestamp) AS last_operation_at
FROM (
  SELECT
    sal.operation,
    sal.result,
    sal.timestamp,
    so.initiated_at,
    so.completed_at
  FROM sync_audit_log sal
  LEFT JOIN sync_operations so ON sal.bundle_id = so.bundle_id
  WHERE sal.timestamp >= NOW() - INTERVAL '7 days'
) recent
GROUP BY operation, result
ORDER BY operation, result;

-- ============================================================================
-- Grants (adjust for your security model)
-- ============================================================================

-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO sync_service_role;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO sync_service_role;

-- ============================================================================
-- Sample Data for Development (Comment out for production)
-- ============================================================================

-- Insert sample deployment registry entries
INSERT INTO sync_deployments (id, name, environment, classification, public_key)
VALUES
  ('core-prod-001', 'Core Production', 'core', 'UNCLASSIFIED', '-----BEGIN PUBLIC KEY-----\nSAMPLE\n-----END PUBLIC KEY-----'),
  ('edge-field-001', 'Edge Field Unit 1', 'edge', 'UNCLASSIFIED', '-----BEGIN PUBLIC KEY-----\nSAMPLE\n-----END PUBLIC KEY-----')
ON CONFLICT (id) DO NOTHING;

COMMENT ON DATABASE postgres IS 'Sync service schema initialized - version 1.0';
