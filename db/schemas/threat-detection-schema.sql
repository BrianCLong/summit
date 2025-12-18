-- TimescaleDB schema for threat detection system
-- This schema stores security events, alerts, and threat intelligence

-- Create extension if not exists
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================================
-- Security Events Table (Hypertable for time-series data)
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_time TIMESTAMPTZ NOT NULL,

    -- Source information
    source_type VARCHAR(50) NOT NULL, -- 'NETWORK', 'APPLICATION', 'SYSTEM', etc.
    source_ip INET,
    source_port INTEGER,
    user_id VARCHAR(255),
    entity_id VARCHAR(255),

    -- Destination information
    destination_ip INET,
    destination_port INTEGER,

    -- Threat classification
    threat_category VARCHAR(100) NOT NULL,
    threat_severity VARCHAR(20) NOT NULL,
    threat_score DECIMAL(5,4) CHECK (threat_score >= 0 AND threat_score <= 1),
    confidence_score DECIMAL(5,4) CHECK (confidence_score >= 0 AND confidence_score <= 1),

    -- Detection details
    description TEXT NOT NULL,
    indicators TEXT[], -- Array of IOCs
    mitre_tactics TEXT[],
    mitre_techniques TEXT[],

    -- Event data
    raw_data JSONB,
    metadata JSONB,

    -- Correlation
    correlation_id VARCHAR(32),
    related_event_ids UUID[],

    -- Response tracking
    responded BOOLEAN DEFAULT FALSE,
    response_actions TEXT[],
    response_time TIMESTAMPTZ,

    -- Indexes for common queries
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable (partitioned by time)
SELECT create_hypertable('security_events', 'event_time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_security_events_severity
    ON security_events (threat_severity, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_category
    ON security_events (threat_category, event_time DESC);

CREATE INDEX IF NOT EXISTS idx_security_events_source_ip
    ON security_events USING hash (source_ip);

CREATE INDEX IF NOT EXISTS idx_security_events_user
    ON security_events USING hash (user_id);

CREATE INDEX IF NOT EXISTS idx_security_events_correlation
    ON security_events USING hash (correlation_id);

CREATE INDEX IF NOT EXISTS idx_security_events_indicators
    ON security_events USING GIN (indicators);

CREATE INDEX IF NOT EXISTS idx_security_events_mitre
    ON security_events USING GIN (mitre_techniques);

CREATE INDEX IF NOT EXISTS idx_security_events_metadata
    ON security_events USING GIN (metadata);

-- ============================================================================
-- Alerts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_alerts (
    alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Alert details
    title VARCHAR(500) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(20) NOT NULL,
    category VARCHAR(100) NOT NULL,

    -- Source events
    event_ids UUID[] NOT NULL,
    correlation_id VARCHAR(32),

    -- Scoring
    threat_score DECIMAL(5,4),
    confidence_score DECIMAL(5,4),
    priority_score DECIMAL(5,4),

    -- Affected entities
    affected_entities TEXT[],
    affected_users TEXT[],
    affected_systems TEXT[],

    -- Enrichment data
    enrichment_data JSONB,

    -- Status and workflow
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    assigned_to VARCHAR(255),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,

    -- Response
    automated_actions TEXT[],
    manual_actions TEXT[],
    playbooks TEXT[],

    -- Notifications
    notified_channels TEXT[],
    notifications JSONB,

    -- Deduplication
    fingerprint VARCHAR(64) NOT NULL,
    similar_alerts UUID[],
    suppressed_until TIMESTAMPTZ,

    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('security_alerts', 'created_at',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_alerts_status
    ON security_alerts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_severity
    ON security_alerts (severity, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_alerts_fingerprint
    ON security_alerts USING hash (fingerprint);

CREATE INDEX IF NOT EXISTS idx_alerts_assigned
    ON security_alerts (assigned_to, status);

-- ============================================================================
-- Behavior Profiles Table (Regular table, not time-series)
-- ============================================================================

CREATE TABLE IF NOT EXISTS behavior_profiles (
    entity_id VARCHAR(255) PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,

    -- Baseline metrics
    baseline_metrics JSONB NOT NULL,
    activity_pattern JSONB NOT NULL,

    -- Learning phase tracking
    learning_start_date TIMESTAMPTZ NOT NULL,
    last_updated TIMESTAMPTZ NOT NULL,
    sample_size INTEGER NOT NULL DEFAULT 0,

    -- Adaptive thresholds
    thresholds JSONB NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_profiles_entity_type
    ON behavior_profiles (entity_type);

CREATE INDEX IF NOT EXISTS idx_profiles_updated
    ON behavior_profiles (last_updated DESC);

-- ============================================================================
-- Threat Intelligence Indicators Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS threat_intel_indicators (
    indicator_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Indicator details
    indicator_type VARCHAR(50) NOT NULL,
    indicator_value TEXT NOT NULL,

    -- Classification
    threat_types TEXT[],
    malware_family VARCHAR(255),
    threat_actor VARCHAR(255),

    -- Scoring
    confidence DECIMAL(5,2) CHECK (confidence >= 0 AND confidence <= 100),
    severity DECIMAL(3,1) CHECK (severity >= 0 AND severity <= 10),
    risk_level VARCHAR(20),

    -- Temporal
    first_seen TIMESTAMPTZ NOT NULL,
    last_seen TIMESTAMPTZ NOT NULL,
    valid_until TIMESTAMPTZ,

    -- Source tracking
    sources JSONB NOT NULL,
    feed_ids TEXT[],

    -- TLP (Traffic Light Protocol)
    tlp VARCHAR(10) DEFAULT 'white',

    -- Enrichment
    enrichment JSONB,

    -- Relationships
    related_indicators UUID[],
    related_campaigns TEXT[],

    -- Action recommendation
    recommended_action VARCHAR(50),

    -- Metadata
    description TEXT,
    tags TEXT[],

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(indicator_type, indicator_value)
);

CREATE INDEX IF NOT EXISTS idx_threat_intel_type_value
    ON threat_intel_indicators (indicator_type, indicator_value);

CREATE INDEX IF NOT EXISTS idx_threat_intel_confidence
    ON threat_intel_indicators (confidence DESC);

CREATE INDEX IF NOT EXISTS idx_threat_intel_valid
    ON threat_intel_indicators (valid_until)
    WHERE valid_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_threat_intel_tags
    ON threat_intel_indicators USING GIN (tags);

-- ============================================================================
-- Threat Hunts Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS threat_hunts (
    hunt_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Hunt details
    name VARCHAR(500) NOT NULL,
    description TEXT,
    hunt_type VARCHAR(50) NOT NULL,
    hypothesis TEXT,

    -- Target scope
    target_scope JSONB NOT NULL,

    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'PLANNING',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Team
    hunters TEXT[] NOT NULL,
    lead_hunter VARCHAR(255) NOT NULL,

    -- Results
    findings JSONB DEFAULT '[]'::jsonb,
    total_events_analyzed BIGINT DEFAULT 0,
    suspicious_events_found INTEGER DEFAULT 0,
    threats_confirmed INTEGER DEFAULT 0,

    -- Metrics
    metrics JSONB,

    -- Documentation
    notes TEXT,
    report TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hunts_status
    ON threat_hunts (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_hunts_lead
    ON threat_hunts (lead_hunter);

-- ============================================================================
-- Continuous Aggregates for Performance
-- ============================================================================

-- Hourly event summary
CREATE MATERIALIZED VIEW IF NOT EXISTS security_events_hourly
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', event_time) AS hour,
    threat_category,
    threat_severity,
    COUNT(*) AS event_count,
    AVG(threat_score) AS avg_threat_score,
    COUNT(DISTINCT source_ip) AS unique_sources,
    COUNT(DISTINCT user_id) AS unique_users
FROM security_events
GROUP BY hour, threat_category, threat_severity
WITH NO DATA;

-- Refresh policy for continuous aggregate
SELECT add_continuous_aggregate_policy('security_events_hourly',
    start_offset => INTERVAL '3 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- Daily alert summary
CREATE MATERIALIZED VIEW IF NOT EXISTS security_alerts_daily
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 day', created_at) AS day,
    severity,
    category,
    status,
    COUNT(*) AS alert_count,
    AVG(priority_score) AS avg_priority,
    COUNT(DISTINCT assigned_to) AS unique_assignees
FROM security_alerts
GROUP BY day, severity, category, status
WITH NO DATA;

SELECT add_continuous_aggregate_policy('security_alerts_daily',
    start_offset => INTERVAL '7 days',
    end_offset => INTERVAL '1 day',
    schedule_interval => INTERVAL '1 day',
    if_not_exists => TRUE
);

-- ============================================================================
-- Retention Policies
-- ============================================================================

-- Retain raw security events for 90 days
SELECT add_retention_policy('security_events',
    INTERVAL '90 days',
    if_not_exists => TRUE
);

-- Retain alerts for 1 year
SELECT add_retention_policy('security_alerts',
    INTERVAL '365 days',
    if_not_exists => TRUE
);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to get events by correlation ID
CREATE OR REPLACE FUNCTION get_correlated_events(corr_id VARCHAR(32))
RETURNS TABLE (
    event_id UUID,
    event_time TIMESTAMPTZ,
    threat_category VARCHAR(100),
    threat_severity VARCHAR(20),
    description TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.event_id,
        e.event_time,
        e.threat_category,
        e.threat_severity,
        e.description
    FROM security_events e
    WHERE e.correlation_id = corr_id
    ORDER BY e.event_time;
END;
$$ LANGUAGE plpgsql;

-- Function to get top threats in time range
CREATE OR REPLACE FUNCTION get_top_threats(
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    min_severity VARCHAR(20) DEFAULT 'MEDIUM',
    limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
    threat_category VARCHAR(100),
    event_count BIGINT,
    avg_threat_score DECIMAL,
    unique_sources BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        e.threat_category,
        COUNT(*) AS event_count,
        AVG(e.threat_score) AS avg_threat_score,
        COUNT(DISTINCT e.source_ip) AS unique_sources
    FROM security_events e
    WHERE e.event_time BETWEEN start_time AND end_time
    AND e.threat_severity IN ('CRITICAL', 'HIGH',
        CASE WHEN min_severity IN ('MEDIUM', 'LOW', 'INFO') THEN 'MEDIUM' END,
        CASE WHEN min_severity IN ('LOW', 'INFO') THEN 'LOW' END,
        CASE WHEN min_severity = 'INFO' THEN 'INFO' END)
    GROUP BY e.threat_category
    ORDER BY event_count DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO threat_detection_service;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO threat_detection_service;
