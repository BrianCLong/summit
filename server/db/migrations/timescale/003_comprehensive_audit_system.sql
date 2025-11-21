-- ============================================================================
-- Comprehensive Audit System - TimescaleDB Migration
-- ============================================================================
--
-- Purpose: Immutable audit trail with cryptographic integrity
--
-- Features:
-- - Time-series partitioning with TimescaleDB hypertables
-- - HMAC-SHA256 signatures for tamper detection
-- - Hash chain integrity (blockchain-like)
-- - Before/after state tracking for mutations
-- - Multi-tenant isolation
-- - Compliance framework support (SOC2, GDPR, HIPAA, ISO27001)
-- - 7-year retention for regulatory compliance
-- - Efficient indexing for forensic queries
--
-- Schema Version: 1.0.0
-- Created: 2025-01-01
-- ============================================================================

-- Create the main audit events table
CREATE TABLE IF NOT EXISTS audit_events (
    -- === Primary Key & Sequencing ===
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_number BIGSERIAL NOT NULL,

    -- === Event Classification ===
    event_type TEXT NOT NULL,
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version TEXT NOT NULL DEFAULT '1.0.0',

    -- === Context & Correlation ===
    correlation_id UUID NOT NULL,
    session_id UUID,
    request_id UUID,
    parent_event_id UUID REFERENCES audit_events(id),
    trace_id TEXT,
    span_id TEXT,

    -- === Actors (WHO) ===
    user_id TEXT,
    user_email TEXT,
    impersonated_by TEXT,
    service_account_id TEXT,
    tenant_id TEXT NOT NULL,
    organization_id TEXT,

    -- === Service Context ===
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_version TEXT,
    environment TEXT NOT NULL CHECK (environment IN ('development', 'staging', 'production')),

    -- === Resource Context (WHAT) ===
    resource_type TEXT,
    resource_id TEXT,
    resource_ids TEXT[],
    resource_path TEXT,
    resource_name TEXT,

    -- === Action Details (HOW) ===
    action TEXT NOT NULL,
    outcome TEXT NOT NULL CHECK (outcome IN ('success', 'failure', 'partial', 'pending')),
    message TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,

    -- === Mutation Tracking (Before/After States) ===
    old_values JSONB,
    new_values JSONB,
    diff_summary TEXT,

    -- === Security Context (WHERE/FROM) ===
    ip_address INET,
    ip_address_v6 INET,
    user_agent TEXT,
    geolocation JSONB,  -- {country, region, city, coordinates}
    device_fingerprint TEXT,

    -- === Compliance Fields ===
    compliance_relevant BOOLEAN NOT NULL DEFAULT FALSE,
    compliance_frameworks TEXT[] DEFAULT ARRAY[]::TEXT[],
    data_classification TEXT CHECK (
        data_classification IN ('public', 'internal', 'confidential', 'restricted', 'top_secret')
    ),
    retention_period_days INTEGER DEFAULT 2555,  -- 7 years default
    legal_hold BOOLEAN DEFAULT FALSE,
    gdpr_lawful_basis TEXT,
    hipaa_requirement TEXT,

    -- === Cryptographic Integrity ===
    hash TEXT,  -- SHA-256 hash of event content
    signature TEXT NOT NULL,  -- HMAC-SHA256 signature
    previous_event_hash TEXT,  -- Hash of previous event (blockchain chain)
    signature_algorithm TEXT NOT NULL DEFAULT 'HMAC-SHA256',
    public_key_id TEXT,

    -- === Performance Metrics ===
    duration_ms BIGINT,
    error_code TEXT,
    error_message TEXT,
    stack_trace TEXT,

    -- === Metadata ===
    tags TEXT[],
    metadata JSONB DEFAULT '{}'::jsonb,
    redacted BOOLEAN DEFAULT FALSE,

    -- === Audit Metadata ===
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    partition TEXT
);

-- Convert to hypertable partitioned by timestamp
-- Partition by 1 day for optimal query performance
SELECT create_hypertable(
    'audit_events',
    'timestamp',
    chunk_time_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================================
-- Indexes for Performance
-- ============================================================================

-- Time-based queries (most common)
CREATE INDEX IF NOT EXISTS idx_audit_events_timestamp
    ON audit_events (timestamp DESC, tenant_id);

-- Tenant isolation (critical for multi-tenancy)
CREATE INDEX IF NOT EXISTS idx_audit_events_tenant_id
    ON audit_events (tenant_id, timestamp DESC);

-- User activity tracking
CREATE INDEX IF NOT EXISTS idx_audit_events_user_id
    ON audit_events (user_id, timestamp DESC)
    WHERE user_id IS NOT NULL;

-- Event type filtering
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type
    ON audit_events (event_type, timestamp DESC);

-- Severity filtering
CREATE INDEX IF NOT EXISTS idx_audit_events_level
    ON audit_events (level, timestamp DESC);

-- Correlation tracking
CREATE INDEX IF NOT EXISTS idx_audit_events_correlation_id
    ON audit_events (correlation_id, timestamp);

-- Session tracking
CREATE INDEX IF NOT EXISTS idx_audit_events_session_id
    ON audit_events (session_id, timestamp DESC)
    WHERE session_id IS NOT NULL;

-- Request tracking (distributed tracing)
CREATE INDEX IF NOT EXISTS idx_audit_events_request_id
    ON audit_events (request_id)
    WHERE request_id IS NOT NULL;

-- Trace ID for distributed tracing integration
CREATE INDEX IF NOT EXISTS idx_audit_events_trace_id
    ON audit_events (trace_id, timestamp)
    WHERE trace_id IS NOT NULL;

-- Resource tracking
CREATE INDEX IF NOT EXISTS idx_audit_events_resource
    ON audit_events (resource_type, resource_id, timestamp DESC)
    WHERE resource_type IS NOT NULL AND resource_id IS NOT NULL;

-- Compliance queries (partial index for efficiency)
CREATE INDEX IF NOT EXISTS idx_audit_events_compliance
    ON audit_events (compliance_relevant, timestamp DESC)
    WHERE compliance_relevant = TRUE;

-- Compliance frameworks (GIN index for array containment)
CREATE INDEX IF NOT EXISTS idx_audit_events_compliance_frameworks
    ON audit_events USING GIN (compliance_frameworks)
    WHERE compliance_frameworks <> ARRAY[]::TEXT[];

-- Legal hold queries
CREATE INDEX IF NOT EXISTS idx_audit_events_legal_hold
    ON audit_events (legal_hold, timestamp DESC)
    WHERE legal_hold = TRUE;

-- Critical events
CREATE INDEX IF NOT EXISTS idx_audit_events_critical
    ON audit_events (timestamp DESC)
    WHERE level = 'critical';

-- Failed operations
CREATE INDEX IF NOT EXISTS idx_audit_events_failures
    ON audit_events (outcome, timestamp DESC)
    WHERE outcome = 'failure';

-- Full-text search on message
CREATE INDEX IF NOT EXISTS idx_audit_events_message_fts
    ON audit_events USING gin(to_tsvector('english', message));

-- JSONB details search (GIN index)
CREATE INDEX IF NOT EXISTS idx_audit_events_details_gin
    ON audit_events USING gin(details);

-- Tags search (GIN index)
CREATE INDEX IF NOT EXISTS idx_audit_events_tags
    ON audit_events USING gin(tags)
    WHERE tags IS NOT NULL;

-- Sequence number for hash chain verification
CREATE INDEX IF NOT EXISTS idx_audit_events_sequence
    ON audit_events (sequence_number);

-- Hash chain verification
CREATE INDEX IF NOT EXISTS idx_audit_events_hash_chain
    ON audit_events (previous_event_hash)
    WHERE previous_event_hash IS NOT NULL;

-- IP address tracking
CREATE INDEX IF NOT EXISTS idx_audit_events_ip_address
    ON audit_events (ip_address, timestamp DESC)
    WHERE ip_address IS NOT NULL;

-- ============================================================================
-- Compression Policy (for older data)
-- ============================================================================

-- Enable compression on chunks older than 7 days
SELECT add_compression_policy(
    'audit_events',
    INTERVAL '7 days',
    if_not_exists => TRUE
);

-- ============================================================================
-- Retention Policy
-- ============================================================================

-- Drop chunks older than 7 years (2555 days) by default
-- This can be overridden per-event via retention_period_days field
SELECT add_retention_policy(
    'audit_events',
    INTERVAL '2555 days',
    if_not_exists => TRUE
);

-- Note: Events with legal_hold = TRUE must be handled separately
-- and should NOT be automatically deleted

-- ============================================================================
-- Supporting Tables
-- ============================================================================

-- Compliance Reports
CREATE TABLE IF NOT EXISTS compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    framework TEXT NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by TEXT NOT NULL,

    -- Summary metrics
    total_events BIGINT,
    critical_events BIGINT,
    violation_count BIGINT,
    compliance_score NUMERIC(5,2),  -- 0.00 to 100.00
    risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

    -- Full report data
    report_data JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_framework
    ON compliance_reports (framework, period_start DESC);

CREATE INDEX IF NOT EXISTS idx_compliance_reports_generated_at
    ON compliance_reports (generated_at DESC);

-- Convert to hypertable partitioned by period_start
SELECT create_hypertable(
    'compliance_reports',
    'period_start',
    chunk_time_interval => INTERVAL '1 month',
    if_not_exists => TRUE
);

-- Forensic Analyses
CREATE TABLE IF NOT EXISTS forensic_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    correlation_id UUID NOT NULL,
    investigator_id TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,

    -- Analysis results
    event_count BIGINT,
    time_span_ms BIGINT,
    unique_actors INTEGER,
    unique_resources INTEGER,
    anomaly_count INTEGER,
    overall_risk_score NUMERIC(5,2),  -- 0.00 to 100.00

    -- Full analysis data
    analysis_data JSONB NOT NULL,

    -- Findings
    findings TEXT,
    recommendations TEXT[],

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forensic_analyses_correlation_id
    ON forensic_analyses (correlation_id);

CREATE INDEX IF NOT EXISTS idx_forensic_analyses_investigator_id
    ON forensic_analyses (investigator_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_forensic_analyses_started_at
    ON forensic_analyses (started_at DESC);

-- Integrity Verifications
CREATE TABLE IF NOT EXISTS integrity_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    verified_by TEXT,

    -- Time range verified
    time_range_start TIMESTAMPTZ NOT NULL,
    time_range_end TIMESTAMPTZ NOT NULL,

    -- Verification results
    total_events BIGINT NOT NULL,
    valid_events BIGINT NOT NULL,
    invalid_events BIGINT NOT NULL,
    hash_chain_valid BOOLEAN NOT NULL,
    overall_valid BOOLEAN NOT NULL,

    -- Issue summary
    issue_count INTEGER NOT NULL DEFAULT 0,
    critical_issues INTEGER NOT NULL DEFAULT 0,

    -- Full verification data
    verification_data JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_integrity_verifications_verified_at
    ON integrity_verifications (verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_verifications_overall_valid
    ON integrity_verifications (overall_valid, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_integrity_verifications_time_range
    ON integrity_verifications (time_range_start, time_range_end);

-- ============================================================================
-- Materialized Views for Analytics
-- ============================================================================

-- Daily audit summary
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_daily_summary AS
SELECT
    DATE_TRUNC('day', timestamp) as day,
    tenant_id,
    event_type,
    level,
    outcome,
    COUNT(*) as event_count,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    COUNT(*) FILTER (WHERE compliance_relevant = TRUE) as compliance_events,
    COUNT(*) FILTER (WHERE outcome = 'failure') as failed_events,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms
FROM audit_events
GROUP BY day, tenant_id, event_type, level, outcome;

CREATE UNIQUE INDEX ON audit_daily_summary (day, tenant_id, event_type, level, outcome);
CREATE INDEX ON audit_daily_summary (day DESC);
CREATE INDEX ON audit_daily_summary (tenant_id, day DESC);

-- User activity summary
CREATE MATERIALIZED VIEW IF NOT EXISTS audit_user_activity_summary AS
SELECT
    DATE_TRUNC('day', timestamp) as day,
    tenant_id,
    user_id,
    COUNT(*) as total_actions,
    COUNT(DISTINCT event_type) as unique_event_types,
    COUNT(*) FILTER (WHERE outcome = 'failure') as failed_actions,
    COUNT(*) FILTER (WHERE level = 'critical') as critical_events,
    COUNT(DISTINCT ip_address) as unique_ip_addresses,
    MIN(timestamp) as first_activity,
    MAX(timestamp) as last_activity
FROM audit_events
WHERE user_id IS NOT NULL
GROUP BY day, tenant_id, user_id;

CREATE UNIQUE INDEX ON audit_user_activity_summary (day, tenant_id, user_id);
CREATE INDEX ON audit_user_activity_summary (day DESC);
CREATE INDEX ON audit_user_activity_summary (user_id, day DESC);

-- ============================================================================
-- Refresh Policies for Materialized Views
-- ============================================================================

-- Refresh daily summary every hour
CREATE OR REPLACE FUNCTION refresh_audit_daily_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY audit_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- Refresh user activity summary every hour
CREATE OR REPLACE FUNCTION refresh_audit_user_activity_summary()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY audit_user_activity_summary;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get the last event hash for chain verification
CREATE OR REPLACE FUNCTION get_last_event_hash(p_tenant_id TEXT)
RETURNS TEXT AS $$
DECLARE
    last_hash TEXT;
BEGIN
    SELECT hash INTO last_hash
    FROM audit_events
    WHERE tenant_id = p_tenant_id
    ORDER BY timestamp DESC, sequence_number DESC
    LIMIT 1;

    RETURN COALESCE(last_hash, '');
END;
$$ LANGUAGE plpgsql;

-- Function to verify hash chain integrity
CREATE OR REPLACE FUNCTION verify_hash_chain(
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ,
    p_tenant_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    valid BOOLEAN,
    total_events BIGINT,
    chain_breaks INTEGER,
    first_break_event_id UUID
) AS $$
DECLARE
    prev_hash TEXT := '';
    current_hash TEXT;
    current_prev_hash TEXT;
    current_event_id UUID;
    breaks INTEGER := 0;
    first_break UUID := NULL;
    total BIGINT := 0;
BEGIN
    FOR current_event_id, current_hash, current_prev_hash IN
        SELECT id, hash, previous_event_hash
        FROM audit_events
        WHERE timestamp >= p_start_time
          AND timestamp <= p_end_time
          AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)
        ORDER BY timestamp ASC, sequence_number ASC
    LOOP
        total := total + 1;

        IF total > 1 AND current_prev_hash != prev_hash THEN
            breaks := breaks + 1;
            IF first_break IS NULL THEN
                first_break := current_event_id;
            END IF;
        END IF;

        prev_hash := current_hash;
    END LOOP;

    RETURN QUERY SELECT (breaks = 0), total, breaks, first_break;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Row-Level Security (Multi-Tenancy)
-- ============================================================================

-- Enable RLS on audit_events
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see events from their tenant
CREATE POLICY tenant_isolation ON audit_events
    FOR SELECT
    USING (tenant_id = current_setting('app.current_tenant_id', TRUE));

-- Policy: Only service accounts can insert audit events
CREATE POLICY service_insert ON audit_events
    FOR INSERT
    WITH CHECK (current_setting('app.service_account', TRUE)::BOOLEAN = TRUE);

-- Policy: Prevent updates and deletes (immutability)
CREATE POLICY no_updates ON audit_events
    FOR UPDATE
    USING (FALSE);

CREATE POLICY no_deletes ON audit_events
    FOR DELETE
    USING (FALSE);

-- Note: For legal hold and retention management, create a separate
-- administrative role that can bypass RLS using SECURITY DEFINER functions

-- ============================================================================
-- Comments for Documentation
-- ============================================================================

COMMENT ON TABLE audit_events IS
    'Comprehensive immutable audit trail with cryptographic integrity. ' ||
    'Partitioned by timestamp using TimescaleDB hypertables. ' ||
    'Supports SOC2, GDPR, HIPAA, and ISO27001 compliance.';

COMMENT ON COLUMN audit_events.hash IS
    'SHA-256 hash of event content for integrity verification';

COMMENT ON COLUMN audit_events.signature IS
    'HMAC-SHA256 signature for tamper detection';

COMMENT ON COLUMN audit_events.previous_event_hash IS
    'Hash of previous event to create blockchain-like chain';

COMMENT ON COLUMN audit_events.old_values IS
    'Resource state before mutation (for change tracking)';

COMMENT ON COLUMN audit_events.new_values IS
    'Resource state after mutation (for change tracking)';

COMMENT ON COLUMN audit_events.retention_period_days IS
    'Event-specific retention override. Default: 2555 days (7 years)';

COMMENT ON COLUMN audit_events.legal_hold IS
    'If TRUE, event must not be deleted regardless of retention policy';

COMMENT ON TABLE compliance_reports IS
    'Compliance reports for SOC2, GDPR, HIPAA, and other frameworks';

COMMENT ON TABLE forensic_analyses IS
    'Forensic analysis results for security incident investigations';

COMMENT ON TABLE integrity_verifications IS
    'Audit trail integrity verification results';

-- ============================================================================
-- Grants
-- ============================================================================

-- Grant SELECT to application role
GRANT SELECT ON audit_events TO postgres;
GRANT SELECT ON compliance_reports TO postgres;
GRANT SELECT ON forensic_analyses TO postgres;
GRANT SELECT ON integrity_verifications TO postgres;

-- Grant INSERT only on audit_events (immutable)
GRANT INSERT ON audit_events TO postgres;
GRANT USAGE, SELECT ON SEQUENCE audit_events_sequence_number_seq TO postgres;

-- Grant all on supporting tables
GRANT INSERT, UPDATE ON compliance_reports TO postgres;
GRANT INSERT, UPDATE ON forensic_analyses TO postgres;
GRANT INSERT ON integrity_verifications TO postgres;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION get_last_event_hash TO postgres;
GRANT EXECUTE ON FUNCTION verify_hash_chain TO postgres;
GRANT EXECUTE ON FUNCTION refresh_audit_daily_summary TO postgres;
GRANT EXECUTE ON FUNCTION refresh_audit_user_activity_summary TO postgres;

-- ============================================================================
-- End of Migration
-- ============================================================================
