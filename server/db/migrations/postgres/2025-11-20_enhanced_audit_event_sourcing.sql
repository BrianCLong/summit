-- Enhanced Audit Event Sourcing Schema
-- Implements comprehensive event sourcing for all state changes with GDPR/HIPAA compliance
-- Migration: 2025-11-20_enhanced_audit_event_sourcing

-- ============================================================================
-- EVENT STORE - Central append-only log for all domain events
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_store (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(100) NOT NULL, -- 'case', 'entity', 'relationship', 'user', etc.
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_version INTEGER NOT NULL DEFAULT 1,

  -- Event payload
  event_data JSONB NOT NULL,
  event_metadata JSONB DEFAULT '{}'::jsonb,

  -- Audit context
  tenant_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  correlation_id VARCHAR(255),
  causation_id UUID, -- ID of the event that caused this event

  -- Compliance tracking
  legal_basis VARCHAR(50),
  data_classification VARCHAR(50) DEFAULT 'INTERNAL',
  retention_policy VARCHAR(100) DEFAULT 'STANDARD',

  -- Session context
  ip_address INET,
  user_agent TEXT,
  session_id VARCHAR(255),
  request_id VARCHAR(255),

  -- Tamper-proof integrity
  event_hash VARCHAR(64) NOT NULL,
  previous_event_hash VARCHAR(64),

  -- Timestamps
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_store_aggregate ON event_store(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_event_store_event_type ON event_store(event_type);
CREATE INDEX IF NOT EXISTS idx_event_store_tenant_id ON event_store(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_store_user_id ON event_store(user_id);
CREATE INDEX IF NOT EXISTS idx_event_store_timestamp ON event_store(event_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_event_store_correlation_id ON event_store(correlation_id) WHERE correlation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_event_store_version ON event_store(aggregate_id, aggregate_version);
CREATE INDEX IF NOT EXISTS idx_event_store_classification ON event_store(data_classification);

-- Unique constraint to ensure event ordering per aggregate
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_store_aggregate_version
  ON event_store(aggregate_type, aggregate_id, aggregate_version);

-- Prevent updates and deletes to enforce immutability
CREATE OR REPLACE FUNCTION prevent_event_store_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Event store is immutable. Events cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_event_store_update
  BEFORE UPDATE ON event_store
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

CREATE TRIGGER prevent_event_store_delete
  BEFORE DELETE ON event_store
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

COMMENT ON TABLE event_store IS 'Append-only event store for complete state reconstruction and audit trails';
COMMENT ON COLUMN event_store.aggregate_version IS 'Optimistic concurrency control version number';
COMMENT ON COLUMN event_store.event_hash IS 'SHA-256 hash of event data for integrity verification';
COMMENT ON COLUMN event_store.previous_event_hash IS 'Hash chain to previous event for tamper detection';

-- ============================================================================
-- SNAPSHOTS - Optimized state reconstruction
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_snapshots (
  snapshot_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aggregate_type VARCHAR(100) NOT NULL,
  aggregate_id VARCHAR(255) NOT NULL,
  aggregate_version INTEGER NOT NULL,

  -- Snapshot state
  snapshot_data JSONB NOT NULL,
  snapshot_metadata JSONB DEFAULT '{}'::jsonb,

  -- Snapshot verification
  snapshot_hash VARCHAR(64) NOT NULL,
  event_count INTEGER NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(aggregate_type, aggregate_id, aggregate_version)
);

CREATE INDEX IF NOT EXISTS idx_snapshots_aggregate ON event_snapshots(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_version ON event_snapshots(aggregate_version DESC);

COMMENT ON TABLE event_snapshots IS 'Periodic snapshots for optimized aggregate state reconstruction';

-- ============================================================================
-- GDPR COMPLIANCE - Data Subject Rights
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_subject_requests (
  request_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Data subject information
  subject_id VARCHAR(255) NOT NULL,
  subject_email VARCHAR(255),
  subject_identifiers JSONB NOT NULL, -- Multiple ways to identify the subject

  -- Request details
  request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
    'access',           -- Article 15: Right of access
    'rectification',    -- Article 16: Right to rectification
    'erasure',          -- Article 17: Right to erasure ("right to be forgotten")
    'restriction',      -- Article 18: Right to restriction of processing
    'portability',      -- Article 20: Right to data portability
    'objection'         -- Article 21: Right to object
  )),
  request_status VARCHAR(50) DEFAULT 'pending' CHECK (request_status IN (
    'pending', 'in_progress', 'completed', 'rejected', 'expired'
  )),

  -- Compliance metadata
  request_reason TEXT NOT NULL,
  legal_basis VARCHAR(100),
  verification_method VARCHAR(100),
  verified_at TIMESTAMPTZ,
  verified_by VARCHAR(255),

  -- Processing
  assigned_to VARCHAR(255),
  processing_notes TEXT,
  completion_deadline TIMESTAMPTZ NOT NULL, -- 30 days for GDPR
  completed_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Audit trail
  created_by VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dsr_tenant ON data_subject_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_dsr_subject ON data_subject_requests(subject_id);
CREATE INDEX IF NOT EXISTS idx_dsr_status ON data_subject_requests(request_status);
CREATE INDEX IF NOT EXISTS idx_dsr_type ON data_subject_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_dsr_deadline ON data_subject_requests(completion_deadline);

COMMENT ON TABLE data_subject_requests IS 'GDPR data subject rights requests (Articles 15-21)';

-- ============================================================================
-- DATA RETENTION POLICIES
-- ============================================================================
CREATE TABLE IF NOT EXISTS retention_policies (
  policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_name VARCHAR(255) NOT NULL UNIQUE,

  -- Retention rules
  data_category VARCHAR(100) NOT NULL,
  retention_period_days INTEGER NOT NULL,
  retention_basis VARCHAR(100) NOT NULL, -- 'legal_requirement', 'business_need', 'consent'

  -- Geographic considerations
  applicable_jurisdictions VARCHAR(50)[] NOT NULL DEFAULT '{}',

  -- Lifecycle actions
  archival_after_days INTEGER,
  deletion_after_days INTEGER,
  anonymization_after_days INTEGER,

  -- Policy metadata
  regulation_references VARCHAR(255)[], -- E.g., 'GDPR Article 5(1)(e)', 'HIPAA 164.530(j)(2)'
  policy_description TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  effective_until TIMESTAMPTZ,

  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_retention_category ON retention_policies(data_category);
CREATE INDEX IF NOT EXISTS idx_retention_active ON retention_policies(is_active);
CREATE INDEX IF NOT EXISTS idx_retention_effective ON retention_policies(effective_from, effective_until);

COMMENT ON TABLE retention_policies IS 'Data retention policies for compliance with GDPR, HIPAA, and other regulations';

-- ============================================================================
-- DATA DELETION LOG - Track deletions for compliance
-- ============================================================================
CREATE TABLE IF NOT EXISTS data_deletion_log (
  deletion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Deletion scope
  deletion_type VARCHAR(50) NOT NULL CHECK (deletion_type IN (
    'hard_delete',      -- Permanent removal
    'soft_delete',      -- Mark as deleted
    'anonymization',    -- Replace PII with anonymous data
    'pseudonymization', -- Replace PII with pseudonyms
    'archival'          -- Move to cold storage
  )),

  -- What was deleted
  resource_type VARCHAR(100) NOT NULL,
  resource_id VARCHAR(255) NOT NULL,
  resource_identifiers JSONB NOT NULL,

  -- Why was it deleted
  deletion_reason VARCHAR(100) NOT NULL,
  legal_basis VARCHAR(100),
  data_subject_request_id UUID REFERENCES data_subject_requests(request_id),
  retention_policy_id UUID REFERENCES retention_policies(policy_id),

  -- Audit context
  deleted_by VARCHAR(255) NOT NULL,
  approved_by VARCHAR(255),
  deletion_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Backup & recovery metadata
  backup_location VARCHAR(500),
  recovery_deadline TIMESTAMPTZ,
  permanently_deleted_at TIMESTAMPTZ,

  -- Additional metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deletion_log_tenant ON data_deletion_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_resource ON data_deletion_log(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_deletion_log_timestamp ON data_deletion_log(deletion_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_deletion_log_dsr ON data_deletion_log(data_subject_request_id);

-- Prevent updates and deletes
CREATE TRIGGER prevent_deletion_log_update
  BEFORE UPDATE ON data_deletion_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

CREATE TRIGGER prevent_deletion_log_delete
  BEFORE DELETE ON data_deletion_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

COMMENT ON TABLE data_deletion_log IS 'Immutable log of all data deletions for compliance verification';

-- ============================================================================
-- HIPAA COMPLIANCE - Access Controls & Encryption Verification
-- ============================================================================
CREATE TABLE IF NOT EXISTS hipaa_phi_access_log (
  access_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- PHI resource
  phi_type VARCHAR(100) NOT NULL, -- 'patient_record', 'medical_document', 'diagnosis', etc.
  phi_id VARCHAR(255) NOT NULL,
  phi_classification VARCHAR(50) NOT NULL DEFAULT 'PHI',

  -- Access details
  access_type VARCHAR(50) NOT NULL CHECK (access_type IN (
    'view', 'create', 'update', 'delete', 'export', 'print', 'download', 'transmit'
  )),
  access_purpose VARCHAR(100) NOT NULL, -- 'treatment', 'payment', 'healthcare_operations'

  -- User context
  user_id VARCHAR(255) NOT NULL,
  user_role VARCHAR(100) NOT NULL,
  user_npi VARCHAR(20), -- National Provider Identifier

  -- Authorization
  authorization_type VARCHAR(100) NOT NULL, -- 'role_based', 'patient_consent', 'emergency_access'
  authorization_reference VARCHAR(255),
  patient_consent_id VARCHAR(255),

  -- Minimum necessary determination
  minimum_necessary_justification TEXT NOT NULL,
  data_elements_accessed TEXT[] NOT NULL,

  -- Session context
  ip_address INET NOT NULL,
  user_agent TEXT,
  session_id VARCHAR(255),
  workstation_id VARCHAR(255),

  -- Encryption verification
  data_encrypted_at_rest BOOLEAN NOT NULL DEFAULT true,
  data_encrypted_in_transit BOOLEAN NOT NULL DEFAULT true,
  encryption_algorithm VARCHAR(100),

  -- Audit metadata
  access_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  access_duration_ms INTEGER,

  -- Security incident tracking
  security_incident_flagged BOOLEAN DEFAULT false,
  incident_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hipaa_tenant ON hipaa_phi_access_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_phi ON hipaa_phi_access_log(phi_type, phi_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_user ON hipaa_phi_access_log(user_id);
CREATE INDEX IF NOT EXISTS idx_hipaa_timestamp ON hipaa_phi_access_log(access_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_hipaa_incident ON hipaa_phi_access_log(security_incident_flagged) WHERE security_incident_flagged = true;

-- Prevent modifications
CREATE TRIGGER prevent_hipaa_log_update
  BEFORE UPDATE ON hipaa_phi_access_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

CREATE TRIGGER prevent_hipaa_log_delete
  BEFORE DELETE ON hipaa_phi_access_log
  FOR EACH ROW EXECUTE FUNCTION prevent_event_store_modification();

COMMENT ON TABLE hipaa_phi_access_log IS 'HIPAA-compliant PHI access log per 164.308(a)(1)(ii)(D) and 164.312(b)';
COMMENT ON COLUMN hipaa_phi_access_log.minimum_necessary_justification IS 'Required justification per HIPAA Minimum Necessary Rule 164.502(b)';

-- ============================================================================
-- COMPLIANCE METRICS & MONITORING
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_metrics (
  metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Metric details
  metric_type VARCHAR(100) NOT NULL, -- 'audit_coverage', 'retention_compliance', 'dsr_response_time', etc.
  metric_name VARCHAR(255) NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit VARCHAR(50),

  -- Thresholds
  target_value NUMERIC,
  threshold_breached BOOLEAN DEFAULT false,
  severity VARCHAR(20) CHECK (severity IN ('info', 'warning', 'critical')),

  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  -- Metadata
  metric_metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_metrics_tenant ON compliance_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_type ON compliance_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_period ON compliance_metrics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_compliance_metrics_breach ON compliance_metrics(threshold_breached) WHERE threshold_breached = true;

COMMENT ON TABLE compliance_metrics IS 'Compliance KPIs and monitoring metrics for dashboards and alerts';

-- ============================================================================
-- COMPLIANCE ALERTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS compliance_alerts (
  alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,

  -- Alert details
  alert_type VARCHAR(100) NOT NULL,
  alert_severity VARCHAR(20) NOT NULL CHECK (alert_severity IN ('info', 'warning', 'critical', 'emergency')),
  alert_title VARCHAR(255) NOT NULL,
  alert_description TEXT NOT NULL,

  -- Alert context
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  affected_count INTEGER DEFAULT 1,

  -- Compliance framework
  regulation VARCHAR(100), -- 'GDPR', 'HIPAA', 'SOC2', 'PCI-DSS', etc.
  regulation_article VARCHAR(255), -- Specific article/section

  -- Status
  alert_status VARCHAR(50) DEFAULT 'open' CHECK (alert_status IN (
    'open', 'acknowledged', 'investigating', 'resolved', 'false_positive'
  )),

  -- Assignment
  assigned_to VARCHAR(255),
  acknowledged_by VARCHAR(255),
  acknowledged_at TIMESTAMPTZ,
  resolved_by VARCHAR(255),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,

  -- SLA tracking
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,

  -- Metadata
  alert_metadata JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_alerts_tenant ON compliance_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_severity ON compliance_alerts(alert_severity);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_status ON compliance_alerts(alert_status);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_regulation ON compliance_alerts(regulation);
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_sla ON compliance_alerts(sla_deadline) WHERE alert_status NOT IN ('resolved', 'false_positive');
CREATE INDEX IF NOT EXISTS idx_compliance_alerts_created ON compliance_alerts(created_at DESC);

COMMENT ON TABLE compliance_alerts IS 'Real-time compliance alerts and incident tracking';

-- ============================================================================
-- VIEWS FOR REPORTING
-- ============================================================================

-- Active data subject requests summary
CREATE OR REPLACE VIEW active_dsr_summary AS
SELECT
  tenant_id,
  request_type,
  COUNT(*) as request_count,
  COUNT(*) FILTER (WHERE request_status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE request_status = 'in_progress') as in_progress_count,
  COUNT(*) FILTER (WHERE completion_deadline < NOW()) as overdue_count,
  AVG(EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - created_at))) / 86400 as avg_days_to_complete
FROM data_subject_requests
WHERE request_status NOT IN ('completed', 'rejected')
GROUP BY tenant_id, request_type;

COMMENT ON VIEW active_dsr_summary IS 'Summary of active GDPR data subject requests by type and status';

-- Compliance alerts summary
CREATE OR REPLACE VIEW compliance_alerts_summary AS
SELECT
  tenant_id,
  regulation,
  alert_severity,
  alert_status,
  COUNT(*) as alert_count,
  COUNT(*) FILTER (WHERE sla_breached = true) as sla_breached_count,
  MIN(created_at) as oldest_alert
FROM compliance_alerts
WHERE alert_status NOT IN ('resolved', 'false_positive')
GROUP BY tenant_id, regulation, alert_severity, alert_status;

COMMENT ON VIEW compliance_alerts_summary IS 'Summary of open compliance alerts by regulation and severity';

-- Audit coverage metrics
CREATE OR REPLACE VIEW audit_coverage_metrics AS
SELECT
  tenant_id,
  event_type,
  aggregate_type,
  DATE_TRUNC('day', event_timestamp) as event_date,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT aggregate_id) as unique_resources
FROM event_store
GROUP BY tenant_id, event_type, aggregate_type, DATE_TRUNC('day', event_timestamp);

COMMENT ON VIEW audit_coverage_metrics IS 'Daily audit event coverage metrics for compliance reporting';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to check if retention policy requires action
CREATE OR REPLACE FUNCTION check_retention_compliance(p_tenant_id VARCHAR)
RETURNS TABLE(
  resource_type VARCHAR,
  resource_id VARCHAR,
  action_required VARCHAR,
  days_until_action INTEGER,
  policy_name VARCHAR
) AS $$
BEGIN
  -- This is a placeholder - actual implementation would join with your domain tables
  -- and check against retention policies
  RETURN QUERY
  SELECT
    'placeholder'::VARCHAR as resource_type,
    'placeholder'::VARCHAR as resource_id,
    'placeholder'::VARCHAR as action_required,
    0 as days_until_action,
    'placeholder'::VARCHAR as policy_name
  WHERE false; -- Returns empty set
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_retention_compliance IS 'Identifies resources requiring retention policy actions';

-- Function to generate compliance report metadata
CREATE OR REPLACE FUNCTION generate_compliance_report_metadata(
  p_tenant_id VARCHAR,
  p_report_type VARCHAR,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
  report_metadata JSONB;
BEGIN
  report_metadata = jsonb_build_object(
    'report_type', p_report_type,
    'tenant_id', p_tenant_id,
    'period_start', p_start_date,
    'period_end', p_end_date,
    'generated_at', NOW(),
    'total_events', (SELECT COUNT(*) FROM event_store WHERE tenant_id = p_tenant_id AND event_timestamp BETWEEN p_start_date AND p_end_date),
    'total_dsr', (SELECT COUNT(*) FROM data_subject_requests WHERE tenant_id = p_tenant_id AND created_at BETWEEN p_start_date AND p_end_date),
    'total_alerts', (SELECT COUNT(*) FROM compliance_alerts WHERE tenant_id = p_tenant_id AND created_at BETWEEN p_start_date AND p_end_date)
  );

  RETURN report_metadata;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_compliance_report_metadata IS 'Generates metadata for compliance reports';

-- ============================================================================
-- GRANTS (adjust based on your security model)
-- ============================================================================
-- GRANT SELECT, INSERT ON event_store TO app_user;
-- GRANT SELECT, INSERT ON hipaa_phi_access_log TO app_user;
-- GRANT SELECT, INSERT, UPDATE ON data_subject_requests TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default retention policies
INSERT INTO retention_policies (policy_name, data_category, retention_period_days, retention_basis, applicable_jurisdictions, regulation_references)
VALUES
  ('GDPR Standard Personal Data', 'personal_data', 2555, 'legal_requirement', ARRAY['EU', 'UK'], ARRAY['GDPR Article 5(1)(e)']),
  ('HIPAA Medical Records', 'medical_records', 2555, 'legal_requirement', ARRAY['US'], ARRAY['HIPAA 164.530(j)(2)']),
  ('Audit Logs - Legal Hold', 'audit_logs', 3650, 'legal_requirement', ARRAY['US', 'EU'], ARRAY['SOX Section 802', 'GDPR Article 30']),
  ('Temporary Investigation Data', 'investigation_temp', 180, 'business_need', ARRAY['US', 'EU'], ARRAY[]),
  ('User Consent Records', 'consent', 2555, 'legal_requirement', ARRAY['US', 'EU'], ARRAY['GDPR Article 7(1)'])
ON CONFLICT (policy_name) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON SCHEMA public IS 'Enhanced Audit Event Sourcing with GDPR/HIPAA Compliance - Schema version 2.0.0 - 2025-11-20';
