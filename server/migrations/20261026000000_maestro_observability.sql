-- Add failure_details to runs table
ALTER TABLE runs ADD COLUMN IF NOT EXISTS failure_details JSONB;

-- Create run_events table
CREATE TABLE IF NOT EXISTS run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_run_events_run_id ON run_events(run_id);
