-- Add soft-delete support and audit trail for entity comments
ALTER TABLE maestro.entity_comments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by TEXT,
  ADD COLUMN IF NOT EXISTS delete_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_entity_comments_deleted_at
  ON maestro.entity_comments(deleted_at);

CREATE TABLE IF NOT EXISTS maestro.entity_comment_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES maestro.entity_comments(id) ON DELETE CASCADE,
  tenant_id VARCHAR(255) NOT NULL,
  action TEXT NOT NULL,
  actor_id TEXT,
  reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_entity_comment_audits_comment
  ON maestro.entity_comment_audits(comment_id);
