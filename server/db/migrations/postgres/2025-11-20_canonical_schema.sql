-- Canonical Graph Schema Migration
-- GA-ready entity resolution and provenance tracking
-- Author: Summit Team
-- Date: 2025-11-20

BEGIN;

-- =========================================================================
-- 1. Extend entities table with canonical schema fields
-- =========================================================================

ALTER TABLE entities ADD COLUMN IF NOT EXISTS canonical_id UUID;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE entities ADD COLUMN IF NOT EXISTS policy_labels JSONB;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS provenance JSONB;
ALTER TABLE entities ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;

-- Indexes for canonical fields
CREATE INDEX IF NOT EXISTS entities_canonical_id_idx ON entities(canonical_id);
CREATE INDEX IF NOT EXISTS entities_valid_from_idx ON entities(valid_from);
CREATE INDEX IF NOT EXISTS entities_valid_to_idx ON entities(valid_to);
CREATE INDEX IF NOT EXISTS entities_policy_labels_gin ON entities USING GIN(policy_labels);
CREATE INDEX IF NOT EXISTS entities_provenance_gin ON entities USING GIN(provenance);

-- Composite index for temporal queries
CREATE INDEX IF NOT EXISTS entities_temporal_idx ON entities(valid_from, valid_to);

COMMENT ON COLUMN entities.canonical_id IS 'ER master entity ID - all duplicates point to canonical';
COMMENT ON COLUMN entities.valid_from IS 'Business time start (bitemporal model)';
COMMENT ON COLUMN entities.valid_to IS 'Business time end (bitemporal model)';
COMMENT ON COLUMN entities.recorded_at IS 'System time when record was created';
COMMENT ON COLUMN entities.policy_labels IS 'Policy labels: origin, sensitivity, clearance, etc.';
COMMENT ON COLUMN entities.provenance IS 'Full provenance chain with assertions';

-- =========================================================================
-- 2. Extend relationships table with canonical fields
-- =========================================================================

ALTER TABLE relationships ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS valid_to TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS policy_labels JSONB;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS provenance JSONB;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS version INT DEFAULT 1;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS directed BOOLEAN DEFAULT TRUE;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS since TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS until TIMESTAMPTZ;

-- Indexes for relationships
CREATE INDEX IF NOT EXISTS relationships_valid_from_idx ON relationships(valid_from);
CREATE INDEX IF NOT EXISTS relationships_policy_labels_gin ON relationships USING GIN(policy_labels);

-- =========================================================================
-- 3. ER Review Queue Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS er_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_a_id UUID NOT NULL,
  entity_b_id UUID NOT NULL,
  match_score JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_REVIEW', 'DECIDED', 'ESCALATED')),
  priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  assigned_to UUID REFERENCES users(id),
  due_at TIMESTAMPTZ,
  entity_a_snapshot JSONB NOT NULL,
  entity_b_snapshot JSONB NOT NULL,
  conflicting_attributes TEXT[],
  shared_relationships INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decision TEXT CHECK (decision IN ('MERGE', 'NO_MERGE', 'DEFER', 'SPLIT')),
  notes TEXT
);

CREATE INDEX er_review_queue_status_idx ON er_review_queue(status, priority);
CREATE INDEX er_review_queue_assigned_idx ON er_review_queue(assigned_to);
CREATE INDEX er_review_queue_created_idx ON er_review_queue(created_at DESC);
CREATE INDEX er_review_queue_entity_a_idx ON er_review_queue(entity_a_id);
CREATE INDEX er_review_queue_entity_b_idx ON er_review_queue(entity_b_id);

COMMENT ON TABLE er_review_queue IS 'Manual review queue for entity resolution decisions';

-- =========================================================================
-- 4. Resolution Clusters Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS resolution_clusters (
  id UUID PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  canonical_entity_id UUID NOT NULL REFERENCES entities(id),
  resolution JSONB NOT NULL,
  evidence JSONB,
  conflicts JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  version INT DEFAULT 1,
  revertible BOOLEAN DEFAULT TRUE,
  reverted_from UUID REFERENCES resolution_clusters(id)
);

CREATE INDEX resolution_clusters_tenant_idx ON resolution_clusters(tenant_id);
CREATE INDEX resolution_clusters_entity_ids_idx ON resolution_clusters USING GIN(entity_ids);
CREATE INDEX resolution_clusters_canonical_idx ON resolution_clusters(canonical_entity_id);
CREATE INDEX resolution_clusters_created_idx ON resolution_clusters(created_at DESC);

COMMENT ON TABLE resolution_clusters IS 'ER clusters tracking merged entity groups';
COMMENT ON COLUMN resolution_clusters.entity_ids IS 'All entity IDs in this cluster';
COMMENT ON COLUMN resolution_clusters.canonical_entity_id IS 'The master/golden record entity ID';
COMMENT ON COLUMN resolution_clusters.revertible IS 'Whether this merge can be undone';

-- =========================================================================
-- 5. ER Thresholds Configuration Table
-- =========================================================================

CREATE TABLE IF NOT EXISTS er_thresholds (
  entity_type TEXT PRIMARY KEY,
  auto_merge_threshold NUMERIC(5,4) NOT NULL,
  manual_review_threshold NUMERIC(5,4) NOT NULL,
  reject_threshold NUMERIC(5,4) NOT NULL,
  target_precision NUMERIC(5,4) NOT NULL,
  current_precision NUMERIC(5,4),
  sample_size INT DEFAULT 0,
  last_calibrated TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE er_thresholds IS 'ER decision thresholds by entity type';

-- Initialize default thresholds (from GA requirements)
INSERT INTO er_thresholds (
  entity_type,
  auto_merge_threshold,
  manual_review_threshold,
  reject_threshold,
  target_precision,
  current_precision
) VALUES
  ('PERSON', 0.90, 0.70, 0.70, 0.90, NULL),
  ('ORGANIZATION', 0.88, 0.70, 0.70, 0.88, NULL),
  ('LOCATION', 0.85, 0.65, 0.65, 0.85, NULL),
  ('ASSET', 0.82, 0.65, 0.65, 0.82, NULL),
  ('DEVICE', 0.80, 0.65, 0.65, 0.80, NULL),
  ('ACCOUNT', 0.85, 0.70, 0.70, 0.85, NULL)
ON CONFLICT (entity_type) DO NOTHING;

-- =========================================================================
-- 6. Functions for ER Precision Computation
-- =========================================================================

CREATE OR REPLACE FUNCTION compute_er_precision(
  p_entity_type TEXT,
  p_days_back INT DEFAULT 30
)
RETURNS TABLE(
  entity_type TEXT,
  current_precision NUMERIC,
  sample_size INT,
  meets_threshold BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    md.entity_type,
    CASE
      WHEN COUNT(*) FILTER (WHERE md.decision = 'MERGE') > 0 THEN
        COUNT(*) FILTER (WHERE md.decision = 'MERGE' AND md.confidence >= 0.8)::NUMERIC /
        COUNT(*) FILTER (WHERE md.decision = 'MERGE')::NUMERIC
      ELSE NULL
    END AS current_precision,
    COUNT(*)::INT AS sample_size,
    CASE
      WHEN COUNT(*) >= 100 THEN
        (COUNT(*) FILTER (WHERE md.decision = 'MERGE' AND md.confidence >= 0.8)::NUMERIC /
         NULLIF(COUNT(*) FILTER (WHERE md.decision = 'MERGE'), 0)::NUMERIC) >=
        (SELECT target_precision FROM er_thresholds WHERE entity_type = p_entity_type)
      ELSE FALSE
    END AS meets_threshold
  FROM merge_decisions md
  WHERE md.entity_type = p_entity_type
    AND md.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY md.entity_type;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_er_precision IS 'Compute current ER precision and check against GA thresholds';

-- =========================================================================
-- 7. Trigger to update updated_at timestamps
-- =========================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER er_review_queue_updated_at
  BEFORE UPDATE ON er_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER er_thresholds_updated_at
  BEFORE UPDATE ON er_thresholds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =========================================================================
-- 8. Views for ER Analytics
-- =========================================================================

CREATE OR REPLACE VIEW er_queue_summary AS
SELECT
  status,
  priority,
  entity_a_snapshot->>'type' AS entity_type,
  COUNT(*) AS count,
  AVG((match_score->>'overallScore')::FLOAT) AS avg_score
FROM er_review_queue
GROUP BY status, priority, entity_a_snapshot->>'type';

COMMENT ON VIEW er_queue_summary IS 'Summary statistics for ER review queue';

CREATE OR REPLACE VIEW er_cluster_stats AS
SELECT
  tenant_id,
  COUNT(*) AS total_clusters,
  SUM(ARRAY_LENGTH(entity_ids, 1)) AS total_entities_clustered,
  AVG(ARRAY_LENGTH(entity_ids, 1)) AS avg_cluster_size,
  MAX(ARRAY_LENGTH(entity_ids, 1)) AS max_cluster_size
FROM resolution_clusters
GROUP BY tenant_id;

COMMENT ON VIEW er_cluster_stats IS 'Statistics on resolution clusters by tenant';

-- =========================================================================
-- Grant permissions
-- =========================================================================

-- Grant read access to readonly role (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'readonly') THEN
    GRANT SELECT ON er_review_queue TO readonly;
    GRANT SELECT ON resolution_clusters TO readonly;
    GRANT SELECT ON er_thresholds TO readonly;
    GRANT SELECT ON er_queue_summary TO readonly;
    GRANT SELECT ON er_cluster_stats TO readonly;
  END IF;
END
$$;

COMMIT;

-- =========================================================================
-- Migration Complete
-- =========================================================================

-- Verification queries (run manually to verify)
/*
SELECT COUNT(*) FROM er_thresholds; -- Should show 6 entity types
SELECT * FROM er_queue_summary; -- Should be empty initially
SELECT * FROM er_cluster_stats; -- Should be empty initially

-- Check column additions
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'entities'
  AND column_name IN ('canonical_id', 'valid_from', 'policy_labels', 'provenance');
*/
