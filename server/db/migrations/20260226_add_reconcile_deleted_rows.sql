CREATE SCHEMA IF NOT EXISTS reconcile;

CREATE TABLE IF NOT EXISTS reconcile.deleted_rows (
  source_system text NOT NULL,
  db_name text,
  schema_name text,
  table_name text,
  pk_jsonb jsonb NOT NULL,
  pk_hash text NOT NULL,
  lsn bigint,
  txid bigint,
  deleted_at timestamptz DEFAULT now(),
  provenance jsonb,
  PRIMARY KEY (source_system, table_name, pk_hash)
);

-- Optional: modest index for purge filter
CREATE INDEX IF NOT EXISTS ix_deleted_rows_deleted_at
  ON reconcile.deleted_rows (deleted_at);

-- Purge function (days)
CREATE OR REPLACE FUNCTION reconcile.purge_old_deletions(retention_days int)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM reconcile.deleted_rows
  WHERE deleted_at < now() - make_interval(days => retention_days);
END; $$;
