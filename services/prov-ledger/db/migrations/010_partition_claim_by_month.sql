-- time-based partitioning for claim.created_at
BEGIN;
ALTER TABLE claim DROP CONSTRAINT IF EXISTS claim_created_at_notnull;
ALTER TABLE claim ALTER COLUMN created_at SET NOT NULL;
CREATE TABLE IF NOT EXISTS claim_y2025m01 PARTITION OF claim FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
-- (migration tool will create monthly partitions automatically)
COMMIT;
