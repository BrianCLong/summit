-- Decision Graph Database Schema
-- PostgreSQL migration for Sprint N "Provable Value Slice"

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Entities Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS entities (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    attributes JSONB DEFAULT '{}',
    policy_labels JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ
);

CREATE INDEX idx_entities_tenant ON entities(tenant_id);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_created_at ON entities(created_at DESC);
CREATE INDEX idx_entities_name_search ON entities USING gin(to_tsvector('english', name));

-- ============================================================================
-- Claims Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS claims (
    id VARCHAR(255) PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL REFERENCES entities(id),
    claim_type VARCHAR(100) NOT NULL,
    assertion TEXT NOT NULL,
    confidence_score DECIMAL(4,3) NOT NULL DEFAULT 0.5 CHECK (confidence_score >= 0 AND confidence_score <= 1),
    confidence_level VARCHAR(20) NOT NULL DEFAULT 'medium',
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    evidence_ids JSONB DEFAULT '[]',
    supporting_claim_ids JSONB DEFAULT '[]',
    contradicting_claim_ids JSONB DEFAULT '[]',
    source_type VARCHAR(20) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    policy_labels JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    tenant_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    superseded_by VARCHAR(255) REFERENCES claims(id)
);

CREATE INDEX idx_claims_tenant ON claims(tenant_id);
CREATE INDEX idx_claims_entity ON claims(entity_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_confidence ON claims(confidence_score DESC);
CREATE INDEX idx_claims_created_at ON claims(created_at DESC);
CREATE INDEX idx_claims_hash ON claims(hash);
CREATE INDEX idx_claims_assertion_search ON claims USING gin(to_tsvector('english', assertion));

-- ============================================================================
-- Evidence Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS evidence (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    source_uri VARCHAR(2000) NOT NULL,
    source_type VARCHAR(100) NOT NULL,
    content_hash VARCHAR(128) NOT NULL,
    content_type VARCHAR(100),
    file_size_bytes BIGINT,
    extracted_text TEXT,
    extraction_metadata JSONB DEFAULT '{}',
    reliability_score DECIMAL(4,3) NOT NULL DEFAULT 0.5 CHECK (reliability_score >= 0 AND reliability_score <= 1),
    freshness_date TIMESTAMPTZ NOT NULL,
    retrieval_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date TIMESTAMPTZ,
    license_id VARCHAR(255),
    policy_labels JSONB DEFAULT '[]',
    transform_chain JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    CONSTRAINT unique_content_hash_per_tenant UNIQUE (content_hash, tenant_id)
);

CREATE INDEX idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX idx_evidence_type ON evidence(type);
CREATE INDEX idx_evidence_source_type ON evidence(source_type);
CREATE INDEX idx_evidence_reliability ON evidence(reliability_score DESC);
CREATE INDEX idx_evidence_freshness ON evidence(freshness_date DESC);
CREATE INDEX idx_evidence_content_hash ON evidence(content_hash);
CREATE INDEX idx_evidence_title_search ON evidence USING gin(to_tsvector('english', title));
CREATE INDEX idx_evidence_text_search ON evidence USING gin(to_tsvector('english', extracted_text));

-- ============================================================================
-- Decisions Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS decisions (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(500) NOT NULL,
    question TEXT NOT NULL,
    context TEXT,
    constraints JSONB DEFAULT '[]',
    options JSONB NOT NULL,
    selected_option_id VARCHAR(255),
    recommendation TEXT,
    rationale TEXT,
    claim_ids JSONB DEFAULT '[]',
    evidence_ids JSONB DEFAULT '[]',
    entity_ids JSONB DEFAULT '[]',
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    decision_maker_id VARCHAR(255) NOT NULL,
    decision_maker_type VARCHAR(20) NOT NULL DEFAULT 'human',
    maestro_run_id VARCHAR(255),
    confidence_score DECIMAL(4,3) CHECK (confidence_score >= 0 AND confidence_score <= 1),
    risk_assessment JSONB,
    policy_labels JSONB DEFAULT '[]',
    approval_chain JSONB DEFAULT '[]',
    hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at TIMESTAMPTZ,
    created_by VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    version INTEGER NOT NULL DEFAULT 1,
    superseded_by VARCHAR(255) REFERENCES decisions(id)
);

CREATE INDEX idx_decisions_tenant ON decisions(tenant_id);
CREATE INDEX idx_decisions_type ON decisions(type);
CREATE INDEX idx_decisions_status ON decisions(status);
CREATE INDEX idx_decisions_created_at ON decisions(created_at DESC);
CREATE INDEX idx_decisions_decision_maker ON decisions(decision_maker_id);
CREATE INDEX idx_decisions_maestro_run ON decisions(maestro_run_id);
CREATE INDEX idx_decisions_question_search ON decisions USING gin(to_tsvector('english', question));

-- ============================================================================
-- Provenance Events Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS provenance_events (
    id VARCHAR(255) PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL,
    subject_type VARCHAR(20) NOT NULL,
    subject_id VARCHAR(255) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    details JSONB DEFAULT '{}',
    before_hash VARCHAR(64),
    after_hash VARCHAR(64) NOT NULL,
    parent_event_id VARCHAR(255) REFERENCES provenance_events(id),
    tenant_id VARCHAR(255) NOT NULL
);

CREATE INDEX idx_provenance_tenant ON provenance_events(tenant_id);
CREATE INDEX idx_provenance_subject ON provenance_events(subject_id, subject_type);
CREATE INDEX idx_provenance_actor ON provenance_events(actor_id);
CREATE INDEX idx_provenance_timestamp ON provenance_events(timestamp DESC);
CREATE INDEX idx_provenance_event_type ON provenance_events(event_type);

-- ============================================================================
-- Disclosure Packs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS disclosure_packs (
    id VARCHAR(255) PRIMARY KEY,
    version VARCHAR(20) NOT NULL,
    decision_id VARCHAR(255) NOT NULL REFERENCES decisions(id),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    generated_by VARCHAR(255) NOT NULL,
    format VARCHAR(20) NOT NULL,
    content JSONB NOT NULL,
    merkle_root VARCHAR(64) NOT NULL,
    signature TEXT,
    policy_labels_applied JSONB DEFAULT '[]',
    redactions_applied INTEGER DEFAULT 0,
    tenant_id VARCHAR(255) NOT NULL
);

CREATE INDEX idx_disclosure_tenant ON disclosure_packs(tenant_id);
CREATE INDEX idx_disclosure_decision ON disclosure_packs(decision_id);
CREATE INDEX idx_disclosure_generated_at ON disclosure_packs(generated_at DESC);

-- ============================================================================
-- Audit Log Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_log (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actor_id VARCHAR(255) NOT NULL,
    actor_type VARCHAR(20) NOT NULL DEFAULT 'user',
    tenant_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id VARCHAR(255),
    method VARCHAR(10) NOT NULL,
    path TEXT NOT NULL,
    status_code INTEGER NOT NULL,
    duration_ms INTEGER,
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_audit_tenant ON audit_log(tenant_id);
CREATE INDEX idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);
CREATE INDEX idx_audit_resource ON audit_log(resource_id);
CREATE INDEX idx_audit_action ON audit_log(action);

-- ============================================================================
-- Graph Relationships Table (for Neo4j sync)
-- ============================================================================

CREATE TABLE IF NOT EXISTS graph_relationships (
    id VARCHAR(255) PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    source_id VARCHAR(255) NOT NULL,
    source_type VARCHAR(20) NOT NULL,
    target_id VARCHAR(255) NOT NULL,
    target_type VARCHAR(20) NOT NULL,
    weight DECIMAL(4,3) DEFAULT 1.0,
    confidence DECIMAL(4,3) DEFAULT 1.0,
    attributes JSONB DEFAULT '{}',
    valid_from TIMESTAMPTZ,
    valid_to TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL
);

CREATE INDEX idx_relationships_tenant ON graph_relationships(tenant_id);
CREATE INDEX idx_relationships_source ON graph_relationships(source_id, source_type);
CREATE INDEX idx_relationships_target ON graph_relationships(target_id, target_type);
CREATE INDEX idx_relationships_type ON graph_relationships(type);

-- ============================================================================
-- Triggers for automatic updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_entities_updated_at
    BEFORE UPDATE ON entities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_claims_updated_at
    BEFORE UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_decisions_updated_at
    BEFORE UPDATE ON decisions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Provenance trigger for automatic event logging
-- ============================================================================

CREATE OR REPLACE FUNCTION log_provenance_event()
RETURNS TRIGGER AS $$
DECLARE
    event_type VARCHAR(50);
    before_hash VARCHAR(64);
BEGIN
    IF TG_OP = 'INSERT' THEN
        event_type := 'created';
        before_hash := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        event_type := 'updated';
        before_hash := OLD.hash;
    END IF;

    INSERT INTO provenance_events (
        id, event_type, subject_type, subject_id, actor_id, actor_type,
        timestamp, before_hash, after_hash, tenant_id
    ) VALUES (
        'prov_' || uuid_generate_v4(),
        event_type,
        TG_TABLE_NAME,
        NEW.id,
        COALESCE(current_setting('app.current_user_id', true), 'system'),
        'user',
        NOW(),
        before_hash,
        NEW.hash,
        NEW.tenant_id
    );

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply provenance triggers to key tables
CREATE TRIGGER claims_provenance
    AFTER INSERT OR UPDATE ON claims
    FOR EACH ROW
    EXECUTE FUNCTION log_provenance_event();

CREATE TRIGGER decisions_provenance
    AFTER INSERT OR UPDATE ON decisions
    FOR EACH ROW
    EXECUTE FUNCTION log_provenance_event();
