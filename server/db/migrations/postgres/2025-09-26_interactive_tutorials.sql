-- Interactive tutorial progress tracking

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutorial_id TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS user_tutorial_progress_completed_idx
  ON user_tutorial_progress (completed);

CREATE INDEX IF NOT EXISTS user_tutorial_progress_completed_at_idx
  ON user_tutorial_progress (completed_at);

CREATE TRIGGER user_tutorial_progress_updated_at
  BEFORE UPDATE ON user_tutorial_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_timestamp();
