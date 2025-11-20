-- Selector Minimization and Query Scope Tracking
-- This migration creates tables for tracking query selector expansion,
-- reason-for-access validation, and proof-of-non-collection audit trails.

-- Table: query_scope_metrics
-- Tracks every query's selector expansion ratio and access scope
CREATE TABLE IF NOT EXISTS query_scope_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    query_id VARCHAR(255) NOT NULL,
    correlation_id VARCHAR(255),

    -- Query details
    query_type VARCHAR(100) NOT NULL, -- 'graphql', 'cypher', 'sql', etc.
    query_name VARCHAR(255),
    query_hash VARCHAR(64), -- SHA-256 hash of normalized query

    -- Selector metrics
    initial_selectors INTEGER NOT NULL DEFAULT 0, -- Number of selectors in original query
    expanded_selectors INTEGER NOT NULL DEFAULT 0, -- Number after expansion/joins
    expansion_ratio DECIMAL(10, 4), -- expanded / initial
    records_accessed INTEGER DEFAULT 0,
    records_returned INTEGER DEFAULT 0,
    selectivity_ratio DECIMAL(10, 4), -- returned / accessed

    -- Access justification
    purpose VARCHAR(255), -- 'investigation', 'reporting', 'analysis', etc.
    reason_for_access TEXT, -- User-provided justification
    reason_required BOOLEAN DEFAULT FALSE,
    reason_provided BOOLEAN DEFAULT FALSE,

    -- Anomaly detection
    is_anomaly BOOLEAN DEFAULT FALSE,
    anomaly_score DECIMAL(10, 4),
    anomaly_reasons TEXT[], -- Array of reasons: 'over_broad', 'unusual_time', etc.

    -- Tripwire tracking
    tripwire_threshold DECIMAL(10, 4), -- Max allowed expansion ratio
    tripwire_triggered BOOLEAN DEFAULT FALSE,
    alert_sent BOOLEAN DEFAULT FALSE,

    -- Performance
    execution_time_ms INTEGER,

    -- Timestamps
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for query scope metrics
CREATE INDEX IF NOT EXISTS idx_query_scope_tenant_time ON query_scope_metrics(tenant_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_scope_user ON query_scope_metrics(user_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_scope_anomaly ON query_scope_metrics(is_anomaly, executed_at DESC) WHERE is_anomaly = TRUE;
CREATE INDEX IF NOT EXISTS idx_query_scope_tripwire ON query_scope_metrics(tripwire_triggered, executed_at DESC) WHERE tripwire_triggered = TRUE;
CREATE INDEX IF NOT EXISTS idx_query_scope_correlation ON query_scope_metrics(correlation_id);
CREATE INDEX IF NOT EXISTS idx_query_scope_expansion ON query_scope_metrics(expansion_ratio DESC);
CREATE INDEX IF NOT EXISTS idx_query_scope_query_hash ON query_scope_metrics(query_hash);

-- Table: selector_minimization_baselines
-- Tracks historical baselines for each query pattern to detect anomalies
CREATE TABLE IF NOT EXISTS selector_minimization_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    query_hash VARCHAR(64) NOT NULL,
    query_type VARCHAR(100) NOT NULL,
    query_name VARCHAR(255),

    -- Statistical baselines
    avg_expansion_ratio DECIMAL(10, 4),
    std_dev_expansion DECIMAL(10, 4),
    p95_expansion_ratio DECIMAL(10, 4),
    p99_expansion_ratio DECIMAL(10, 4),

    avg_records_accessed INTEGER,
    p95_records_accessed INTEGER,

    -- Metadata
    sample_size INTEGER DEFAULT 0,
    last_calculated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, query_hash)
);

CREATE INDEX IF NOT EXISTS idx_baselines_tenant_hash ON selector_minimization_baselines(tenant_id, query_hash);

-- Table: tripwire_config
-- Configuration for tripwire thresholds per tenant/query type
CREATE TABLE IF NOT EXISTS tripwire_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    query_type VARCHAR(100),
    query_pattern VARCHAR(255), -- Regex or name pattern

    -- Thresholds
    max_expansion_ratio DECIMAL(10, 4) DEFAULT 10.0,
    max_records_accessed INTEGER,
    max_selectivity_ratio DECIMAL(10, 4),

    -- Policy
    require_reason BOOLEAN DEFAULT FALSE,
    block_on_violation BOOLEAN DEFAULT FALSE,
    alert_on_violation BOOLEAN DEFAULT TRUE,

    -- Metadata
    created_by VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, query_type, query_pattern)
);

CREATE INDEX IF NOT EXISTS idx_tripwire_tenant ON tripwire_config(tenant_id);

-- Table: proof_of_non_collection_reports
-- Monthly reports proving certain data was NOT collected
CREATE TABLE IF NOT EXISTS proof_of_non_collection_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Report period
    report_month INTEGER NOT NULL, -- 1-12
    report_year INTEGER NOT NULL,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,

    -- Scope
    data_categories TEXT[], -- Categories verified as not collected
    user_cohorts TEXT[], -- User groups included in analysis

    -- Sampling
    total_queries_period INTEGER,
    sampled_queries INTEGER,
    sample_rate DECIMAL(5, 4), -- e.g., 0.05 for 5% sample
    sampling_method VARCHAR(100), -- 'random', 'stratified', 'systematic'

    -- Results
    non_collection_assertions JSONB, -- Detailed assertions
    violations_detected INTEGER DEFAULT 0,
    violation_details JSONB,

    -- Cryptographic proof
    report_hash VARCHAR(64), -- SHA-256 of report content
    signature TEXT, -- Digital signature

    -- Status
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'archived')),

    -- Storage
    report_path TEXT, -- Path to full report file
    archived_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    generated_by VARCHAR(255),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, report_year, report_month)
);

CREATE INDEX IF NOT EXISTS idx_pnc_tenant_period ON proof_of_non_collection_reports(tenant_id, report_year DESC, report_month DESC);
CREATE INDEX IF NOT EXISTS idx_pnc_status ON proof_of_non_collection_reports(status, generated_at DESC);

-- Table: pnc_audit_samples
-- Individual audit samples used in PNC reports
CREATE TABLE IF NOT EXISTS pnc_audit_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pnc_report_id UUID REFERENCES proof_of_non_collection_reports(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,

    -- Sample details
    sample_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    query_scope_metric_id UUID REFERENCES query_scope_metrics(id),

    -- Data category verification
    data_category VARCHAR(255) NOT NULL,
    was_accessed BOOLEAN DEFAULT FALSE,
    was_collected BOOLEAN DEFAULT FALSE,

    -- Evidence
    verification_method VARCHAR(100), -- 'query_analysis', 'log_inspection', etc.
    evidence JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pnc_samples_report ON pnc_audit_samples(pnc_report_id);
CREATE INDEX IF NOT EXISTS idx_pnc_samples_category ON pnc_audit_samples(data_category, was_collected);

-- Table: selector_minimization_alerts
-- Alerts triggered for over-broad queries
CREATE TABLE IF NOT EXISTS selector_minimization_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    query_scope_metric_id UUID REFERENCES query_scope_metrics(id),

    -- Alert details
    alert_type VARCHAR(100) NOT NULL, -- 'expansion_threshold', 'anomaly_detected', 'missing_reason'
    severity VARCHAR(50) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    title VARCHAR(255) NOT NULL,
    description TEXT,

    -- Context
    user_id VARCHAR(255),
    query_hash VARCHAR(64),
    expansion_ratio DECIMAL(10, 4),
    threshold_exceeded DECIMAL(10, 4),

    -- Response
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
    assigned_to VARCHAR(255),
    resolution_notes TEXT,

    -- Timestamps
    triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alerts_tenant_status ON selector_minimization_alerts(tenant_id, status, triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON selector_minimization_alerts(severity, status) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS idx_alerts_user ON selector_minimization_alerts(user_id, triggered_at DESC);

-- Table: tripwire_trend_metrics
-- Aggregated metrics for tracking tripwire reduction over time
CREATE TABLE IF NOT EXISTS tripwire_trend_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Time period
    metric_date DATE NOT NULL,
    period_type VARCHAR(50) DEFAULT 'daily' CHECK (period_type IN ('daily', 'weekly', 'monthly')),

    -- Metrics
    total_queries INTEGER DEFAULT 0,
    tripwire_violations INTEGER DEFAULT 0,
    violation_rate DECIMAL(10, 4), -- violations / total
    avg_expansion_ratio DECIMAL(10, 4),
    p95_expansion_ratio DECIMAL(10, 4),

    -- Trends
    violation_rate_change DECIMAL(10, 4), -- vs previous period
    avg_expansion_change DECIMAL(10, 4), -- vs previous period

    -- Missing reasons
    queries_requiring_reason INTEGER DEFAULT 0,
    reasons_provided INTEGER DEFAULT 0,
    reason_compliance_rate DECIMAL(10, 4),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(tenant_id, metric_date, period_type)
);

CREATE INDEX IF NOT EXISTS idx_trend_tenant_date ON tripwire_trend_metrics(tenant_id, metric_date DESC);

-- Update trigger for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_baselines_updated_at BEFORE UPDATE ON selector_minimization_baselines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tripwire_config_updated_at BEFORE UPDATE ON tripwire_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- View: recent_anomalies
-- Quick access to recent anomalous queries
CREATE OR REPLACE VIEW recent_anomalies AS
SELECT
    qsm.id,
    qsm.tenant_id,
    qsm.user_id,
    qsm.query_name,
    qsm.expansion_ratio,
    qsm.records_accessed,
    qsm.anomaly_score,
    qsm.anomaly_reasons,
    qsm.executed_at,
    a.id AS alert_id,
    a.status AS alert_status
FROM query_scope_metrics qsm
LEFT JOIN selector_minimization_alerts a ON qsm.id = a.query_scope_metric_id
WHERE qsm.is_anomaly = TRUE
    AND qsm.executed_at > NOW() - INTERVAL '7 days'
ORDER BY qsm.executed_at DESC;

-- View: tripwire_dashboard
-- Summary view for monitoring tripwire violations
CREATE OR REPLACE VIEW tripwire_dashboard AS
SELECT
    t.tenant_id,
    t.metric_date,
    t.total_queries,
    t.tripwire_violations,
    t.violation_rate,
    t.avg_expansion_ratio,
    t.violation_rate_change,
    t.reason_compliance_rate,
    COUNT(DISTINCT a.id) FILTER (WHERE a.status = 'open') AS open_alerts
FROM tripwire_trend_metrics t
LEFT JOIN selector_minimization_alerts a
    ON t.tenant_id = a.tenant_id
    AND DATE(a.triggered_at) = t.metric_date
    AND t.period_type = 'daily'
WHERE t.metric_date > CURRENT_DATE - INTERVAL '30 days'
GROUP BY t.tenant_id, t.metric_date, t.total_queries, t.tripwire_violations,
         t.violation_rate, t.avg_expansion_ratio, t.violation_rate_change,
         t.reason_compliance_rate
ORDER BY t.tenant_id, t.metric_date DESC;

-- Comments
COMMENT ON TABLE query_scope_metrics IS 'Tracks selector expansion and access scope for every query';
COMMENT ON TABLE selector_minimization_baselines IS 'Statistical baselines for anomaly detection';
COMMENT ON TABLE tripwire_config IS 'Configurable thresholds for query scope monitoring';
COMMENT ON TABLE proof_of_non_collection_reports IS 'Monthly reports proving data was not collected';
COMMENT ON TABLE pnc_audit_samples IS 'Individual audit samples for PNC reports';
COMMENT ON TABLE selector_minimization_alerts IS 'Alerts for over-broad or anomalous queries';
COMMENT ON TABLE tripwire_trend_metrics IS 'Aggregated metrics showing trends over time';
