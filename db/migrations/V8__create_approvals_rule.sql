CREATE TABLE IF NOT EXISTS approvals_rule (
  run_id text NOT NULL,
  step_id text NOT NULL,
  required integer NOT NULL DEFAULT 1,
  approvers text[] NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, step_id)
);

-- Optional: approvals table if missing
-- CREATE TABLE approvals (
--   run_id text NOT NULL,
--   step_id text NOT NULL,
--   user_id text NOT NULL,
--   verdict text NOT NULL CHECK (verdict IN ('approved','declined')),
--   reason text,
--   created_at timestamptz DEFAULT now()
-- );
