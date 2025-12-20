ALTER TABLE IF EXISTS users
  DROP COLUMN IF EXISTS display_name_canonical;

DROP TABLE IF EXISTS online_migration_parity_samples;
DROP TABLE IF EXISTS online_migration_backfill_state;
DROP TABLE IF EXISTS online_migration_runs;
