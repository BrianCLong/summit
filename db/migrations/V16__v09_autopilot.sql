CREATE TABLE IF NOT EXISTS slo_policies(
  id bigserial PRIMARY KEY,
  runbook text NOT NULL,
  tenant text NOT NULL,
  latency_p95_ms int,
  success_rate_pct numeric,
  cost_per_run_usd numeric,
  window text NOT NULL DEFAULT '24h',
  UNIQUE(runbook, tenant)
);

CREATE TABLE IF NOT EXISTS slo_windows(
  id bigserial PRIMARY KEY,
  runbook text, tenant text,
  window_start timestamptz, window_end timestamptz,
  p95_ms numeric, success_rate numeric, cost_per_run numeric, burn_rate numeric
);

CREATE TABLE IF NOT EXISTS incidents(
  id uuid PRIMARY KEY,
  runbook text, tenant text, severity text, status text,
  opened_at timestamptz DEFAULT now(), closed_at timestamptz,
  reason text, details jsonb
);

CREATE TABLE IF NOT EXISTS bandit_state(
  runbook text, step_id text, variant_key text,
  alpha numeric DEFAULT 1, beta numeric DEFAULT 1,
  reward_sum numeric DEFAULT 0, pulls bigint DEFAULT 0,
  PRIMARY KEY(runbook, step_id, variant_key)
);
