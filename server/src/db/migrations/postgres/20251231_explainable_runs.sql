-- Migration: Explainable Runs Schema
-- Purpose: Store agent runs, predictions, negotiations, and policy decisions for explainability
-- Version: 1.0.0
-- Date: 2025-12-31

-- Explainable Runs Table
CREATE TABLE IF NOT EXISTS explainable_runs (
  -- Identity
  run_id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type VARCHAR NOT NULL CHECK (run_type IN ('agent_run', 'prediction', 'negotiation', 'policy_decision')),
  tenant_id VARCHAR NOT NULL,

  -- Actor Information
  actor_type VARCHAR NOT NULL CHECK (actor_type IN ('human', 'agent', 'system', 'service')),
  actor_id VARCHAR NOT NULL,
  actor_name VARCHAR NOT NULL,
  actor_role VARCHAR,
  authentication_method VARCHAR NOT NULL,

  -- Temporal
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  -- Inputs (JSON with hashing)
  inputs_parameters JSONB NOT NULL DEFAULT '{}',
  inputs_hash VARCHAR(64) NOT NULL,
  inputs_hashing_algorithm VARCHAR DEFAULT 'sha256',
  inputs_pii_redacted TEXT[] DEFAULT '{}',
  inputs_secret_redacted TEXT[] DEFAULT '{}',
  inputs_sources JSONB DEFAULT '[]',

  -- Outputs (JSON with hashing)
  outputs_results JSONB NOT NULL DEFAULT '{}',
  outputs_hash VARCHAR(64) NOT NULL,
  outputs_hashing_algorithm VARCHAR DEFAULT 'sha256',
  outputs_pii_redacted TEXT[] DEFAULT '{}',
  outputs_secret_redacted TEXT[] DEFAULT '{}',
  outputs_artifacts JSONB DEFAULT '[]',
  outputs_side_effects JSONB DEFAULT '[]',

  -- Explanation
  explanation_summary TEXT NOT NULL,
  explanation_reasoning_steps JSONB DEFAULT '[]',
  explanation_why_triggered TEXT,
  explanation_why_this_approach TEXT,
  explanation_alternatives JSONB DEFAULT '[]',

  -- Confidence & Trust
  confidence_overall DECIMAL(3,2) NOT NULL CHECK (confidence_overall >= 0 AND confidence_overall <= 1),
  confidence_basis TEXT,
  confidence_evidence_count INTEGER DEFAULT 0,
  confidence_evidence_quality VARCHAR,
  confidence_source_count INTEGER DEFAULT 0,
  confidence_source_licenses TEXT[] DEFAULT '{}',
  confidence_source_reliability VARCHAR,
  confidence_validated BOOLEAN DEFAULT FALSE,
  confidence_validation_method VARCHAR,
  confidence_validated_at TIMESTAMPTZ,

  -- Assumptions & Limitations
  assumptions JSONB DEFAULT '[]',
  limitations JSONB DEFAULT '[]',

  -- Policy & Governance
  policy_decisions JSONB DEFAULT '[]',
  capabilities_used TEXT[] DEFAULT '{}',

  -- Lineage & Provenance
  provenance_chain_id VARCHAR,
  parent_run_id VARCHAR REFERENCES explainable_runs(run_id),
  child_run_ids TEXT[] DEFAULT '{}',
  sbom_id VARCHAR,

  -- Audit Trail
  audit_event_ids TEXT[] DEFAULT '{}',

  -- Metadata
  version VARCHAR NOT NULL DEFAULT '1.0.0',
  redacted_fields TEXT[] DEFAULT '{}',

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_explainable_runs_tenant ON explainable_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_type ON explainable_runs(run_type);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_actor ON explainable_runs(actor_id);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_started ON explainable_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_confidence ON explainable_runs(confidence_overall);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_parent ON explainable_runs(parent_run_id);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_provenance ON explainable_runs(provenance_chain_id);
CREATE INDEX IF NOT EXISTS idx_explainable_runs_capabilities ON explainable_runs USING GIN(capabilities_used);

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_explainable_runs_tenant_type_started
  ON explainable_runs(tenant_id, run_type, started_at DESC);

-- Provenance Links Table (many-to-many)
CREATE TABLE IF NOT EXISTS explainable_run_claims (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR NOT NULL REFERENCES explainable_runs(run_id) ON DELETE CASCADE,
  claim_id VARCHAR NOT NULL,
  claim_type VARCHAR NOT NULL,
  confidence DECIMAL(3,2) NOT NULL,
  supporting_evidence_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_claims_run ON explainable_run_claims(run_id);
CREATE INDEX IF NOT EXISTS idx_run_claims_claim ON explainable_run_claims(claim_id);

CREATE TABLE IF NOT EXISTS explainable_run_evidence (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR NOT NULL REFERENCES explainable_runs(run_id) ON DELETE CASCADE,
  evidence_id VARCHAR NOT NULL,
  evidence_type VARCHAR NOT NULL,
  classification VARCHAR NOT NULL,
  integrity_hash VARCHAR NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_evidence_run ON explainable_run_evidence(run_id);
CREATE INDEX IF NOT EXISTS idx_run_evidence_evidence ON explainable_run_evidence(evidence_id);

CREATE TABLE IF NOT EXISTS explainable_run_sources (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR NOT NULL REFERENCES explainable_runs(run_id) ON DELETE CASCADE,
  source_id VARCHAR NOT NULL,
  source_type VARCHAR NOT NULL,
  license VARCHAR NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_sources_run ON explainable_run_sources(run_id);
CREATE INDEX IF NOT EXISTS idx_run_sources_source ON explainable_run_sources(source_id);

CREATE TABLE IF NOT EXISTS explainable_run_transforms (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id VARCHAR NOT NULL REFERENCES explainable_runs(run_id) ON DELETE CASCADE,
  transform_id VARCHAR NOT NULL,
  transform_type VARCHAR NOT NULL,
  parent_transform_id VARCHAR,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_transforms_run ON explainable_run_transforms(run_id);
CREATE INDEX IF NOT EXISTS idx_run_transforms_transform ON explainable_run_transforms(transform_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_explainable_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_update_explainable_runs_updated_at
  BEFORE UPDATE ON explainable_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_explainable_runs_updated_at();

-- Comments for documentation
COMMENT ON TABLE explainable_runs IS 'Stores explainable runs (agent runs, predictions, negotiations, policy decisions) with full lineage and confidence metrics';
COMMENT ON COLUMN explainable_runs.run_id IS 'Stable UUID linking to audit logs and provenance chains';
COMMENT ON COLUMN explainable_runs.inputs_hash IS 'SHA-256 hash of original (unredacted) inputs';
COMMENT ON COLUMN explainable_runs.outputs_hash IS 'SHA-256 hash of original (unredacted) outputs';
COMMENT ON COLUMN explainable_runs.confidence_overall IS 'Overall confidence score (0.0-1.0)';
COMMENT ON COLUMN explainable_runs.provenance_chain_id IS 'Links to provenance_chains table for full lineage';
COMMENT ON COLUMN explainable_runs.parent_run_id IS 'Parent run if this is a child/nested run';
