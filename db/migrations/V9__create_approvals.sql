CREATE TABLE IF NOT EXISTS approvals (
  run_id text NOT NULL,
  step_id text NOT NULL,
  user_id text NOT NULL,
  verdict text NOT NULL CHECK (verdict IN ('approved','declined')),
  reason text,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (run_id, step_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_run_step ON approvals(run_id, step_id);
