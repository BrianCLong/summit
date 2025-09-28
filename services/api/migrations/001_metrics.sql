CREATE TABLE IF NOT EXISTS account_metrics (
  source TEXT NOT NULL,
  account_id TEXT NOT NULL,
  ts BIGINT NOT NULL,
  followers BIGINT NOT NULL,
  PRIMARY KEY (source, account_id, ts)
);