-- Proof-Carrying Publishing Database Schema
-- Stores manifests, evidence wallets, revocations, and citations

-- Proof-carrying manifests
CREATE TABLE IF NOT EXISTS proof_carrying_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255) UNIQUE NOT NULL,
  version VARCHAR(50) NOT NULL DEFAULT '1.0',

  -- Metadata
  name VARCHAR(500) NOT NULL,
  description TEXT,
  manifest_version VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  contact VARCHAR(255),

  -- Hash tree
  hash_tree_root VARCHAR(128) NOT NULL,
  hash_tree_algorithm VARCHAR(50) NOT NULL DEFAULT 'sha256',
  hash_tree JSONB NOT NULL,

  -- Model cards
  model_cards JSONB NOT NULL DEFAULT '[]',

  -- Citations
  citations JSONB NOT NULL DEFAULT '[]',

  -- Licenses
  licenses JSONB NOT NULL DEFAULT '[]',

  -- Verification
  offline_verifiable BOOLEAN NOT NULL DEFAULT true,
  verification_script TEXT,

  -- Cryptographic proof
  signature TEXT NOT NULL,
  signature_algorithm VARCHAR(50) NOT NULL,
  public_key TEXT NOT NULL,
  signing_certificate TEXT,

  -- Expiration
  expires_at TIMESTAMPTZ,

  -- Revocation
  revocable BOOLEAN NOT NULL DEFAULT true,
  revocation_list_url TEXT,
  revocation_check_required BOOLEAN NOT NULL DEFAULT true,

  -- Compliance
  compliance_frameworks TEXT[],
  security_classification VARCHAR(50),
  data_retention_policy TEXT,

  -- Full manifest (denormalized for quick retrieval)
  manifest_json JSONB NOT NULL,

  -- Audit
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_pcm_bundle_id ON proof_carrying_manifests(bundle_id);
CREATE INDEX idx_pcm_created_at ON proof_carrying_manifests(created_at DESC);
CREATE INDEX idx_pcm_created_by ON proof_carrying_manifests(created_by);
CREATE INDEX idx_pcm_expires_at ON proof_carrying_manifests(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index for JSONB searches
CREATE INDEX idx_pcm_manifest_json ON proof_carrying_manifests USING gin(manifest_json);
CREATE INDEX idx_pcm_citations ON proof_carrying_manifests USING gin(citations);

-- Evidence wallets
CREATE TABLE IF NOT EXISTS evidence_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id VARCHAR(255) UNIQUE NOT NULL,
  bundle_id VARCHAR(255) NOT NULL,
  manifest_id UUID REFERENCES proof_carrying_manifests(id) ON DELETE CASCADE,

  -- Audience scope
  audience_id VARCHAR(255) NOT NULL,
  audience_name VARCHAR(500) NOT NULL,
  audience_description TEXT,
  max_sensitivity VARCHAR(50) NOT NULL,
  allowed_roles TEXT[],
  allowed_organizations TEXT[],
  allowed_users TEXT[],
  allowed_regions TEXT[],
  prohibited_regions TEXT[],
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,

  -- Contents
  artifacts TEXT[] NOT NULL DEFAULT '{}',

  -- Cryptographic proof
  signature TEXT NOT NULL,
  signature_algorithm VARCHAR(50) NOT NULL,
  public_key TEXT NOT NULL,

  -- Revocation
  revocable BOOLEAN NOT NULL DEFAULT true,
  revocation_list_url TEXT,
  is_revoked BOOLEAN NOT NULL DEFAULT false,

  -- Full wallet (denormalized)
  wallet_json JSONB NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_ew_wallet_id ON evidence_wallets(wallet_id);
CREATE INDEX idx_ew_bundle_id ON evidence_wallets(bundle_id);
CREATE INDEX idx_ew_manifest_id ON evidence_wallets(manifest_id);
CREATE INDEX idx_ew_created_at ON evidence_wallets(created_at DESC);
CREATE INDEX idx_ew_audience_id ON evidence_wallets(audience_id);
CREATE INDEX idx_ew_is_revoked ON evidence_wallets(is_revoked);
CREATE INDEX idx_ew_expires_at ON evidence_wallets(expires_at) WHERE expires_at IS NOT NULL;

-- GIN index for arrays and JSONB
CREATE INDEX idx_ew_allowed_organizations ON evidence_wallets USING gin(allowed_organizations);
CREATE INDEX idx_ew_allowed_users ON evidence_wallets USING gin(allowed_users);
CREATE INDEX idx_ew_wallet_json ON evidence_wallets USING gin(wallet_json);

-- Revocation records
CREATE TABLE IF NOT EXISTS revocation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  revocation_id VARCHAR(255) UNIQUE NOT NULL,
  wallet_id VARCHAR(255),
  bundle_id VARCHAR(255) NOT NULL,

  -- Revocation details
  revoked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_by VARCHAR(255) NOT NULL,
  reason VARCHAR(50) NOT NULL CHECK (reason IN ('compromised', 'expired', 'superseded', 'withdrawn', 'other')),
  reason_detail TEXT,

  -- Propagation tracking
  propagated_to TEXT[] NOT NULL DEFAULT '{}',
  propagation_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (propagation_status IN ('pending', 'complete', 'partial', 'failed')),
  propagation_attempts INTEGER NOT NULL DEFAULT 0,
  last_propagation_attempt TIMESTAMPTZ,

  -- Verification
  signature TEXT NOT NULL,
  signature_algorithm VARCHAR(50) NOT NULL,

  -- Full record
  record_json JSONB NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_rr_revocation_id ON revocation_records(revocation_id);
CREATE INDEX idx_rr_wallet_id ON revocation_records(wallet_id) WHERE wallet_id IS NOT NULL;
CREATE INDEX idx_rr_bundle_id ON revocation_records(bundle_id);
CREATE INDEX idx_rr_revoked_at ON revocation_records(revoked_at DESC);
CREATE INDEX idx_rr_reason ON revocation_records(reason);
CREATE INDEX idx_rr_propagation_status ON revocation_records(propagation_status);

-- GIN index for propagated_to array
CREATE INDEX idx_rr_propagated_to ON revocation_records USING gin(propagated_to);

-- Citation registry
CREATE TABLE IF NOT EXISTS citation_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_id VARCHAR(255) UNIQUE NOT NULL,

  -- Citation details
  citation_type VARCHAR(50) NOT NULL CHECK (citation_type IN ('data', 'model', 'code', 'publication')),
  required BOOLEAN NOT NULL DEFAULT true,
  title VARCHAR(1000) NOT NULL,
  authors TEXT[],
  organization VARCHAR(500),
  url TEXT,
  doi VARCHAR(255),
  version VARCHAR(100),

  -- License
  license_spdx_id VARCHAR(100) NOT NULL,
  license_name VARCHAR(500) NOT NULL,
  license_url TEXT,
  license_requires_attribution BOOLEAN NOT NULL DEFAULT true,
  license_allows_commercial BOOLEAN NOT NULL DEFAULT true,
  license_allows_modification BOOLEAN NOT NULL DEFAULT true,
  license_copyleft BOOLEAN NOT NULL DEFAULT false,

  -- Verification
  verified BOOLEAN NOT NULL DEFAULT false,
  verified_at TIMESTAMPTZ,
  verification_method VARCHAR(50) CHECK (verification_method IN ('manual', 'automated', 'registry')),

  -- Full citation
  citation_json JSONB NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(255) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_cr_citation_id ON citation_registry(citation_id);
CREATE INDEX idx_cr_citation_type ON citation_registry(citation_type);
CREATE INDEX idx_cr_required ON citation_registry(required);
CREATE INDEX idx_cr_verified ON citation_registry(verified);
CREATE INDEX idx_cr_license_spdx_id ON citation_registry(license_spdx_id);
CREATE INDEX idx_cr_doi ON citation_registry(doi) WHERE doi IS NOT NULL;

-- Text search on title
CREATE INDEX idx_cr_title_text ON citation_registry USING gin(to_tsvector('english', title));

-- GIN index for authors array
CREATE INDEX idx_cr_authors ON citation_registry USING gin(authors);

-- Trigger to update wallet revocation status
CREATE OR REPLACE FUNCTION update_wallet_revocation_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark wallet as revoked
  IF NEW.wallet_id IS NOT NULL THEN
    UPDATE evidence_wallets
    SET is_revoked = true,
        updated_at = NOW()
    WHERE wallet_id = NEW.wallet_id;
  END IF;

  -- Mark all wallets for the bundle as revoked
  UPDATE evidence_wallets
  SET is_revoked = true,
      updated_at = NOW()
  WHERE bundle_id = NEW.bundle_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_wallet_revocation
  AFTER INSERT ON revocation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_wallet_revocation_status();

-- Verification history
CREATE TABLE IF NOT EXISTS verification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id VARCHAR(255),
  wallet_id VARCHAR(255),

  -- Verification result
  valid BOOLEAN NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_by VARCHAR(255),
  verified_offline BOOLEAN NOT NULL DEFAULT false,
  verification_duration_ms INTEGER,

  -- Check results
  hash_tree_valid BOOLEAN,
  signature_valid BOOLEAN,
  citations_complete BOOLEAN,
  licenses_valid BOOLEAN,
  not_revoked BOOLEAN,
  not_expired BOOLEAN,

  -- Issues
  errors TEXT[] NOT NULL DEFAULT '{}',
  warnings TEXT[] NOT NULL DEFAULT '{}',

  -- Full result
  result_json JSONB NOT NULL,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_vh_bundle_id ON verification_history(bundle_id) WHERE bundle_id IS NOT NULL;
CREATE INDEX idx_vh_wallet_id ON verification_history(wallet_id) WHERE wallet_id IS NOT NULL;
CREATE INDEX idx_vh_verified_at ON verification_history(verified_at DESC);
CREATE INDEX idx_vh_valid ON verification_history(valid);

-- Views

-- Active (non-revoked, non-expired) manifests
CREATE OR REPLACE VIEW active_manifests AS
SELECT
  pcm.*,
  EXISTS(
    SELECT 1 FROM revocation_records rr
    WHERE rr.bundle_id = pcm.bundle_id
  ) as is_revoked
FROM proof_carrying_manifests pcm
WHERE
  (pcm.expires_at IS NULL OR pcm.expires_at > NOW())
  AND NOT EXISTS(
    SELECT 1 FROM revocation_records rr
    WHERE rr.bundle_id = pcm.bundle_id
  );

-- Active wallets
CREATE OR REPLACE VIEW active_wallets AS
SELECT
  ew.*
FROM evidence_wallets ew
WHERE
  ew.is_revoked = false
  AND (ew.expires_at IS NULL OR ew.expires_at > NOW())
  AND (ew.valid_until IS NULL OR ew.valid_until > NOW())
  AND (ew.valid_from IS NULL OR ew.valid_from <= NOW());

-- Verification statistics
CREATE OR REPLACE VIEW verification_stats AS
SELECT
  DATE(verified_at) as date,
  COUNT(*) as total_verifications,
  COUNT(*) FILTER (WHERE valid) as successful_verifications,
  COUNT(*) FILTER (WHERE NOT valid) as failed_verifications,
  COUNT(*) FILTER (WHERE verified_offline) as offline_verifications,
  AVG(verification_duration_ms) as avg_duration_ms,
  COUNT(DISTINCT bundle_id) as unique_bundles_verified,
  COUNT(DISTINCT wallet_id) as unique_wallets_verified
FROM verification_history
GROUP BY DATE(verified_at)
ORDER BY date DESC;

-- Revocation statistics
CREATE OR REPLACE VIEW revocation_stats AS
SELECT
  DATE(revoked_at) as date,
  reason,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE propagation_status = 'complete') as fully_propagated,
  COUNT(*) FILTER (WHERE propagation_status = 'partial') as partially_propagated,
  COUNT(*) FILTER (WHERE propagation_status = 'failed') as failed_propagation
FROM revocation_records
GROUP BY DATE(revoked_at), reason
ORDER BY date DESC, count DESC;

-- Citation completeness by manifest
CREATE OR REPLACE VIEW citation_completeness AS
SELECT
  pcm.bundle_id,
  pcm.name,
  pcm.created_at,
  jsonb_array_length(pcm.citations) as total_citations,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(pcm.citations) cit
    WHERE (cit->>'required')::boolean = true
  ) as required_citations,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(pcm.citations) cit
    WHERE (cit->>'verified')::boolean = true
  ) as verified_citations,
  (
    SELECT COUNT(*)
    FROM jsonb_array_elements(pcm.citations) cit
    WHERE (cit->>'required')::boolean = true
      AND (cit->>'verified')::boolean = false
  ) as missing_required_citations
FROM proof_carrying_manifests pcm;

-- Functions

-- Check if bundle can be published
CREATE OR REPLACE FUNCTION can_publish_bundle(p_bundle_id VARCHAR)
RETURNS TABLE(
  can_publish BOOLEAN,
  blockers TEXT[]
) AS $$
DECLARE
  v_missing_citations INTEGER;
  v_blockers TEXT[] := '{}';
BEGIN
  -- Check if manifest exists
  IF NOT EXISTS(SELECT 1 FROM proof_carrying_manifests WHERE bundle_id = p_bundle_id) THEN
    v_blockers := array_append(v_blockers, 'Manifest not found');
    RETURN QUERY SELECT false, v_blockers;
    RETURN;
  END IF;

  -- Check for missing required citations
  SELECT
    (
      SELECT COUNT(*)
      FROM jsonb_array_elements(pcm.citations) cit
      WHERE (cit->>'required')::boolean = true
        AND (cit->>'verified')::boolean = false
    )
  INTO v_missing_citations
  FROM proof_carrying_manifests pcm
  WHERE pcm.bundle_id = p_bundle_id;

  IF v_missing_citations > 0 THEN
    v_blockers := array_append(v_blockers,
      format('%s required citations are missing or unverified', v_missing_citations));
  END IF;

  -- Check if already revoked
  IF EXISTS(SELECT 1 FROM revocation_records WHERE bundle_id = p_bundle_id) THEN
    v_blockers := array_append(v_blockers, 'Bundle is revoked');
  END IF;

  -- Check if expired
  IF EXISTS(
    SELECT 1 FROM proof_carrying_manifests
    WHERE bundle_id = p_bundle_id
      AND expires_at IS NOT NULL
      AND expires_at < NOW()
  ) THEN
    v_blockers := array_append(v_blockers, 'Bundle has expired');
  END IF;

  RETURN QUERY SELECT array_length(v_blockers, 1) IS NULL OR array_length(v_blockers, 1) = 0, v_blockers;
END;
$$ LANGUAGE plpgsql;

-- Get revocation status
CREATE OR REPLACE FUNCTION get_revocation_status(
  p_bundle_id VARCHAR DEFAULT NULL,
  p_wallet_id VARCHAR DEFAULT NULL
)
RETURNS TABLE(
  is_revoked BOOLEAN,
  revoked_at TIMESTAMPTZ,
  reason VARCHAR,
  reason_detail TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    true,
    rr.revoked_at,
    rr.reason,
    rr.reason_detail
  FROM revocation_records rr
  WHERE
    (p_bundle_id IS NOT NULL AND rr.bundle_id = p_bundle_id)
    OR (p_wallet_id IS NOT NULL AND rr.wallet_id = p_wallet_id)
  ORDER BY rr.revoked_at DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ, NULL::VARCHAR, NULL::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pcm_updated_at
  BEFORE UPDATE ON proof_carrying_manifests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_ew_updated_at
  BEFORE UPDATE ON evidence_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_rr_updated_at
  BEFORE UPDATE ON revocation_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_cr_updated_at
  BEFORE UPDATE ON citation_registry
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE proof_carrying_manifests IS 'Stores proof-carrying manifests with hash trees, model cards, and citations';
COMMENT ON TABLE evidence_wallets IS 'Stores audience-scoped evidence wallets for controlled disclosure';
COMMENT ON TABLE revocation_records IS 'Tracks revocation of bundles and wallets with propagation status';
COMMENT ON TABLE citation_registry IS 'Central registry of citations for data sources, models, and publications';
COMMENT ON TABLE verification_history IS 'Audit trail of bundle and wallet verification attempts';

COMMENT ON FUNCTION can_publish_bundle IS 'Validates if a bundle meets all requirements for publishing';
COMMENT ON FUNCTION get_revocation_status IS 'Checks revocation status of a bundle or wallet';
