CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  ts TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  case_id TEXT,
  details JSONB
);

CREATE TABLE IF NOT EXISTS signing_keys (
  id SERIAL PRIMARY KEY,
  label TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,  -- base64
  private_key TEXT NOT NULL, -- base64 (protect via secrets in prod or KMS)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  active BOOLEAN NOT NULL DEFAULT TRUE
);