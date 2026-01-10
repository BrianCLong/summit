-- Provenance & Integrity Gateway (PIG) Database Schema
-- Epic: Information Warfare Defense - Official Content Firewall
--
-- This migration creates tables for:
-- - Signed assets (official content with cryptographic credentials)
-- - Truth bundles (incident response packages)
-- - Narrative clusters (disinformation tracking)
-- - Governance configuration
-- - Approval workflows
-- - Risk register

BEGIN;

-- =============================================================================
-- Signed Assets Table
-- Stores official content signed with cryptographic credentials
-- =============================================================================

CREATE TABLE IF NOT EXISTS signed_assets (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    asset_type VARCHAR(50) NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_uri TEXT NOT NULL,
    public_url TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    previous_version_id VARCHAR(64) REFERENCES signed_assets(id),
    signature JSONB NOT NULL,
    c2pa_manifest JSONB,
    revocation JSONB,
    distributions JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    classification VARCHAR(50),
    expires_at TIMESTAMPTZ,
    metadata JSONB,
    perceptual_hash VARCHAR(128),

    CONSTRAINT signed_assets_status_check CHECK (
        status IN ('draft', 'pending_approval', 'approved', 'published', 'revoked', 'expired', 'superseded')
    ),
    CONSTRAINT signed_assets_asset_type_check CHECK (
        asset_type IN ('press_release', 'official_statement', 'executive_video', 'incident_update',
                       'social_card', 'policy_document', 'media_kit', 'brand_asset', 'certification', 'report', 'other')
    )
);

CREATE INDEX IF NOT EXISTS idx_signed_assets_tenant ON signed_assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_signed_assets_status ON signed_assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_signed_assets_type ON signed_assets(tenant_id, asset_type);
CREATE INDEX IF NOT EXISTS idx_signed_assets_hash ON signed_assets(content_hash);
CREATE INDEX IF NOT EXISTS idx_signed_assets_perceptual ON signed_assets(perceptual_hash);
CREATE INDEX IF NOT EXISTS idx_signed_assets_created ON signed_assets(tenant_id, created_at DESC);

-- Function for computing Hamming distance between perceptual hashes
CREATE OR REPLACE FUNCTION pig_hamming_distance(hash1 VARCHAR, hash2 VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    distance INTEGER := 0;
    i INTEGER;
    h1 BIT VARYING;
    h2 BIT VARYING;
BEGIN
    IF hash1 IS NULL OR hash2 IS NULL THEN
        RETURN 999;
    END IF;

    h1 := ('x' || hash1)::BIT VARYING;
    h2 := ('x' || hash2)::BIT VARYING;

    FOR i IN 0..LEAST(LENGTH(h1), LENGTH(h2))-1 LOOP
        IF GET_BIT(h1, i) != GET_BIT(h2, i) THEN
            distance := distance + 1;
        END IF;
    END LOOP;

    RETURN distance;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- Truth Bundles Table
-- Stores incident response packages for deepfake/impersonation incidents
-- =============================================================================

CREATE TABLE IF NOT EXISTS truth_bundles (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(64) NOT NULL,
    incident JSONB NOT NULL,
    original_asset_id VARCHAR(64) REFERENCES signed_assets(id),
    fraudulent_content JSONB NOT NULL,
    diff_highlights JSONB NOT NULL DEFAULT '[]'::JSONB,
    timeline JSONB NOT NULL DEFAULT '[]'::JSONB,
    distribution_map JSONB NOT NULL DEFAULT '[]'::JSONB,
    recommended_response JSONB NOT NULL,
    signature JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    external_references JSONB,

    CONSTRAINT truth_bundles_status_check CHECK (
        status IN ('draft', 'published', 'archived')
    )
);

CREATE INDEX IF NOT EXISTS idx_truth_bundles_tenant ON truth_bundles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_truth_bundles_status ON truth_bundles(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_truth_bundles_created ON truth_bundles(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_truth_bundles_incident_type ON truth_bundles((incident->>'type'));
CREATE INDEX IF NOT EXISTS idx_truth_bundles_severity ON truth_bundles((incident->>'severity'));

-- =============================================================================
-- Narrative Clusters Table
-- Tracks disinformation campaigns and narrative conflicts
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_narrative_clusters (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    theme TEXT NOT NULL,
    keywords TEXT[] NOT NULL DEFAULT '{}',
    sentiment REAL NOT NULL DEFAULT 0,
    content_items JSONB NOT NULL DEFAULT '[]'::JSONB,
    first_detected TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    velocity REAL NOT NULL DEFAULT 0,
    estimated_reach BIGINT NOT NULL DEFAULT 0,
    risk_score INTEGER NOT NULL DEFAULT 0,
    risk_assessment JSONB NOT NULL,
    related_entities TEXT[] NOT NULL DEFAULT '{}',
    source_analysis JSONB NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'active',

    CONSTRAINT narrative_clusters_status_check CHECK (
        status IN ('active', 'declining', 'dormant', 'resolved')
    )
);

CREATE INDEX IF NOT EXISTS idx_narrative_clusters_tenant ON pig_narrative_clusters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_narrative_clusters_status ON pig_narrative_clusters(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_narrative_clusters_risk ON pig_narrative_clusters(tenant_id, risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_narrative_clusters_activity ON pig_narrative_clusters(tenant_id, last_activity DESC);
CREATE INDEX IF NOT EXISTS idx_narrative_clusters_theme ON pig_narrative_clusters USING gin(to_tsvector('english', theme));
CREATE INDEX IF NOT EXISTS idx_narrative_clusters_keywords ON pig_narrative_clusters USING gin(keywords);

-- =============================================================================
-- Governance Configuration Table
-- Stores per-tenant governance policies
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_governance_configs (
    tenant_id VARCHAR(64) PRIMARY KEY,
    config JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(64) NOT NULL
);

-- =============================================================================
-- Approval Requests Table
-- Tracks approval workflow for assets
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_approval_requests (
    id VARCHAR(64) PRIMARY KEY,
    asset_id VARCHAR(64) NOT NULL REFERENCES signed_assets(id),
    tenant_id VARCHAR(64) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    submitted_by VARCHAR(64) NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    approvals JSONB NOT NULL DEFAULT '[]'::JSONB,
    required_approvals INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT approval_requests_status_check CHECK (
        status IN ('pending', 'approved', 'rejected', 'auto_approved', 'expired')
    )
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_tenant ON pig_approval_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON pig_approval_requests(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_asset ON pig_approval_requests(asset_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_expires ON pig_approval_requests(expires_at) WHERE status = 'pending';

-- =============================================================================
-- Risk Register Table
-- Tracks identified risks and treatment plans
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_risk_register (
    id VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    likelihood INTEGER NOT NULL CHECK (likelihood BETWEEN 1 AND 5),
    impact INTEGER NOT NULL CHECK (impact BETWEEN 1 AND 5),
    current_controls JSONB NOT NULL DEFAULT '[]'::JSONB,
    residual_risk INTEGER NOT NULL CHECK (residual_risk BETWEEN 1 AND 25),
    treatment_plan TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    owner VARCHAR(100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(64) NOT NULL,

    CONSTRAINT risk_register_status_check CHECK (
        status IN ('open', 'mitigated', 'accepted', 'closed')
    )
);

CREATE INDEX IF NOT EXISTS idx_risk_register_tenant ON pig_risk_register(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risk_register_status ON pig_risk_register(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_register_risk ON pig_risk_register(tenant_id, residual_risk DESC);

-- =============================================================================
-- Content Verification Cache Table
-- Caches verification results for performance
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_verification_cache (
    content_hash VARCHAR(64) PRIMARY KEY,
    tenant_id VARCHAR(64) NOT NULL,
    verification_result JSONB NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours')
);

CREATE INDEX IF NOT EXISTS idx_verification_cache_tenant ON pig_verification_cache(tenant_id);
CREATE INDEX IF NOT EXISTS idx_verification_cache_expires ON pig_verification_cache(expires_at);

-- Cleanup expired cache entries
CREATE OR REPLACE FUNCTION pig_cleanup_verification_cache()
RETURNS void AS $$
BEGIN
    DELETE FROM pig_verification_cache WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- Audit Events for PIG
-- Extended audit logging for provenance operations
-- =============================================================================

CREATE TABLE IF NOT EXISTS pig_audit_events (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'pae_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || SUBSTR(MD5(RANDOM()::TEXT), 1, 8),
    tenant_id VARCHAR(64) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    event_type VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(64),
    actor_id VARCHAR(64) NOT NULL,
    actor_type VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL,
    outcome VARCHAR(30) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(64),
    correlation_id VARCHAR(64),

    CONSTRAINT pig_audit_actor_type_check CHECK (
        actor_type IN ('user', 'system', 'api', 'job')
    ),
    CONSTRAINT pig_audit_outcome_check CHECK (
        outcome IN ('success', 'failure', 'error', 'denied')
    )
);

CREATE INDEX IF NOT EXISTS idx_pig_audit_tenant ON pig_audit_events(tenant_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pig_audit_type ON pig_audit_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_pig_audit_resource ON pig_audit_events(tenant_id, resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_pig_audit_actor ON pig_audit_events(tenant_id, actor_id);

-- Partition audit events by month for performance
-- (In production, implement actual partitioning)

-- =============================================================================
-- Views for Common Queries
-- =============================================================================

-- Active high-risk narratives view
CREATE OR REPLACE VIEW pig_high_risk_narratives AS
SELECT
    id,
    tenant_id,
    theme,
    keywords,
    risk_score,
    risk_assessment->'category' as risk_category,
    risk_assessment->'dsaSystemicRisk' as dsa_risk,
    velocity,
    estimated_reach,
    last_activity
FROM pig_narrative_clusters
WHERE status = 'active' AND risk_score >= 70
ORDER BY risk_score DESC, last_activity DESC;

-- Asset health dashboard view
CREATE OR REPLACE VIEW pig_asset_health AS
SELECT
    tenant_id,
    COUNT(*) FILTER (WHERE status = 'published') as published_count,
    COUNT(*) FILTER (WHERE status = 'revoked') as revoked_count,
    COUNT(*) FILTER (WHERE status = 'expired' OR expires_at < NOW()) as expired_count,
    COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval_count,
    COUNT(*) as total_count,
    MAX(created_at) as latest_asset_date
FROM signed_assets
GROUP BY tenant_id;

-- Compliance summary view
CREATE OR REPLACE VIEW pig_compliance_summary AS
SELECT
    gc.tenant_id,
    gc.config->>'requireInboundVerification' as inbound_verification,
    gc.config->>'requireOutboundSigning' as outbound_signing,
    gc.config->'approvalWorkflow'->>'enabled' as approval_workflow,
    gc.config->'impersonationMonitoring'->>'enabled' as monitoring_enabled,
    gc.config->>'auditRetentionDays' as retention_days,
    gc.updated_at as config_updated_at,
    ah.published_count,
    ah.revoked_count,
    (SELECT COUNT(*) FROM pig_narrative_clusters nc WHERE nc.tenant_id = gc.tenant_id AND nc.status = 'active') as active_narratives,
    (SELECT COUNT(*) FROM truth_bundles tb WHERE tb.tenant_id = gc.tenant_id) as truth_bundles_count
FROM pig_governance_configs gc
LEFT JOIN pig_asset_health ah ON gc.tenant_id = ah.tenant_id;

-- =============================================================================
-- Triggers for Automatic Updates
-- =============================================================================

-- Update last_activity on narrative clusters when content is added
CREATE OR REPLACE FUNCTION pig_update_cluster_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_cluster_activity
    BEFORE UPDATE ON pig_narrative_clusters
    FOR EACH ROW
    EXECUTE FUNCTION pig_update_cluster_activity();

-- Auto-expire pending approval requests
CREATE OR REPLACE FUNCTION pig_expire_approval_requests()
RETURNS void AS $$
BEGIN
    UPDATE pig_approval_requests
    SET status = 'expired', resolved_at = NOW()
    WHERE status = 'pending' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Update signed_assets updated_at on modification
CREATE OR REPLACE FUNCTION pig_update_asset_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_asset_updated
    BEFORE UPDATE ON signed_assets
    FOR EACH ROW
    EXECUTE FUNCTION pig_update_asset_timestamp();

-- =============================================================================
-- Row Level Security (if enabled)
-- =============================================================================

-- Enable RLS on main tables
ALTER TABLE signed_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE truth_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pig_narrative_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE pig_approval_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pig_risk_register ENABLE ROW LEVEL SECURITY;

-- Create tenant isolation policies (example - adjust for your auth model)
-- These policies use the current_setting function to get tenant context

CREATE POLICY signed_assets_tenant_isolation ON signed_assets
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY truth_bundles_tenant_isolation ON truth_bundles
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY narrative_clusters_tenant_isolation ON pig_narrative_clusters
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY approval_requests_tenant_isolation ON pig_approval_requests
    USING (tenant_id = current_setting('app.current_tenant', true));

CREATE POLICY risk_register_tenant_isolation ON pig_risk_register
    USING (tenant_id = current_setting('app.current_tenant', true));

-- Grant permissions to application role (adjust role name as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO summit_app;
-- GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO summit_app;

COMMIT;

-- =============================================================================
-- Comments for Documentation
-- =============================================================================

COMMENT ON TABLE signed_assets IS 'Official content signed with cryptographic credentials for authenticity verification';
COMMENT ON TABLE truth_bundles IS 'Incident response packages for deepfake and impersonation incidents';
COMMENT ON TABLE pig_narrative_clusters IS 'Tracked disinformation campaigns and narrative conflicts';
COMMENT ON TABLE pig_governance_configs IS 'Per-tenant governance configuration for PIG';
COMMENT ON TABLE pig_approval_requests IS 'Approval workflow tracking for asset publication';
COMMENT ON TABLE pig_risk_register IS 'Risk management entries aligned with NIST AI RMF';
COMMENT ON TABLE pig_verification_cache IS 'Cached content verification results for performance';
COMMENT ON TABLE pig_audit_events IS 'Extended audit logging for provenance operations';

COMMENT ON FUNCTION pig_hamming_distance IS 'Computes Hamming distance between perceptual hashes for near-duplicate detection';
