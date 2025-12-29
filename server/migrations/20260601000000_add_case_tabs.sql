-- Add case_tabs table for multi-tab workspace support
CREATE TABLE IF NOT EXISTS maestro.case_tabs (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES maestro.cases(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_case_tabs_case_id ON maestro.case_tabs(case_id);
