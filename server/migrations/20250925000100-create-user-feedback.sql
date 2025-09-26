CREATE TABLE IF NOT EXISTS user_feedback (
  id UUID PRIMARY KEY,
  tenant_id TEXT,
  user_id TEXT,
  user_email TEXT,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'NEW',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_feedback_category_idx ON user_feedback (category);
CREATE INDEX IF NOT EXISTS user_feedback_status_idx ON user_feedback (status);
CREATE INDEX IF NOT EXISTS user_feedback_created_at_idx ON user_feedback (created_at DESC);

CREATE OR REPLACE FUNCTION set_user_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_feedback_set_updated_at ON user_feedback;
CREATE TRIGGER user_feedback_set_updated_at
BEFORE UPDATE ON user_feedback
FOR EACH ROW
EXECUTE FUNCTION set_user_feedback_updated_at();
