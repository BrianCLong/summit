-- Provenance Ledger Beta Schema
-- Implements Source, Transform, Evidence, Claim models with full provenance tracking
-- Migration: 2025-11-20_provenance_ledger_beta

-- ============================================================================
-- LICENSES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS licenses (
  id TEXT PRIMARY KEY,
  license_type TEXT NOT NULL CHECK (license_type IN ('public', 'internal', 'restricted', 'classified')),
  license_terms TEXT,
  restrictions TEXT[] NOT NULL DEFAULT '{}',
  attribution_required BOOLEAN NOT NULL DEFAULT true,
  expiration_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS licenses_type_idx ON licenses(license_type);
CREATE INDEX IF NOT EXISTS licenses_expiration_idx ON licenses(expiration_date) WHERE expiration_date IS NOT NULL;

-- ============================================================================
-- SOURCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sources (
  id TEXT PRIMARY KEY,
  source_hash TEXT NOT NULL UNIQUE,
  source_type TEXT NOT NULL CHECK (source_type IN ('document', 'database', 'api', 'user_input', 'sensor')),
  origin_url TEXT,
  ingestion_timestamp TIMESTAMPTZ NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  license_id TEXT REFERENCES licenses(id),
  custody_chain TEXT[] NOT NULL DEFAULT '{}',
  retention_policy TEXT NOT NULL DEFAULT 'STANDARD',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sources_hash_idx ON sources(source_hash);
CREATE INDEX IF NOT EXISTS sources_type_idx ON sources(source_type);
CREATE INDEX IF NOT EXISTS sources_ingestion_idx ON sources(ingestion_timestamp DESC);
CREATE INDEX IF NOT EXISTS sources_created_by_idx ON sources(created_by);

COMMENT ON TABLE sources IS 'Original data sources with content hashing and license tracking';
COMMENT ON COLUMN sources.source_hash IS 'SHA256 hash of original source content for integrity verification';
COMMENT ON COLUMN sources.custody_chain IS 'Array of actor IDs who have handled this source';

-- ============================================================================
-- TRANSFORMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS transforms (
  id TEXT PRIMARY KEY,
  transform_type TEXT NOT NULL,
  input_hash TEXT NOT NULL,
  output_hash TEXT NOT NULL,
  algorithm TEXT NOT NULL,
  version TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  execution_timestamp TIMESTAMPTZ NOT NULL,
  duration_ms INTEGER NOT NULL,
  executed_by TEXT NOT NULL,
  confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  parent_transforms TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS transforms_input_hash_idx ON transforms(input_hash);
CREATE INDEX IF NOT EXISTS transforms_output_hash_idx ON transforms(output_hash);
CREATE INDEX IF NOT EXISTS transforms_type_idx ON transforms(transform_type);
CREATE INDEX IF NOT EXISTS transforms_execution_idx ON transforms(execution_timestamp DESC);
CREATE INDEX IF NOT EXISTS transforms_parent_idx ON transforms USING GIN(parent_transforms);

COMMENT ON TABLE transforms IS 'Data transformations applied to sources with full lineage tracking';
COMMENT ON COLUMN transforms.parent_transforms IS 'Array of previous transform IDs in the chain';
COMMENT ON COLUMN transforms.confidence IS 'Confidence score for this transformation (0-1)';

-- ============================================================================
-- EVIDENCE ARTIFACTS (Enhanced)
-- ============================================================================
-- Add new columns to existing evidence_artifacts table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='source_id') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN source_id TEXT REFERENCES sources(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='transform_chain') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN transform_chain TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='license_id') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN license_id TEXT REFERENCES licenses(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='classification_level') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN classification_level TEXT DEFAULT 'INTERNAL';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='content_preview') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN content_preview TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence_artifacts' AND column_name='registered_by') THEN
    ALTER TABLE evidence_artifacts ADD COLUMN registered_by TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS evidence_artifacts_source_idx ON evidence_artifacts(source_id);
CREATE INDEX IF NOT EXISTS evidence_artifacts_license_idx ON evidence_artifacts(license_id);
CREATE INDEX IF NOT EXISTS evidence_artifacts_transform_chain_idx ON evidence_artifacts USING GIN(transform_chain);

-- ============================================================================
-- CLAIMS REGISTRY (Enhanced)
-- ============================================================================
-- Add new columns to existing claims_registry table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='source_id') THEN
    ALTER TABLE claims_registry ADD COLUMN source_id TEXT REFERENCES sources(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='claim_type') THEN
    ALTER TABLE claims_registry ADD COLUMN claim_type TEXT DEFAULT 'factual' CHECK (claim_type IN ('factual', 'inferential', 'predictive', 'evaluative'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='transform_chain') THEN
    ALTER TABLE claims_registry ADD COLUMN transform_chain TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='license_id') THEN
    ALTER TABLE claims_registry ADD COLUMN license_id TEXT REFERENCES licenses(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='contradicts') THEN
    ALTER TABLE claims_registry ADD COLUMN contradicts TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='corroborates') THEN
    ALTER TABLE claims_registry ADD COLUMN corroborates TEXT[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='claims_registry' AND column_name='extracted_at') THEN
    ALTER TABLE claims_registry ADD COLUMN extracted_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS claims_registry_source_idx ON claims_registry(source_id);
CREATE INDEX IF NOT EXISTS claims_registry_type_idx ON claims_registry(claim_type);
CREATE INDEX IF NOT EXISTS claims_registry_license_idx ON claims_registry(license_id);
CREATE INDEX IF NOT EXISTS claims_registry_transform_chain_idx ON claims_registry USING GIN(transform_chain);
CREATE INDEX IF NOT EXISTS claims_registry_contradicts_idx ON claims_registry USING GIN(contradicts);
CREATE INDEX IF NOT EXISTS claims_registry_corroborates_idx ON claims_registry USING GIN(corroborates);

-- ============================================================================
-- MERKLE TREES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS merkle_trees (
  id TEXT PRIMARY KEY,
  manifest_id TEXT NOT NULL,
  root_hash TEXT NOT NULL,
  tree_data JSONB NOT NULL,
  hash_algorithm TEXT NOT NULL DEFAULT 'SHA-256',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS merkle_trees_manifest_idx ON merkle_trees(manifest_id);
CREATE INDEX IF NOT EXISTS merkle_trees_root_hash_idx ON merkle_trees(root_hash);

COMMENT ON TABLE merkle_trees IS 'Merkle tree structures for export manifest verification';
COMMENT ON COLUMN merkle_trees.tree_data IS 'Full Merkle tree structure including all nodes and proofs';

-- ============================================================================
-- EXPORT MANIFESTS (Enhanced)
-- ============================================================================
-- Add new columns to existing export_manifests table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='manifest_version') THEN
    ALTER TABLE export_manifests ADD COLUMN manifest_version TEXT DEFAULT '1.0.0';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='merkle_root') THEN
    ALTER TABLE export_manifests ADD COLUMN merkle_root TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='merkle_tree_id') THEN
    ALTER TABLE export_manifests ADD COLUMN merkle_tree_id TEXT REFERENCES merkle_trees(id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='hash_algorithm') THEN
    ALTER TABLE export_manifests ADD COLUMN hash_algorithm TEXT DEFAULT 'SHA-256';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='public_key_id') THEN
    ALTER TABLE export_manifests ADD COLUMN public_key_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='signature') THEN
    ALTER TABLE export_manifests ADD COLUMN signature TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='bundle_id') THEN
    ALTER TABLE export_manifests ADD COLUMN bundle_id TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='created_by') THEN
    ALTER TABLE export_manifests ADD COLUMN created_by TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='items') THEN
    ALTER TABLE export_manifests ADD COLUMN items JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='licenses') THEN
    ALTER TABLE export_manifests ADD COLUMN licenses JSONB DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='export_manifests' AND column_name='license_conflicts') THEN
    ALTER TABLE export_manifests ADD COLUMN license_conflicts TEXT[];
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS export_manifests_merkle_root_idx ON export_manifests(merkle_root);
CREATE INDEX IF NOT EXISTS export_manifests_bundle_idx ON export_manifests(bundle_id);
CREATE INDEX IF NOT EXISTS export_manifests_created_by_idx ON export_manifests(created_by);

-- ============================================================================
-- MANIFEST ITEMS TABLE (for detailed tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS manifest_items (
  id TEXT PRIMARY KEY,
  manifest_id TEXT NOT NULL REFERENCES export_manifests(manifest_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('claim', 'evidence', 'source', 'transform')),
  content_hash TEXT NOT NULL,
  merkle_proof JSONB,
  source_id TEXT REFERENCES sources(id),
  transform_chain TEXT[] DEFAULT '{}',
  license_id TEXT REFERENCES licenses(id),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manifest_items_manifest_idx ON manifest_items(manifest_id);
CREATE INDEX IF NOT EXISTS manifest_items_item_idx ON manifest_items(item_id);
CREATE INDEX IF NOT EXISTS manifest_items_type_idx ON manifest_items(item_type);
CREATE INDEX IF NOT EXISTS manifest_items_hash_idx ON manifest_items(content_hash);

COMMENT ON TABLE manifest_items IS 'Individual items within export manifests with Merkle proofs';
COMMENT ON COLUMN manifest_items.merkle_proof IS 'Array of hashes forming the Merkle proof path';

-- ============================================================================
-- VERIFICATION LOGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS verification_logs (
  id TEXT PRIMARY KEY,
  manifest_id TEXT REFERENCES export_manifests(manifest_id),
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by TEXT,
  bundle_valid BOOLEAN NOT NULL,
  signature_valid BOOLEAN NOT NULL,
  merkle_valid BOOLEAN NOT NULL,
  items_valid INTEGER NOT NULL DEFAULT 0,
  items_total INTEGER NOT NULL DEFAULT 0,
  chain_valid BOOLEAN,
  license_issues TEXT[],
  verification_details JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS verification_logs_manifest_idx ON verification_logs(manifest_id);
CREATE INDEX IF NOT EXISTS verification_logs_verified_at_idx ON verification_logs(verified_at DESC);

COMMENT ON TABLE verification_logs IS 'Audit log of bundle verification attempts';

-- ============================================================================
-- VIEWS FOR CONVENIENT QUERYING
-- ============================================================================

-- Complete provenance chain view
CREATE OR REPLACE VIEW provenance_chain_view AS
SELECT
  c.id as claim_id,
  c.content as claim_content,
  c.content_hash as claim_hash,
  c.confidence,
  s.id as source_id,
  s.source_hash,
  s.source_type,
  s.origin_url,
  array_agg(DISTINCT t.id ORDER BY t.execution_timestamp) as transform_chain_ids,
  array_agg(DISTINCT t.transform_type ORDER BY t.execution_timestamp) as transform_types,
  l.license_type,
  l.license_terms
FROM claims_registry c
LEFT JOIN sources s ON c.source_id = s.id
LEFT JOIN LATERAL unnest(c.transform_chain) AS tc(transform_id) ON true
LEFT JOIN transforms t ON tc.transform_id = t.id
LEFT JOIN licenses l ON c.license_id = l.id
GROUP BY c.id, c.content, c.content_hash, c.confidence, s.id, s.source_hash, s.source_type, s.origin_url, l.license_type, l.license_terms;

COMMENT ON VIEW provenance_chain_view IS 'Convenient view showing complete provenance chain for claims';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to compute custody chain for an item
CREATE OR REPLACE FUNCTION get_custody_chain(item_type TEXT, item_id TEXT)
RETURNS TEXT[] AS $$
DECLARE
  chain TEXT[];
BEGIN
  IF item_type = 'claim' THEN
    SELECT ARRAY[
      s.created_by,
      array_to_string(array_agg(DISTINCT t.executed_by), ',')
    ] INTO chain
    FROM claims_registry c
    LEFT JOIN sources s ON c.source_id = s.id
    LEFT JOIN LATERAL unnest(c.transform_chain) AS tc(tid) ON true
    LEFT JOIN transforms t ON tc.tid = t.id
    WHERE c.id = item_id
    GROUP BY s.created_by;
  ELSIF item_type = 'source' THEN
    SELECT custody_chain INTO chain
    FROM sources
    WHERE id = item_id;
  END IF;

  RETURN COALESCE(chain, '{}');
END;
$$ LANGUAGE plpgsql;

-- Function to validate transform chain integrity
CREATE OR REPLACE FUNCTION validate_transform_chain(transform_ids TEXT[])
RETURNS BOOLEAN AS $$
DECLARE
  prev_hash TEXT;
  curr_input TEXT;
BEGIN
  FOR i IN 1..array_length(transform_ids, 1) LOOP
    SELECT input_hash, output_hash INTO curr_input, prev_hash
    FROM transforms
    WHERE id = transform_ids[i];

    -- First transform doesn't need validation
    IF i = 1 THEN
      CONTINUE;
    END IF;

    -- Check if current input matches previous output
    IF curr_input != prev_hash THEN
      RETURN FALSE;
    END IF;
  END LOOP;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS (adjust as needed for your security model)
-- ============================================================================
-- GRANT SELECT, INSERT ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT SELECT ON ALL VIEWS IN SCHEMA public TO app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO app_user;

-- ============================================================================
-- INITIAL DATA (optional)
-- ============================================================================

-- Insert default licenses
INSERT INTO licenses (id, license_type, license_terms, restrictions, attribution_required)
VALUES
  ('license-public-domain', 'public', 'Public Domain', '{}', false),
  ('license-internal', 'internal', 'Internal Use Only', ARRAY['no-external-sharing'], true),
  ('license-restricted', 'restricted', 'Restricted Access', ARRAY['authorized-personnel-only', 'no-export'], true),
  ('license-classified', 'classified', 'Classified Material', ARRAY['clearance-required', 'no-reproduction', 'secure-handling'], true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON SCHEMA public IS 'Provenance Ledger Beta - Schema version 1.0.0 - 2025-11-20';
