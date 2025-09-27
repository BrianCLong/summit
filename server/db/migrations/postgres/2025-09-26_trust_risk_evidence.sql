-- Trust/Risk/Evidence persistence
-- Note: using TEXT ids to avoid extension dependencies

CREATE TABLE IF NOT EXISTS trust_scores (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  score NUMERIC(5,4) NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  evidence_id TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trust_scores_tenant_subject_idx ON trust_scores(tenant_id, subject_id);

CREATE TABLE IF NOT EXISTS risk_signals (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  source TEXT NOT NULL,
  context JSONB,
  evidence_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS risk_signals_tenant_kind_sev_idx ON risk_signals(tenant_id, kind, severity);

CREATE TABLE IF NOT EXISTS evidence_bundles (
  id TEXT PRIMARY KEY,
  tenant_id TEXT,
  service TEXT NOT NULL,
  release_id TEXT NOT NULL,
  artifacts JSONB NOT NULL,
  slo JSONB NOT NULL,
  cost JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_bundles_service_release_idx ON evidence_bundles(service, release_id);

