CREATE TABLE IF NOT EXISTS pool_registry (
  id text PRIMARY KEY,
  region text NOT NULL,
  labels text[] DEFAULT '{}',
  capacity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pool_pricing (
  pool_id text REFERENCES pool_registry(id) ON DELETE CASCADE,
  cpu_sec_usd numeric NOT NULL,
  gb_sec_usd numeric NOT NULL,
  egress_gb_usd numeric NOT NULL,
  effective_at timestamptz DEFAULT now(),
  PRIMARY KEY (pool_id)
);
