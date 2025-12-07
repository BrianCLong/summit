-- services/er-service/db/001_bitemporal.sql
CREATE TABLE IF NOT EXISTS entity_link (
  id TEXT PRIMARY KEY,
  left_id TEXT NOT NULL,
  right_id TEXT NOT NULL,
  decision TEXT NOT NULL, -- MERGE/NO_MERGE/REVIEW
  score NUMERIC NOT NULL,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to   TIMESTAMPTZ,
  tx_time    TIMESTAMPTZ NOT NULL DEFAULT now()
);
