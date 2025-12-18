-- ============================================================================
-- Time-Series Metrics Platform Schema
-- Version: 1.0.0
-- Description: Core tables for time-series metrics storage with hot/warm/cold tiers
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- ============================================================================
-- HOT TIER: Recent data, full resolution (15s default)
-- Retention: 7 days
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_hot (
    time TIMESTAMPTZ NOT NULL,
    tenant_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    value DOUBLE PRECISION NOT NULL,
    PRIMARY KEY (time, tenant_id, metric_name, labels)
);

-- Convert to hypertable with 1-day chunks for efficient retention
SELECT create_hypertable('metrics_hot', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

-- Enable compression after 1 day
ALTER TABLE metrics_hot SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('metrics_hot', INTERVAL '1 day', if_not_exists => TRUE);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_metrics_hot_tenant_time
    ON metrics_hot (tenant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_hot_metric_time
    ON metrics_hot (metric_name, time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_hot_tenant_metric
    ON metrics_hot (tenant_id, metric_name, time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_hot_labels
    ON metrics_hot USING GIN (labels);

-- ============================================================================
-- WARM TIER: Downsampled data (1-minute resolution)
-- Retention: 30 days
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_warm (
    time TIMESTAMPTZ NOT NULL,
    tenant_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    value_avg DOUBLE PRECISION,
    value_min DOUBLE PRECISION,
    value_max DOUBLE PRECISION,
    value_sum DOUBLE PRECISION,
    value_count BIGINT,
    PRIMARY KEY (time, tenant_id, metric_name, labels)
);

SELECT create_hypertable('metrics_warm', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '7 days'
);

ALTER TABLE metrics_warm SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('metrics_warm', INTERVAL '1 day', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_metrics_warm_tenant_time
    ON metrics_warm (tenant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_warm_metric_time
    ON metrics_warm (metric_name, time DESC);

-- ============================================================================
-- COLD TIER: Highly aggregated data (1-hour resolution)
-- Retention: 365 days
-- ============================================================================

CREATE TABLE IF NOT EXISTS metrics_cold (
    time TIMESTAMPTZ NOT NULL,
    tenant_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    value_avg DOUBLE PRECISION,
    value_min DOUBLE PRECISION,
    value_max DOUBLE PRECISION,
    value_sum DOUBLE PRECISION,
    value_count BIGINT,
    value_p50 DOUBLE PRECISION,
    value_p95 DOUBLE PRECISION,
    value_p99 DOUBLE PRECISION,
    PRIMARY KEY (time, tenant_id, metric_name, labels)
);

SELECT create_hypertable('metrics_cold', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '30 days'
);

ALTER TABLE metrics_cold SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'tenant_id, metric_name',
    timescaledb.compress_orderby = 'time DESC'
);

SELECT add_compression_policy('metrics_cold', INTERVAL '7 days', if_not_exists => TRUE);

CREATE INDEX IF NOT EXISTS idx_metrics_cold_tenant_time
    ON metrics_cold (tenant_id, time DESC);

CREATE INDEX IF NOT EXISTS idx_metrics_cold_metric_time
    ON metrics_cold (metric_name, time DESC);

-- ============================================================================
-- SERIES METADATA: Track unique time-series
-- ============================================================================

CREATE TABLE IF NOT EXISTS series_metadata (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    metric_name TEXT NOT NULL,
    labels JSONB NOT NULL DEFAULT '{}',
    metric_type TEXT NOT NULL DEFAULT 'gauge',
    help_text TEXT,
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    retention_policy TEXT NOT NULL DEFAULT 'default',
    sample_count BIGINT DEFAULT 0,
    UNIQUE (tenant_id, metric_name, labels)
);

CREATE INDEX IF NOT EXISTS idx_series_metadata_tenant
    ON series_metadata (tenant_id);

CREATE INDEX IF NOT EXISTS idx_series_metadata_metric
    ON series_metadata (metric_name);

CREATE INDEX IF NOT EXISTS idx_series_metadata_last_seen
    ON series_metadata (last_seen DESC);

-- ============================================================================
-- RETENTION POLICIES CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS retention_policies (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    config JSONB NOT NULL,
    metric_patterns TEXT[] DEFAULT ARRAY['*'],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default retention policies
INSERT INTO retention_policies (name, description, is_default, config, metric_patterns) VALUES
('default', 'Standard retention policy for general metrics', TRUE, '{
    "tiers": [
        {"tier": "hot", "resolution": "15s", "retention": "7d"},
        {"tier": "warm", "resolution": "1m", "retention": "30d"},
        {"tier": "cold", "resolution": "1h", "retention": "365d"}
    ],
    "deleteAfter": "730d"
}', ARRAY['*']),
('slo-metrics', 'High-resolution retention for SLO metrics', FALSE, '{
    "tiers": [
        {"tier": "hot", "resolution": "10s", "retention": "14d"},
        {"tier": "warm", "resolution": "1m", "retention": "90d"},
        {"tier": "cold", "resolution": "5m", "retention": "1095d"}
    ]
}', ARRAY['slo_*', '*_sli_*', '*_error_budget_*']),
('business-metrics', 'Long-term retention for business metrics', FALSE, '{
    "tiers": [
        {"tier": "hot", "resolution": "1m", "retention": "30d"},
        {"tier": "warm", "resolution": "15m", "retention": "365d"},
        {"tier": "cold", "resolution": "1h", "retention": "1825d"}
    ]
}', ARRAY['business_*', 'revenue_*', 'signups_*']),
('infrastructure-metrics', 'Short retention for infrastructure metrics', FALSE, '{
    "tiers": [
        {"tier": "hot", "resolution": "15s", "retention": "3d"},
        {"tier": "warm", "resolution": "1m", "retention": "14d"},
        {"tier": "cold", "resolution": "5m", "retention": "90d"}
    ]
}', ARRAY['node_*', 'container_*', 'kubelet_*', 'process_*'])
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- TENANT CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS tenant_configs (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    tier TEXT NOT NULL DEFAULT 'free',
    active BOOLEAN DEFAULT TRUE,
    limits JSONB NOT NULL,
    query_priority INTEGER DEFAULT 5,
    retention_policies TEXT[] DEFAULT ARRAY[]::TEXT[],
    allowed_metric_prefixes TEXT[] DEFAULT ARRAY[]::TEXT[],
    blocked_metric_prefixes TEXT[] DEFAULT ARRAY[]::TEXT[],
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_configs_tenant_id
    ON tenant_configs (tenant_id);

-- Insert default tenant
INSERT INTO tenant_configs (tenant_id, name, tier, limits) VALUES
('default', 'Default Tenant', 'professional', '{
    "maxIngestionRate": 100000,
    "maxActiveSeries": 1000000,
    "maxLabelsPerMetric": 32,
    "maxLabelNameLength": 128,
    "maxLabelValueLength": 512,
    "maxQueryTimeRange": 2592000000,
    "maxQueryDataPoints": 500000,
    "maxConcurrentQueries": 20,
    "queryTimeout": 120000,
    "storageQuota": 107374182400
}')
ON CONFLICT (tenant_id) DO NOTHING;

-- ============================================================================
-- SLO DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS slo_definitions (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,
    service TEXT NOT NULL,
    target DOUBLE PRECISION NOT NULL,
    window_type TEXT NOT NULL DEFAULT 'rolling',
    window_duration TEXT NOT NULL DEFAULT '30d',
    sli_query_good TEXT NOT NULL,
    sli_query_total TEXT NOT NULL,
    burn_rate_alerts JSONB DEFAULT '[]',
    group_by TEXT[] DEFAULT ARRAY[]::TEXT[],
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_slo_definitions_tenant
    ON slo_definitions (tenant_id);

CREATE INDEX IF NOT EXISTS idx_slo_definitions_service
    ON slo_definitions (service);

-- ============================================================================
-- SLO STATUS HISTORY (for tracking SLO compliance over time)
-- ============================================================================

CREATE TABLE IF NOT EXISTS slo_status_history (
    time TIMESTAMPTZ NOT NULL,
    slo_id TEXT NOT NULL,
    tenant_id TEXT NOT NULL,
    current_sli DOUBLE PRECISION,
    error_budget_remaining DOUBLE PRECISION,
    error_budget_consumed DOUBLE PRECISION,
    burn_rate DOUBLE PRECISION,
    good_events BIGINT,
    total_events BIGINT,
    is_met BOOLEAN,
    triggered_alerts JSONB DEFAULT '[]',
    PRIMARY KEY (time, slo_id)
);

SELECT create_hypertable('slo_status_history', 'time',
    if_not_exists => TRUE,
    chunk_time_interval => INTERVAL '1 day'
);

CREATE INDEX IF NOT EXISTS idx_slo_status_history_slo
    ON slo_status_history (slo_id, time DESC);

-- ============================================================================
-- RETENTION POLICIES (TimescaleDB automatic data management)
-- ============================================================================

-- Hot tier: 7 days retention
SELECT add_retention_policy('metrics_hot', INTERVAL '7 days', if_not_exists => TRUE);

-- Warm tier: 30 days retention
SELECT add_retention_policy('metrics_warm', INTERVAL '30 days', if_not_exists => TRUE);

-- Cold tier: 365 days retention
SELECT add_retention_policy('metrics_cold', INTERVAL '365 days', if_not_exists => TRUE);

-- SLO history: 90 days retention
SELECT add_retention_policy('slo_status_history', INTERVAL '90 days', if_not_exists => TRUE);

-- ============================================================================
-- CONTINUOUS AGGREGATES (for efficient downsampling queries)
-- ============================================================================

-- 1-minute aggregates from hot tier
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1m_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    tenant_id,
    metric_name,
    labels,
    AVG(value) AS value_avg,
    MIN(value) AS value_min,
    MAX(value) AS value_max,
    SUM(value) AS value_sum,
    COUNT(*) AS value_count
FROM metrics_hot
GROUP BY bucket, tenant_id, metric_name, labels
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_1m_agg',
    start_offset => INTERVAL '2 hours',
    end_offset => INTERVAL '1 minute',
    schedule_interval => INTERVAL '1 minute',
    if_not_exists => TRUE
);

-- 1-hour aggregates from warm tier
CREATE MATERIALIZED VIEW IF NOT EXISTS metrics_1h_agg
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 hour', time) AS bucket,
    tenant_id,
    metric_name,
    labels,
    AVG(value_avg) AS value_avg,
    MIN(value_min) AS value_min,
    MAX(value_max) AS value_max,
    SUM(value_sum) AS value_sum,
    SUM(value_count) AS value_count
FROM metrics_warm
GROUP BY bucket, tenant_id, metric_name, labels
WITH NO DATA;

SELECT add_continuous_aggregate_policy('metrics_1h_agg',
    start_offset => INTERVAL '4 hours',
    end_offset => INTERVAL '1 hour',
    schedule_interval => INTERVAL '1 hour',
    if_not_exists => TRUE
);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get metric value at a specific time (last value before timestamp)
CREATE OR REPLACE FUNCTION get_metric_value(
    p_tenant_id TEXT,
    p_metric_name TEXT,
    p_labels JSONB,
    p_timestamp TIMESTAMPTZ
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    result DOUBLE PRECISION;
BEGIN
    SELECT value INTO result
    FROM metrics_hot
    WHERE tenant_id = p_tenant_id
      AND metric_name = p_metric_name
      AND labels @> p_labels
      AND time <= p_timestamp
    ORDER BY time DESC
    LIMIT 1;

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate rate over a time range
CREATE OR REPLACE FUNCTION calculate_rate(
    p_tenant_id TEXT,
    p_metric_name TEXT,
    p_labels JSONB,
    p_start_time TIMESTAMPTZ,
    p_end_time TIMESTAMPTZ
) RETURNS DOUBLE PRECISION AS $$
DECLARE
    start_value DOUBLE PRECISION;
    end_value DOUBLE PRECISION;
    time_diff_seconds DOUBLE PRECISION;
BEGIN
    -- Get start value
    SELECT value INTO start_value
    FROM metrics_hot
    WHERE tenant_id = p_tenant_id
      AND metric_name = p_metric_name
      AND labels @> p_labels
      AND time >= p_start_time
    ORDER BY time ASC
    LIMIT 1;

    -- Get end value
    SELECT value INTO end_value
    FROM metrics_hot
    WHERE tenant_id = p_tenant_id
      AND metric_name = p_metric_name
      AND labels @> p_labels
      AND time <= p_end_time
    ORDER BY time DESC
    LIMIT 1;

    IF start_value IS NULL OR end_value IS NULL THEN
        RETURN NULL;
    END IF;

    time_diff_seconds := EXTRACT(EPOCH FROM (p_end_time - p_start_time));

    IF time_diff_seconds <= 0 THEN
        RETURN 0;
    END IF;

    RETURN GREATEST(0, end_value - start_value) / time_diff_seconds;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANT PERMISSIONS (adjust as needed)
-- ============================================================================

-- Grant permissions to application user (if exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'timeseries_app') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO timeseries_app;
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO timeseries_app;
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO timeseries_app;
    END IF;
END $$;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE metrics_hot IS 'Hot tier: Full resolution metrics (15s), 7-day retention';
COMMENT ON TABLE metrics_warm IS 'Warm tier: Downsampled metrics (1m), 30-day retention';
COMMENT ON TABLE metrics_cold IS 'Cold tier: Aggregated metrics (1h), 365-day retention';
COMMENT ON TABLE series_metadata IS 'Metadata for tracking unique time-series';
COMMENT ON TABLE retention_policies IS 'Configurable retention policies per metric pattern';
COMMENT ON TABLE tenant_configs IS 'Multi-tenant configuration and resource limits';
COMMENT ON TABLE slo_definitions IS 'SLO definitions with error budget tracking';
COMMENT ON TABLE slo_status_history IS 'Historical SLO compliance and burn rate data';
