CREATE TABLE IF NOT EXISTS writesets (
  writeset_id TEXT PRIMARY KEY,
  system_time TIMESTAMP NOT NULL,
  source TEXT NOT NULL,
  actor TEXT,
  sha256 TEXT NOT NULL,
  json TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ws_claims (
  writeset_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  graph TEXT NOT NULL,
  subject TEXT NOT NULL,
  predicate TEXT NOT NULL,
  object TEXT NOT NULL,
  confidence DOUBLE NOT NULL,
  valid_from TIMESTAMP NOT NULL,
  valid_to TIMESTAMP,
  evidence_count INTEGER NOT NULL,
  PRIMARY KEY (writeset_id, claim_id)
);

CREATE TABLE IF NOT EXISTS ws_promotions (
  writeset_id TEXT NOT NULL,
  promotion_id TEXT NOT NULL,
  claim_id TEXT NOT NULL,
  from_graph TEXT NOT NULL,
  to_graph TEXT NOT NULL,
  PRIMARY KEY (writeset_id, promotion_id)
);
