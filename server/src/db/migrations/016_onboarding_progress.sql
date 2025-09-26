-- Onboarding progress tracking table
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  step_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NOT_STARTED',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT onboarding_progress_user_step_unique UNIQUE (user_id, step_key)
);

CREATE INDEX IF NOT EXISTS onboarding_progress_user_idx ON onboarding_progress (user_id);
CREATE INDEX IF NOT EXISTS onboarding_progress_step_idx ON onboarding_progress (step_key);

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION onboarding_progress_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS onboarding_progress_touch ON onboarding_progress;
CREATE TRIGGER onboarding_progress_touch
BEFORE UPDATE ON onboarding_progress
FOR EACH ROW
EXECUTE FUNCTION onboarding_progress_touch_updated_at();
