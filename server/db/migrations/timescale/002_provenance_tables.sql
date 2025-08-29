-- Provenance Ledger Tables for IntelGraph GA-Core
-- Committee Requirements: Immutable disclosure bundles, hash manifests, chain of custody

-- Provenance chain table (Committee requirement: immutable audit trail)
CREATE TABLE IF NOT EXISTS provenance_chain (
    id UUID PRIMARY KEY,
    parent_hash VARCHAR(64),
    content_hash VARCHAR(64) NOT NULL,
    operation_type VARCHAR(100) NOT NULL,
    actor_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    signature VARCHAR(128) NOT NULL
);

-- Convert to hypertable for temporal analysis
SELECT create_hypertable('provenance_chain', 'timestamp', if_not_exists => TRUE);

-- Claims registry table (Committee requirement: claim constraints)
CREATE TABLE IF NOT EXISTS claims_registry (
    id UUID PRIMARY KEY,
    content_hash VARCHAR(64) UNIQUE NOT NULL,
    content TEXT NOT NULL,
    confidence DECIMAL(5,4) NOT NULL,
    evidence_hashes JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    investigation_id UUID
);

-- Convert to hypertable
SELECT create_hypertable('claims_registry', 'created_at', if_not_exists => TRUE);

-- Export manifests table (Starkey dissent requirement)
CREATE TABLE IF NOT EXISTS export_manifests (
    manifest_id UUID PRIMARY KEY,
    manifest_hash VARCHAR(64) UNIQUE NOT NULL,
    export_type VARCHAR(100) NOT NULL,
    data_sources JSONB NOT NULL DEFAULT '[]',
    transformation_chain JSONB NOT NULL DEFAULT '[]',
    authority_basis JSONB NOT NULL DEFAULT '[]',
    classification_level VARCHAR(50) NOT NULL,
    retention_policy VARCHAR(100) NOT NULL,
    chain_of_custody JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('export_manifests', 'created_at', if_not_exists => TRUE);

-- Disclosure bundles table (Starkey dissent: immutable disclosure bundles)
CREATE TABLE IF NOT EXISTS disclosure_bundles (
    bundle_id UUID PRIMARY KEY,
    bundle_hash VARCHAR(64) UNIQUE NOT NULL,
    claims JSONB NOT NULL DEFAULT '[]',
    evidence_references JSONB NOT NULL DEFAULT '[]',
    provenance_chain JSONB NOT NULL DEFAULT '[]',
    export_manifest JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    immutable_seal VARCHAR(128) NOT NULL
);

-- Convert to hypertable
SELECT create_hypertable('disclosure_bundles', 'created_at', if_not_exists => TRUE);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_provenance_actor_time 
ON provenance_chain (actor_id, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_provenance_operation_time 
ON provenance_chain (operation_type, timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_provenance_content_hash 
ON provenance_chain (content_hash);

CREATE INDEX IF NOT EXISTS idx_claims_content_hash 
ON claims_registry (content_hash);

CREATE INDEX IF NOT EXISTS idx_claims_creator_time 
ON claims_registry (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_claims_investigation 
ON claims_registry (investigation_id);

CREATE INDEX IF NOT EXISTS idx_export_type_time 
ON export_manifests (export_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_export_classification 
ON export_manifests (classification_level);

CREATE INDEX IF NOT EXISTS idx_bundles_hash 
ON disclosure_bundles (bundle_hash);

CREATE INDEX IF NOT EXISTS idx_bundles_seal 
ON disclosure_bundles (immutable_seal);

-- GIN indexes for JSONB queries
CREATE INDEX IF NOT EXISTS idx_provenance_metadata_gin 
ON provenance_chain USING gin (metadata);

CREATE INDEX IF NOT EXISTS idx_claims_evidence_gin 
ON claims_registry USING gin (evidence_hashes);

CREATE INDEX IF NOT EXISTS idx_export_authority_gin 
ON export_manifests USING gin (authority_basis);

CREATE INDEX IF NOT EXISTS idx_export_custody_gin 
ON export_manifests USING gin (chain_of_custody);

CREATE INDEX IF NOT EXISTS idx_bundles_claims_gin 
ON disclosure_bundles USING gin (claims);

CREATE INDEX IF NOT EXISTS idx_bundles_evidence_gin 
ON disclosure_bundles USING gin (evidence_references);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO intelgraph;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO intelgraph;

-- Comments for documentation
COMMENT ON TABLE provenance_chain IS 'Committee Spec: Immutable provenance audit trail';
COMMENT ON TABLE claims_registry IS 'Committee Spec: Claim registration with hash verification';
COMMENT ON TABLE export_manifests IS 'Starkey Dissent: Verifiable export manifests required';
COMMENT ON TABLE disclosure_bundles IS 'Starkey Dissent: Immutable disclosure bundles for exports';

COMMENT ON COLUMN provenance_chain.content_hash IS 'SHA256 hash of operation content for integrity verification';
COMMENT ON COLUMN provenance_chain.signature IS 'HMAC signature for tamper detection';
COMMENT ON COLUMN claims_registry.content_hash IS 'SHA256 hash of claim content for deduplication';
COMMENT ON COLUMN export_manifests.manifest_hash IS 'SHA256 hash of complete manifest for integrity';
COMMENT ON COLUMN disclosure_bundles.immutable_seal IS 'Cryptographic seal preventing tampering';