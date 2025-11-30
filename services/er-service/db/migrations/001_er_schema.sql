-- Entity Resolution Service Database Schema
-- Migration: 001_er_schema.sql
-- Created: 2025-11-28

-- =============================================================================
-- Identity Nodes Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_identity_nodes (
    node_id UUID PRIMARY KEY,
    cluster_id UUID,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    source_ref JSONB NOT NULL,
    attributes JSONB NOT NULL,
    normalized_attributes JSONB NOT NULL DEFAULT '{}',
    feature_vector FLOAT8[],
    confidence FLOAT8 NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT er_identity_nodes_entity_type_check
        CHECK (entity_type IN ('Person', 'Organization', 'Device', 'Account', 'Asset', 'Location', 'Document', 'Event')),
    CONSTRAINT er_identity_nodes_confidence_check
        CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_cluster_id ON er_identity_nodes(cluster_id);
CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_tenant_entity ON er_identity_nodes(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_source_system ON er_identity_nodes((source_ref->>'sourceSystem'));
CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_created_at ON er_identity_nodes(created_at DESC);

-- GIN index for full-text search on attributes
CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_attributes ON er_identity_nodes USING GIN(attributes jsonb_path_ops);
CREATE INDEX IF NOT EXISTS idx_er_identity_nodes_normalized ON er_identity_nodes USING GIN(normalized_attributes jsonb_path_ops);

-- =============================================================================
-- Identity Clusters Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_identity_clusters (
    cluster_id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    node_ids JSONB NOT NULL DEFAULT '[]',
    primary_node_id UUID NOT NULL,
    canonical_attributes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    cohesion_score FLOAT8 NOT NULL DEFAULT 0.5,
    confidence FLOAT8 NOT NULL DEFAULT 0.5,
    merge_history JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version INTEGER NOT NULL DEFAULT 1,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    locked_by VARCHAR(255),
    locked_at TIMESTAMPTZ,
    locked_reason TEXT,

    CONSTRAINT er_identity_clusters_entity_type_check
        CHECK (entity_type IN ('Person', 'Organization', 'Device', 'Account', 'Asset', 'Location', 'Document', 'Event')),
    CONSTRAINT er_identity_clusters_cohesion_check
        CHECK (cohesion_score >= 0 AND cohesion_score <= 1),
    CONSTRAINT er_identity_clusters_confidence_check
        CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_er_identity_clusters_tenant_entity ON er_identity_clusters(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_er_identity_clusters_updated_at ON er_identity_clusters(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_er_identity_clusters_cohesion ON er_identity_clusters(cohesion_score);

-- GIN index to search for clusters containing a specific node
CREATE INDEX IF NOT EXISTS idx_er_identity_clusters_node_ids ON er_identity_clusters USING GIN(node_ids jsonb_path_ops);

-- =============================================================================
-- Review Queue Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_review_queue (
    review_id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    node_a_id UUID NOT NULL,
    node_b_id UUID NOT NULL,
    node_a_snapshot JSONB NOT NULL,
    node_b_snapshot JSONB NOT NULL,
    match_score FLOAT8 NOT NULL,
    features JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    assigned_to VARCHAR(255),
    due_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decision VARCHAR(50),
    decided_by VARCHAR(255),
    decided_at TIMESTAMPTZ,
    notes TEXT,
    conflicting_attributes JSONB NOT NULL DEFAULT '[]',
    shared_relationships INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT er_review_queue_entity_type_check
        CHECK (entity_type IN ('Person', 'Organization', 'Device', 'Account', 'Asset', 'Location', 'Document', 'Event')),
    CONSTRAINT er_review_queue_status_check
        CHECK (status IN ('PENDING', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'ESCALATED')),
    CONSTRAINT er_review_queue_priority_check
        CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    CONSTRAINT er_review_queue_match_score_check
        CHECK (match_score >= 0 AND match_score <= 1)
);

CREATE INDEX IF NOT EXISTS idx_er_review_queue_tenant_status ON er_review_queue(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_er_review_queue_priority ON er_review_queue(priority, due_at NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_er_review_queue_assigned ON er_review_queue(assigned_to) WHERE assigned_to IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_er_review_queue_nodes ON er_review_queue(node_a_id, node_b_id);

-- Prevent duplicate review items for the same node pair
CREATE UNIQUE INDEX IF NOT EXISTS idx_er_review_queue_unique_pair
    ON er_review_queue(LEAST(node_a_id, node_b_id), GREATEST(node_a_id, node_b_id))
    WHERE status IN ('PENDING', 'IN_REVIEW');

-- =============================================================================
-- Batch Jobs Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_batch_jobs (
    job_id UUID PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    dataset_ref VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    total_records INTEGER NOT NULL DEFAULT 0,
    processed_records INTEGER NOT NULL DEFAULT 0,
    merged_records INTEGER NOT NULL DEFAULT 0,
    new_clusters INTEGER NOT NULL DEFAULT 0,
    review_required INTEGER NOT NULL DEFAULT 0,
    errors INTEGER NOT NULL DEFAULT 0,
    error_details JSONB DEFAULT '[]',
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    estimated_completion TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    matcher_version VARCHAR(50) NOT NULL,
    thresholds JSONB NOT NULL,

    CONSTRAINT er_batch_jobs_entity_type_check
        CHECK (entity_type IN ('Person', 'Organization', 'Device', 'Account', 'Asset', 'Location', 'Document', 'Event')),
    CONSTRAINT er_batch_jobs_status_check
        CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'))
);

CREATE INDEX IF NOT EXISTS idx_er_batch_jobs_tenant_status ON er_batch_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_er_batch_jobs_created_at ON er_batch_jobs(created_at DESC);

-- =============================================================================
-- Batch Results Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_batch_results (
    id SERIAL PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES er_batch_jobs(job_id) ON DELETE CASCADE,
    record_id VARCHAR(255) NOT NULL,
    node_id UUID NOT NULL,
    cluster_id UUID,
    decision VARCHAR(50) NOT NULL,
    score FLOAT8,
    matched_with_node_id UUID,
    review_id UUID,
    processing_time_ms INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT er_batch_results_decision_check
        CHECK (decision IN ('AUTO_MERGE', 'CANDIDATE', 'AUTO_NO_MATCH', 'MANUAL_MERGE', 'MANUAL_NO_MATCH', 'MANUAL_SPLIT'))
);

CREATE INDEX IF NOT EXISTS idx_er_batch_results_job_id ON er_batch_results(job_id);
CREATE INDEX IF NOT EXISTS idx_er_batch_results_timestamp ON er_batch_results(timestamp);

-- =============================================================================
-- Resolution Thresholds Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_resolution_thresholds (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    auto_merge_threshold FLOAT8 NOT NULL DEFAULT 0.9,
    candidate_threshold FLOAT8 NOT NULL DEFAULT 0.6,
    auto_no_match_threshold FLOAT8 NOT NULL DEFAULT 0.3,
    feature_weights JSONB NOT NULL DEFAULT '{}',
    deterministic_features JSONB NOT NULL DEFAULT '[]',
    required_features JSONB NOT NULL DEFAULT '[]',
    version VARCHAR(50) NOT NULL,
    effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    effective_to TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT er_resolution_thresholds_entity_type_check
        CHECK (entity_type IN ('Person', 'Organization', 'Device', 'Account', 'Asset', 'Location', 'Document', 'Event')),
    CONSTRAINT er_resolution_thresholds_ranges_check
        CHECK (
            auto_merge_threshold >= 0 AND auto_merge_threshold <= 1 AND
            candidate_threshold >= 0 AND candidate_threshold <= 1 AND
            auto_no_match_threshold >= 0 AND auto_no_match_threshold <= 1 AND
            auto_no_match_threshold <= candidate_threshold AND
            candidate_threshold <= auto_merge_threshold
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_er_resolution_thresholds_active
    ON er_resolution_thresholds(tenant_id, entity_type)
    WHERE effective_to IS NULL;

-- =============================================================================
-- Match Audit Log Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS er_match_audit_log (
    id SERIAL PRIMARY KEY,
    tenant_id VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    node_a_id UUID NOT NULL,
    node_b_id UUID NOT NULL,
    cluster_id UUID,
    decision VARCHAR(50) NOT NULL,
    score FLOAT8 NOT NULL,
    features JSONB NOT NULL,
    decided_by VARCHAR(255) NOT NULL,
    decision_reason TEXT,
    matcher_version VARCHAR(50) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_er_match_audit_log_tenant ON er_match_audit_log(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_er_match_audit_log_nodes ON er_match_audit_log(node_a_id, node_b_id);
CREATE INDEX IF NOT EXISTS idx_er_match_audit_log_cluster ON er_match_audit_log(cluster_id) WHERE cluster_id IS NOT NULL;

-- =============================================================================
-- Helper Functions
-- =============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
DROP TRIGGER IF EXISTS update_er_identity_nodes_updated_at ON er_identity_nodes;
CREATE TRIGGER update_er_identity_nodes_updated_at
    BEFORE UPDATE ON er_identity_nodes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_er_identity_clusters_updated_at ON er_identity_clusters;
CREATE TRIGGER update_er_identity_clusters_updated_at
    BEFORE UPDATE ON er_identity_clusters
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_er_review_queue_updated_at ON er_review_queue;
CREATE TRIGGER update_er_review_queue_updated_at
    BEFORE UPDATE ON er_review_queue
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE er_identity_nodes IS 'Source records normalized into identity nodes for resolution';
COMMENT ON TABLE er_identity_clusters IS 'Clusters of identity nodes representing the same real-world entity';
COMMENT ON TABLE er_review_queue IS 'Queue of candidate matches requiring human review';
COMMENT ON TABLE er_batch_jobs IS 'Batch resolution job tracking';
COMMENT ON TABLE er_batch_results IS 'Results from batch resolution jobs';
COMMENT ON TABLE er_resolution_thresholds IS 'Configurable thresholds for match decisions per entity type';
COMMENT ON TABLE er_match_audit_log IS 'Audit trail of all match decisions for compliance';
