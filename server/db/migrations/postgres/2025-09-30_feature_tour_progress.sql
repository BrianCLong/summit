CREATE TABLE IF NOT EXISTS feature_tour_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tour_key TEXT NOT NULL,
  completed_at TIMESTAMPTZ,
  last_step INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT feature_tour_progress_user_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT feature_tour_progress_unique UNIQUE (user_id, tour_key)
);

CREATE INDEX IF NOT EXISTS idx_feature_tour_progress_user ON feature_tour_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_tour_progress_tour ON feature_tour_progress(tour_key);

CREATE OR REPLACE FUNCTION set_feature_tour_progress_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_feature_tour_progress_updated ON feature_tour_progress;
CREATE TRIGGER trg_feature_tour_progress_updated
BEFORE UPDATE ON feature_tour_progress
FOR EACH ROW
EXECUTE FUNCTION set_feature_tour_progress_updated_at();
