-- Down migration for Maestro Runs Partitioning

-- 1. Drop the partitioned table (and its partitions)
DROP TABLE IF EXISTS maestro_runs CASCADE;

-- 2. Restore the legacy table
ALTER TABLE maestro_runs_legacy RENAME TO maestro_runs;
