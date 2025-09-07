CREATE TABLE IF NOT EXISTS trust_contracts(
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL, consumer text NOT NULL,
  scope jsonb NOT NULL, residency text NOT NULL,
  expires_at timestamptz NOT NULL, signature text NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_trust ON trust_contracts(provider, consumer, signature);

CREATE TABLE IF NOT EXISTS meters(
  tenant text NOT NULL, ts timestamptz NOT NULL,
  cpu_sec numeric, gb_sec numeric, egress_gb numeric,
  dp_epsilon numeric, plugin_calls int
);
CREATE INDEX IF NOT EXISTS idx_meters_tenant_ts ON meters(tenant, ts);

ALTER TABLE run ADD COLUMN IF NOT EXISTS tenant_ns text;
