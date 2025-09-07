CREATE TABLE IF NOT EXISTS artifact_contracts (
  path text PRIMARY KEY,
  schema jsonb NOT NULL,
  version text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS golden_runs (
  runbook text NOT NULL,
  version text NOT NULL,
  run_id uuid NOT NULL,
  sha256 text NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (runbook, version)
);
