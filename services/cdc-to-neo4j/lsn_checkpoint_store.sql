CREATE TABLE IF NOT EXISTS cdc_consumer_checkpoints (
  consumer_name text PRIMARY KEY,
  last_lsn pg_lsn NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- optional helper upsert
CREATE OR REPLACE FUNCTION set_consumer_lsn(p_consumer text, p_lsn pg_lsn)
RETURNS void AS $$
BEGIN
  INSERT INTO cdc_consumer_checkpoints (consumer_name, last_lsn)
  VALUES (p_consumer, p_lsn)
  ON CONFLICT (consumer_name) DO UPDATE
  SET last_lsn = EXCLUDED.last_lsn, updated_at = now();
END; $$ LANGUAGE plpgsql;
