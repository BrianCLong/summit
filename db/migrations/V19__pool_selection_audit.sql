CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS pool_selection_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  tenant_id text NOT NULL,
  request_id text NOT NULL,
  pool_id text,
  pool_price_usd numeric,
  residency text,
  est jsonb NOT NULL DEFAULT '{}'::jsonb,
  purpose text
);
