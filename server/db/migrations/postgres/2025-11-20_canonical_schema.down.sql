-- Down migration for 2025-11-20_canonical_schema.sql

BEGIN;

-- Drop Views
DROP VIEW IF EXISTS er_cluster_stats;
DROP VIEW IF EXISTS er_queue_summary;

-- Drop Triggers
DROP TRIGGER IF EXISTS er_thresholds_updated_at ON er_thresholds;
DROP TRIGGER IF EXISTS er_review_queue_updated_at ON er_review_queue;

-- Drop Functions
DROP FUNCTION IF EXISTS compute_er_precision;
DROP FUNCTION IF EXISTS update_updated_at_column;

-- Drop Tables
DROP TABLE IF EXISTS er_thresholds;
DROP TABLE IF EXISTS resolution_clusters;
DROP TABLE IF EXISTS er_review_queue;

-- Drop Columns from relationships
ALTER TABLE relationships DROP COLUMN IF EXISTS until;
ALTER TABLE relationships DROP COLUMN IF EXISTS since;
ALTER TABLE relationships DROP COLUMN IF EXISTS directed;
ALTER TABLE relationships DROP COLUMN IF EXISTS version;
ALTER TABLE relationships DROP COLUMN IF EXISTS provenance;
ALTER TABLE relationships DROP COLUMN IF EXISTS policy_labels;
ALTER TABLE relationships DROP COLUMN IF EXISTS recorded_at;
ALTER TABLE relationships DROP COLUMN IF EXISTS valid_to;
ALTER TABLE relationships DROP COLUMN IF EXISTS valid_from;

-- Drop Columns from entities
ALTER TABLE entities DROP COLUMN IF EXISTS version;
ALTER TABLE entities DROP COLUMN IF EXISTS provenance;
ALTER TABLE entities DROP COLUMN IF EXISTS policy_labels;
ALTER TABLE entities DROP COLUMN IF EXISTS recorded_at;
ALTER TABLE entities DROP COLUMN IF EXISTS valid_to;
ALTER TABLE entities DROP COLUMN IF EXISTS valid_from;
ALTER TABLE entities DROP COLUMN IF EXISTS canonical_id;

COMMIT;
