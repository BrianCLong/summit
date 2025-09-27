-- Entity Resolution Adjudication Queue Migration
-- Creates tables for confidence scoring, candidate management, and decision auditing

-- Main entity resolution candidates table
CREATE TABLE er_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Primary entity (the one being merged into)
    primary_entity_id VARCHAR(255) NOT NULL,
    primary_entity_type VARCHAR(100) NOT NULL,
    primary_entity_data JSONB NOT NULL,

    -- Candidate entity (the one being considered for merge)
    candidate_entity_id VARCHAR(255) NOT NULL,
    candidate_entity_type VARCHAR(100) NOT NULL,
    candidate_entity_data JSONB NOT NULL,

    -- Confidence scoring
    confidence_score DECIMAL(5,4) NOT NULL CHECK (confidence_score >= 0.0 AND confidence_score <= 1.0),
    confidence_band VARCHAR(20) NOT NULL CHECK (confidence_band IN ('LOW', 'MID', 'HIGH')),

    -- Algorithm details
    algorithm_version VARCHAR(50) NOT NULL,
    similarity_factors JSONB NOT NULL, -- Detailed breakdown of what contributed to score

    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_MERGED', 'EXPIRED')),
    queue_priority INTEGER NOT NULL DEFAULT 0,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,

    -- Constraints
    UNIQUE(tenant_id, primary_entity_id, candidate_entity_id),
    INDEX idx_er_candidates_tenant_status (tenant_id, status),
    INDEX idx_er_candidates_confidence (confidence_band, confidence_score DESC),
    INDEX idx_er_candidates_queue (tenant_id, status, queue_priority DESC, created_at),
    INDEX idx_er_candidates_expiry (expires_at) WHERE expires_at IS NOT NULL
);

-- Entity resolution decisions audit log
CREATE TABLE er_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    candidate_id UUID NOT NULL REFERENCES er_candidates(id) ON DELETE CASCADE,

    -- Decision details
    decision VARCHAR(20) NOT NULL CHECK (decision IN ('APPROVE', 'REJECT', 'SOFT_SPLIT', 'UNDO')),
    decision_reason TEXT,

    -- User who made the decision
    decided_by_user_id VARCHAR(255),
    decided_by_system BOOLEAN NOT NULL DEFAULT FALSE,

    -- Timing
    decided_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Previous state for undo operations
    previous_status VARCHAR(20),
    previous_decision_id UUID REFERENCES er_decisions(id),

    -- Metadata
    decision_metadata JSONB, -- Additional context like UI source, confidence override, etc.

    INDEX idx_er_decisions_candidate (candidate_id),
    INDEX idx_er_decisions_user (decided_by_user_id, decided_at DESC),
    INDEX idx_er_decisions_system (decided_by_system, decided_at DESC)
);

-- Confidence band thresholds configuration
CREATE TABLE er_confidence_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Thresholds for confidence bands
    high_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.92 CHECK (high_threshold >= 0.0 AND high_threshold <= 1.0),
    mid_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.75 CHECK (mid_threshold >= 0.0 AND mid_threshold <= 1.0),

    -- Auto-merge settings
    auto_merge_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    auto_merge_threshold DECIMAL(5,4) NOT NULL DEFAULT 0.95,

    -- Queue management
    queue_ttl_hours INTEGER NOT NULL DEFAULT 168, -- 7 days default
    max_queue_size INTEGER NOT NULL DEFAULT 10000,

    -- Algorithm settings
    algorithm_version VARCHAR(50) NOT NULL DEFAULT 'similarity-v1.0',
    algorithm_config JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id),
    CHECK (high_threshold > mid_threshold)
);

-- Insert default configuration
INSERT INTO er_confidence_config (tenant_id, high_threshold, mid_threshold, auto_merge_enabled)
VALUES ('default', 0.92, 0.75, true);

-- Entity similarity factors lookup table
CREATE TABLE er_similarity_factors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Factor identification
    factor_name VARCHAR(100) NOT NULL,
    factor_type VARCHAR(50) NOT NULL, -- 'exact_match', 'fuzzy_match', 'semantic', 'structural'
    factor_weight DECIMAL(3,2) NOT NULL DEFAULT 1.0,

    -- Entity type applicability
    applicable_entity_types TEXT[], -- Array of entity types this factor applies to

    -- Configuration
    algorithm_config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT TRUE,

    -- Metadata
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(factor_name)
);

-- Insert default similarity factors
INSERT INTO er_similarity_factors (factor_name, factor_type, factor_weight, applicable_entity_types, description) VALUES
('name_exact_match', 'exact_match', 0.4, ARRAY['Person', 'Company', 'Organization'], 'Exact match on primary name field'),
('name_fuzzy_match', 'fuzzy_match', 0.3, ARRAY['Person', 'Company', 'Organization'], 'Fuzzy string match on name (Levenshtein distance)'),
('email_exact_match', 'exact_match', 0.8, ARRAY['Person'], 'Exact match on email address'),
('phone_exact_match', 'exact_match', 0.7, ARRAY['Person'], 'Exact match on phone number'),
('address_fuzzy_match', 'fuzzy_match', 0.2, ARRAY['Person', 'Company', 'Organization'], 'Fuzzy match on address components'),
('ein_exact_match', 'exact_match', 0.9, ARRAY['Company'], 'Exact match on EIN/tax ID'),
('website_exact_match', 'exact_match', 0.6, ARRAY['Company', 'Organization'], 'Exact match on website URL'),
('account_number_exact_match', 'exact_match', 0.95, ARRAY['Account'], 'Exact match on account number'),
('social_network_overlap', 'structural', 0.3, ARRAY['Person'], 'Overlap in social connections/relationships'),
('transaction_pattern_similarity', 'semantic', 0.4, ARRAY['Account', 'Person'], 'Similarity in transaction patterns');

-- Entity resolution metrics table for monitoring
CREATE TABLE er_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,

    -- Time window
    measurement_date DATE NOT NULL,
    measurement_hour INTEGER NOT NULL CHECK (measurement_hour >= 0 AND measurement_hour <= 23),

    -- Candidate metrics
    candidates_created INTEGER NOT NULL DEFAULT 0,
    candidates_auto_merged INTEGER NOT NULL DEFAULT 0,
    candidates_manually_approved INTEGER NOT NULL DEFAULT 0,
    candidates_manually_rejected INTEGER NOT NULL DEFAULT 0,
    candidates_expired INTEGER NOT NULL DEFAULT 0,

    -- Queue metrics
    queue_size_start INTEGER NOT NULL DEFAULT 0,
    queue_size_end INTEGER NOT NULL DEFAULT 0,
    avg_time_in_queue_minutes DECIMAL(10,2),

    -- Confidence band distribution
    high_confidence_count INTEGER NOT NULL DEFAULT 0,
    mid_confidence_count INTEGER NOT NULL DEFAULT 0,
    low_confidence_count INTEGER NOT NULL DEFAULT 0,

    -- Precision/recall approximations
    estimated_precision DECIMAL(5,4),
    estimated_recall DECIMAL(5,4),

    -- Performance metrics
    avg_processing_time_ms DECIMAL(10,2),

    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    UNIQUE(tenant_id, measurement_date, measurement_hour),
    INDEX idx_er_metrics_tenant_date (tenant_id, measurement_date DESC)
);

-- Views for common queries

-- Current queue view (only pending items)
CREATE VIEW er_queue_current AS
SELECT
    c.id,
    c.tenant_id,
    c.primary_entity_id,
    c.primary_entity_type,
    c.candidate_entity_id,
    c.candidate_entity_type,
    c.confidence_score,
    c.confidence_band,
    c.similarity_factors,
    c.queue_priority,
    c.created_at,
    c.expires_at,

    -- Time in queue
    EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - c.created_at))/60 AS minutes_in_queue,

    -- Expiry status
    CASE
        WHEN c.expires_at IS NOT NULL AND c.expires_at < CURRENT_TIMESTAMP THEN true
        ELSE false
    END AS is_expired
FROM er_candidates c
WHERE c.status = 'PENDING'
ORDER BY c.queue_priority DESC, c.created_at;

-- Decisions summary view
CREATE VIEW er_decisions_summary AS
SELECT
    c.tenant_id,
    c.confidence_band,
    d.decision,
    COUNT(*) as decision_count,
    AVG(c.confidence_score) as avg_confidence,
    AVG(EXTRACT(EPOCH FROM (d.decided_at - c.created_at))/60) as avg_decision_time_minutes
FROM er_candidates c
JOIN er_decisions d ON c.id = d.candidate_id
WHERE d.decided_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY c.tenant_id, c.confidence_band, d.decision;

-- Performance monitoring view
CREATE VIEW er_performance_metrics AS
SELECT
    tenant_id,
    measurement_date,

    -- Daily totals
    SUM(candidates_created) as total_candidates,
    SUM(candidates_auto_merged) as total_auto_merged,
    SUM(candidates_manually_approved) as total_approved,
    SUM(candidates_manually_rejected) as total_rejected,

    -- Auto-merge rate
    CASE
        WHEN SUM(candidates_created) > 0
        THEN ROUND(SUM(candidates_auto_merged)::DECIMAL / SUM(candidates_created), 4)
        ELSE 0
    END as auto_merge_rate,

    -- Queue efficiency
    AVG(avg_time_in_queue_minutes) as avg_queue_time_minutes,
    MAX(queue_size_end) as peak_queue_size,

    -- Confidence distribution
    ROUND(AVG(high_confidence_count::DECIMAL / NULLIF(candidates_created, 0)), 4) as high_confidence_ratio,
    ROUND(AVG(mid_confidence_count::DECIMAL / NULLIF(candidates_created, 0)), 4) as mid_confidence_ratio,

    -- Quality metrics
    AVG(estimated_precision) as avg_precision,
    AVG(estimated_recall) as avg_recall

FROM er_metrics
GROUP BY tenant_id, measurement_date
ORDER BY tenant_id, measurement_date DESC;

-- Triggers for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER er_candidates_update_timestamp
    BEFORE UPDATE ON er_candidates
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER er_confidence_config_update_timestamp
    BEFORE UPDATE ON er_confidence_config
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamp();

-- Function to automatically expire old candidates
CREATE OR REPLACE FUNCTION expire_old_candidates()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE er_candidates
    SET status = 'EXPIRED', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'PENDING'
      AND expires_at IS NOT NULL
      AND expires_at < CURRENT_TIMESTAMP;

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_er_candidates_similarity_gin
ON er_candidates USING GIN (similarity_factors);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_er_candidates_entity_lookup
ON er_candidates (tenant_id, primary_entity_type, primary_entity_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_er_candidates_candidate_lookup
ON er_candidates (tenant_id, candidate_entity_type, candidate_entity_id);

-- Comments for documentation
COMMENT ON TABLE er_candidates IS 'Entity resolution candidates awaiting human adjudication';
COMMENT ON TABLE er_decisions IS 'Audit log of all entity resolution decisions';
COMMENT ON TABLE er_confidence_config IS 'Per-tenant configuration for confidence thresholds';
COMMENT ON TABLE er_similarity_factors IS 'Configuration for similarity calculation factors';
COMMENT ON TABLE er_metrics IS 'Time-series metrics for ER system performance monitoring';

COMMENT ON COLUMN er_candidates.confidence_score IS 'Numeric confidence score from 0.0 to 1.0';
COMMENT ON COLUMN er_candidates.confidence_band IS 'Categorical confidence: LOW (<0.75), MID (0.75-0.92), HIGH (>0.92)';
COMMENT ON COLUMN er_candidates.similarity_factors IS 'JSON breakdown of what factors contributed to the similarity score';
COMMENT ON COLUMN er_candidates.queue_priority IS 'Higher numbers = higher priority in queue';

-- Initial data for testing/demo
INSERT INTO er_candidates (
    tenant_id,
    primary_entity_id,
    primary_entity_type,
    primary_entity_data,
    candidate_entity_id,
    candidate_entity_type,
    candidate_entity_data,
    confidence_score,
    confidence_band,
    algorithm_version,
    similarity_factors,
    queue_priority
) VALUES
(
    'demo',
    'person_001',
    'Person',
    '{"name": "John Smith", "email": "john.smith@email.com", "phone": "+1-555-0123"}',
    'person_002',
    'Person',
    '{"name": "Jon Smith", "email": "j.smith@email.com", "phone": "+1-555-0123"}',
    0.87,
    'MID',
    'similarity-v1.0',
    '{"name_fuzzy_match": 0.9, "email_fuzzy_match": 0.7, "phone_exact_match": 1.0}',
    5
),
(
    'demo',
    'company_001',
    'Company',
    '{"name": "Acme Corp", "website": "acme.com", "ein": "12-3456789"}',
    'company_002',
    'Company',
    '{"name": "ACME Corporation", "website": "www.acme.com", "ein": "12-3456789"}',
    0.95,
    'HIGH',
    'similarity-v1.0',
    '{"name_fuzzy_match": 0.85, "website_fuzzy_match": 0.9, "ein_exact_match": 1.0}',
    10
);