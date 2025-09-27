CREATE TABLE IF NOT EXISTS graph_annotations (
  id UUID PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('ENTITY', 'EDGE')),
  target_id TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence TEXT NOT NULL DEFAULT 'UNKNOWN',
  tags TEXT[] DEFAULT '{}'::TEXT[],
  enclave TEXT NOT NULL,
  created_by TEXT NOT NULL,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS graph_annotations_target_idx
  ON graph_annotations (target_type, target_id);

CREATE INDEX IF NOT EXISTS graph_annotations_enclave_idx
  ON graph_annotations (enclave);
