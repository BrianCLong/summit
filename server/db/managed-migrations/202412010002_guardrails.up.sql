CREATE TABLE IF NOT EXISTS migration_guardrails (
  id BIGSERIAL PRIMARY KEY,
  rule TEXT NOT NULL,
  enforced BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO migration_guardrails (rule, enforced)
VALUES
  ('Avoid blocking drops/renames outside maintenance windows', true),
  ('Require lock_timeout/statement_timeout for online safety', true)
ON CONFLICT DO NOTHING;
