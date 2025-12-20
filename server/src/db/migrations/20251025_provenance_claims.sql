-- Provenance & Claim Ledger Service Schema
-- Implementation of Advisory Committee Specifications for Chain-of-Custody

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sources Table
CREATE TABLE IF NOT EXISTS sources (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_hash VARCHAR NOT NULL,
  source_type VARCHAR NOT NULL,
  origin_url VARCHAR,
  ingestion_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  license_id VARCHAR NOT NULL,
  custody_chain TEXT[] DEFAULT '{}',
  retention_policy VARCHAR,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);

-- Evidence Artifacts Table
CREATE TABLE IF NOT EXISTS evidence_artifacts (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  sha256 VARCHAR NOT NULL,
  artifact_type VARCHAR NOT NULL,
  storage_uri VARCHAR NOT NULL,
  source_id VARCHAR NOT NULL REFERENCES sources(id),
  transform_chain TEXT[] DEFAULT '{}',
  license_id VARCHAR NOT NULL,
  classification_level VARCHAR NOT NULL DEFAULT 'INTERNAL',
  content_preview TEXT,
  registered_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);

-- Claims Registry Table
CREATE TABLE IF NOT EXISTS claims_registry (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_hash VARCHAR NOT NULL,
  content TEXT NOT NULL,
  claim_type VARCHAR NOT NULL,
  confidence FLOAT NOT NULL,
  evidence_hashes JSONB NOT NULL DEFAULT '[]',
  source_id VARCHAR NOT NULL REFERENCES sources(id),
  transform_chain TEXT[] DEFAULT '{}',
  license_id VARCHAR NOT NULL,
  created_by VARCHAR NOT NULL,
  investigation_id VARCHAR,
  contradicts TEXT[] DEFAULT '{}',
  corroborates TEXT[] DEFAULT '{}',
  extracted_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);

-- Claim-Evidence Links Table
CREATE TABLE IF NOT EXISTS claim_evidence_links (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id VARCHAR NOT NULL REFERENCES claims_registry(id),
  evidence_id VARCHAR NOT NULL REFERENCES evidence_artifacts(id),
  relation_type VARCHAR NOT NULL CHECK (relation_type IN ('SUPPORTS', 'CONTRADICTS')),
  confidence FLOAT,
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  tenant_id VARCHAR NOT NULL,
  UNIQUE(claim_id, evidence_id, relation_type)
);

-- Transforms Table
CREATE TABLE IF NOT EXISTS transforms (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  transform_type VARCHAR NOT NULL,
  input_hash VARCHAR NOT NULL,
  output_hash VARCHAR NOT NULL,
  algorithm VARCHAR NOT NULL,
  version VARCHAR NOT NULL,
  parameters JSONB DEFAULT '{}',
  executed_by VARCHAR NOT NULL,
  confidence FLOAT,
  parent_transforms TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);

-- Export Manifests Table
CREATE TABLE IF NOT EXISTS export_manifests (
  id VARCHAR PRIMARY KEY DEFAULT uuid_generate_v4(),
  manifest_version VARCHAR NOT NULL,
  bundle_id VARCHAR NOT NULL,
  merkle_root VARCHAR NOT NULL,
  hash_algorithm VARCHAR NOT NULL DEFAULT 'SHA-256',
  items JSONB NOT NULL, -- Array of item summaries
  custody_chain JSONB NOT NULL,
  export_type VARCHAR NOT NULL,
  classification_level VARCHAR NOT NULL,
  retention_policy VARCHAR,
  signature VARCHAR,
  public_key_id VARCHAR,
  licenses JSONB,
  data_sources TEXT[],
  transformation_chain TEXT[],
  authority_basis TEXT[],
  created_by VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tenant_id VARCHAR NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sources_tenant ON sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence_artifacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claims_tenant ON claims_registry(tenant_id);
CREATE INDEX IF NOT EXISTS idx_claims_investigation ON claims_registry(investigation_id);
CREATE INDEX IF NOT EXISTS idx_claims_confidence ON claims_registry(confidence);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_links_claim ON claim_evidence_links(claim_id);
CREATE INDEX IF NOT EXISTS idx_claim_evidence_links_evidence ON claim_evidence_links(evidence_id);
CREATE INDEX IF NOT EXISTS idx_transforms_tenant ON transforms(tenant_id);
CREATE INDEX IF NOT EXISTS idx_export_manifests_tenant ON export_manifests(tenant_id);
