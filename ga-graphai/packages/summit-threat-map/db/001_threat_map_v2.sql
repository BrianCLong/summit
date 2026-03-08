CREATE TABLE IF NOT EXISTS threat_event (
  id BIGSERIAL PRIMARY KEY,
  source TEXT NOT NULL,
  source_event_id TEXT NOT NULL,
  observed_at TIMESTAMPTZ NOT NULL,
  ingest_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip INET,
  asn BIGINT,
  port INTEGER,
  cve TEXT,
  exposure_state TEXT NOT NULL,
  compromise_state TEXT,
  severity NUMERIC(6,3) NOT NULL,
  confidence NUMERIC(6,3) NOT NULL,
  lat DOUBLE PRECISION,
  lon DOUBLE PRECISION,
  h3_index TEXT NOT NULL,
  evidence JSONB NOT NULL,
  raw_event JSONB NOT NULL,
  UNIQUE (source, source_event_id)
);

CREATE INDEX IF NOT EXISTS idx_threat_event_observed ON threat_event (observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_threat_event_h3 ON threat_event (h3_index, observed_at DESC);

CREATE MATERIALIZED VIEW IF NOT EXISTS hex_cell_risk AS
SELECT
  date_trunc('minute', observed_at) AS bucket_1m,
  date_bin('5 minutes', observed_at, '1970-01-01'::timestamptz) AS bucket_5m,
  h3_index,
  count(*) AS event_count,
  count(*) FILTER (WHERE exposure_state = 'exposed') AS exposed_count,
  count(*) FILTER (WHERE compromise_state = 'compromised') AS compromised_count,
  max(severity) AS max_severity,
  avg(severity) AS avg_severity
FROM threat_event
GROUP BY 1, 2, 3;

CREATE INDEX IF NOT EXISTS idx_hex_cell_risk_1m ON hex_cell_risk (bucket_1m DESC, h3_index);
CREATE INDEX IF NOT EXISTS idx_hex_cell_risk_5m ON hex_cell_risk (bucket_5m DESC, h3_index);
