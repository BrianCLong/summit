CREATE TABLE IF NOT EXISTS disclosure_packs (
  id               TEXT PRIMARY KEY,
  tenant_id        TEXT NOT NULL,
  product          TEXT NOT NULL,
  environment      TEXT NOT NULL,
  build_id         TEXT NOT NULL,
  generated_at     TIMESTAMPTZ NOT NULL,
  generated_by     TEXT NOT NULL,
  sbom_uri         TEXT NOT NULL,
  vuln_critical    INTEGER NOT NULL DEFAULT 0,
  vuln_high        INTEGER NOT NULL DEFAULT 0,
  vuln_medium      INTEGER NOT NULL DEFAULT 0,
  vuln_low         INTEGER NOT NULL DEFAULT 0,
  slo_period       TEXT,
  slo_availability_target DOUBLE PRECISION,
  slo_availability_actual DOUBLE PRECISION,
  slo_latency_target_ms_p95 DOUBLE PRECISION,
  slo_latency_actual_ms_p95 DOUBLE PRECISION,
  raw_json         JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_disclosure_packs_tenant_env
  ON disclosure_packs (tenant_id, environment, generated_at DESC);
