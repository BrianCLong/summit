-- Provenance Ledger: Claims-Evidence Relationships & Enhanced Features
-- Migration: 2025-11-24_provenance_ledger_claims_evidence
-- Adds claim-evidence linking, contradiction/support relationships, and enhanced manifests

-- ============================================================================
-- CLAIM-EVIDENCE LINKING TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS claim_evidence (
  id TEXT PRIMARY KEY DEFAULT 'ce_' || gen_random_uuid(),
  claim_id TEXT NOT NULL,
  evidence_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL DEFAULT 'supports' CHECK (relationship_type IN ('supports', 'contradicts', 'references')),
  confidence NUMERIC(5,4) CHECK (confidence >= 0 AND confidence <= 1),
  linked_by TEXT NOT NULL,
  linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(claim_id, evidence_id)
);

CREATE INDEX IF NOT EXISTS claim_evidence_claim_idx ON claim_evidence(claim_id);
CREATE INDEX IF NOT EXISTS claim_evidence_evidence_idx ON claim_evidence(evidence_id);
CREATE INDEX IF NOT EXISTS claim_evidence_type_idx ON claim_evidence(relationship_type);

COMMENT ON TABLE claim_evidence IS 'Links claims to supporting/contradicting evidence';
COMMENT ON COLUMN claim_evidence.relationship_type IS 'How evidence relates to claim: supports, contradicts, or references';
COMMENT ON COLUMN claim_evidence.confidence IS 'Confidence score for this linkage (0-1)';

-- ============================================================================
-- CLAIM-CLAIM RELATIONSHIPS TABLE (Contradiction/Support Graph)
-- ============================================================================
CREATE TABLE IF NOT EXISTS claim_relationships (
  id TEXT PRIMARY KEY DEFAULT 'cr_' || gen_random_uuid(),
  source_claim_id TEXT NOT NULL,
  target_claim_id TEXT NOT NULL,
  relationship_type TEXT NOT NULL CHECK (relationship_type IN ('contradicts', 'supports', 'supersedes', 'refines')),
  strength NUMERIC(5,4) CHECK (strength >= 0 AND strength <= 1),
  rationale TEXT,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  UNIQUE(source_claim_id, target_claim_id, relationship_type)
);

CREATE INDEX IF NOT EXISTS claim_relationships_source_idx ON claim_relationships(source_claim_id);
CREATE INDEX IF NOT EXISTS claim_relationships_target_idx ON claim_relationships(target_claim_id);
CREATE INDEX IF NOT EXISTS claim_relationships_type_idx ON claim_relationships(relationship_type);

COMMENT ON TABLE claim_relationships IS 'Graph of claim-to-claim relationships including contradictions and support';
COMMENT ON COLUMN claim_relationships.strength IS 'Strength of relationship (0-1)';
COMMENT ON COLUMN claim_relationships.rationale IS 'Human-readable explanation of relationship';

-- ============================================================================
-- SIGNED MANIFESTS TABLE (Enhanced)
-- ============================================================================
CREATE TABLE IF NOT EXISTS signed_manifests (
  id TEXT PRIMARY KEY DEFAULT 'manifest_' || gen_random_uuid(),
  case_id TEXT,
  manifest_version TEXT NOT NULL DEFAULT '2.0.0',
  manifest_type TEXT NOT NULL DEFAULT 'disclosure' CHECK (manifest_type IN ('disclosure', 'chain-of-custody', 'selective', 'audit')),
  content_hash TEXT NOT NULL,
  merkle_root TEXT NOT NULL,
  merkle_tree JSONB NOT NULL,
  signature TEXT,
  signature_algorithm TEXT DEFAULT 'ed25519',
  signer_key_id TEXT,
  evidence_ids TEXT[] NOT NULL DEFAULT '{}',
  claim_ids TEXT[] NOT NULL DEFAULT '{}',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS signed_manifests_case_idx ON signed_manifests(case_id);
CREATE INDEX IF NOT EXISTS signed_manifests_hash_idx ON signed_manifests(content_hash);
CREATE INDEX IF NOT EXISTS signed_manifests_merkle_idx ON signed_manifests(merkle_root);
CREATE INDEX IF NOT EXISTS signed_manifests_type_idx ON signed_manifests(manifest_type);

COMMENT ON TABLE signed_manifests IS 'Cryptographically signed export manifests with Merkle proofs';

-- ============================================================================
-- MANIFEST INCLUSION PROOFS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS manifest_inclusion_proofs (
  id TEXT PRIMARY KEY DEFAULT 'proof_' || gen_random_uuid(),
  manifest_id TEXT NOT NULL REFERENCES signed_manifests(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('evidence', 'claim', 'source', 'transform')),
  leaf_hash TEXT NOT NULL,
  proof_path JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS manifest_proofs_manifest_idx ON manifest_inclusion_proofs(manifest_id);
CREATE INDEX IF NOT EXISTS manifest_proofs_item_idx ON manifest_inclusion_proofs(item_id);

COMMENT ON TABLE manifest_inclusion_proofs IS 'Merkle inclusion proofs for items in signed manifests';

-- ============================================================================
-- PROVENANCE EVENTS TABLE (for Kafka outbox pattern)
-- ============================================================================
CREATE TABLE IF NOT EXISTS provenance_events (
  id TEXT PRIMARY KEY DEFAULT 'evt_' || gen_random_uuid(),
  event_type TEXT NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ,
  publish_error TEXT
);

CREATE INDEX IF NOT EXISTS provenance_events_type_idx ON provenance_events(event_type);
CREATE INDEX IF NOT EXISTS provenance_events_aggregate_idx ON provenance_events(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS provenance_events_unpublished_idx ON provenance_events(created_at) WHERE published_at IS NULL;

COMMENT ON TABLE provenance_events IS 'Outbox table for reliable event publishing to Kafka';
COMMENT ON COLUMN provenance_events.published_at IS 'NULL until successfully published to message broker';

-- ============================================================================
-- VIEWS FOR CLAIM GRAPH ANALYSIS
-- ============================================================================

-- View: Claims with their evidence support
CREATE OR REPLACE VIEW claim_evidence_summary AS
SELECT
  c.id as claim_id,
  c.content,
  c.hash as claim_hash,
  c.created_at as claim_created_at,
  COUNT(ce.evidence_id) FILTER (WHERE ce.relationship_type = 'supports') as supporting_evidence_count,
  COUNT(ce.evidence_id) FILTER (WHERE ce.relationship_type = 'contradicts') as contradicting_evidence_count,
  AVG(ce.confidence) FILTER (WHERE ce.relationship_type = 'supports') as avg_support_confidence,
  array_agg(DISTINCT ce.evidence_id) FILTER (WHERE ce.evidence_id IS NOT NULL) as evidence_ids
FROM claims c
LEFT JOIN claim_evidence ce ON c.id = ce.claim_id
GROUP BY c.id, c.content, c.hash, c.created_at;

COMMENT ON VIEW claim_evidence_summary IS 'Summary of claims with their supporting and contradicting evidence';

-- View: Claim contradiction network
CREATE OR REPLACE VIEW claim_contradiction_graph AS
SELECT
  cr.source_claim_id,
  c1.content as source_content,
  c1.hash as source_hash,
  cr.target_claim_id,
  c2.content as target_content,
  c2.hash as target_hash,
  cr.relationship_type,
  cr.strength,
  cr.rationale,
  cr.created_at
FROM claim_relationships cr
JOIN claims c1 ON cr.source_claim_id = c1.id
JOIN claims c2 ON cr.target_claim_id = c2.id;

COMMENT ON VIEW claim_contradiction_graph IS 'Graph view of claim relationships including contradictions';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to get all claims contradicting a given claim
CREATE OR REPLACE FUNCTION get_contradicting_claims(p_claim_id TEXT)
RETURNS TABLE(
  claim_id TEXT,
  content JSONB,
  hash TEXT,
  strength NUMERIC,
  rationale TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.hash,
    cr.strength,
    cr.rationale
  FROM claims c
  JOIN claim_relationships cr ON (
    (cr.source_claim_id = p_claim_id AND cr.target_claim_id = c.id)
    OR (cr.target_claim_id = p_claim_id AND cr.source_claim_id = c.id)
  )
  WHERE cr.relationship_type = 'contradicts';
END;
$$ LANGUAGE plpgsql;

-- Function to get all claims supporting a given claim
CREATE OR REPLACE FUNCTION get_supporting_claims(p_claim_id TEXT)
RETURNS TABLE(
  claim_id TEXT,
  content JSONB,
  hash TEXT,
  strength NUMERIC,
  rationale TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.content,
    c.hash,
    cr.strength,
    cr.rationale
  FROM claims c
  JOIN claim_relationships cr ON cr.source_claim_id = p_claim_id AND cr.target_claim_id = c.id
  WHERE cr.relationship_type = 'supports';
END;
$$ LANGUAGE plpgsql;

-- Function to compute claim confidence based on evidence
CREATE OR REPLACE FUNCTION compute_claim_confidence(p_claim_id TEXT)
RETURNS NUMERIC AS $$
DECLARE
  support_score NUMERIC;
  contradict_score NUMERIC;
  result NUMERIC;
BEGIN
  SELECT
    COALESCE(AVG(confidence) FILTER (WHERE relationship_type = 'supports'), 0),
    COALESCE(AVG(confidence) FILTER (WHERE relationship_type = 'contradicts'), 0)
  INTO support_score, contradict_score
  FROM claim_evidence
  WHERE claim_id = p_claim_id;

  -- Simple formula: support - contradict, clamped to [0, 1]
  result := GREATEST(0, LEAST(1, support_score - (contradict_score * 0.5)));
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGER FOR EVENT EMISSION
-- ============================================================================

-- Function to emit events on claim creation
CREATE OR REPLACE FUNCTION emit_claim_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO provenance_events (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'claim.created',
    'claim',
    NEW.id,
    jsonb_build_object(
      'claim_id', NEW.id,
      'hash', NEW.hash,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER claim_created_trigger
  AFTER INSERT ON claims
  FOR EACH ROW
  EXECUTE FUNCTION emit_claim_event();

-- Function to emit events on evidence registration
CREATE OR REPLACE FUNCTION emit_evidence_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO provenance_events (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'evidence.registered',
    'evidence',
    NEW.id,
    jsonb_build_object(
      'evidence_id', NEW.id,
      'checksum', NEW.checksum,
      'case_id', NEW.case_id,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER evidence_registered_trigger
  AFTER INSERT ON evidence
  FOR EACH ROW
  EXECUTE FUNCTION emit_evidence_event();

-- Function to emit events on manifest creation
CREATE OR REPLACE FUNCTION emit_manifest_event()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO provenance_events (event_type, aggregate_type, aggregate_id, payload)
  VALUES (
    'manifest.created',
    'manifest',
    NEW.id,
    jsonb_build_object(
      'manifest_id', NEW.id,
      'case_id', NEW.case_id,
      'merkle_root', NEW.merkle_root,
      'manifest_type', NEW.manifest_type,
      'created_at', NEW.created_at
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER manifest_created_trigger
  AFTER INSERT ON signed_manifests
  FOR EACH ROW
  EXECUTE FUNCTION emit_manifest_event();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
COMMENT ON SCHEMA public IS 'Provenance Ledger - Claims-Evidence Extension v1.0 - 2025-11-24';
