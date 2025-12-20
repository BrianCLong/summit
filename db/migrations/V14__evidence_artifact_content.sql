CREATE TABLE IF NOT EXISTS evidence_artifact_content (
  artifact_id UUID PRIMARY KEY REFERENCES evidence_artifacts(id) ON DELETE CASCADE,
  content BYTEA NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/json',
  created_at TIMESTAMPTZ DEFAULT now()
);
