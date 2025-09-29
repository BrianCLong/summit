-- Entity revisions for change history
CREATE TABLE IF NOT EXISTS entity_revisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  state JSONB NOT NULL,
  diff JSONB NOT NULL,
  actor_id UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(entity_id, version)
);
CREATE INDEX IF NOT EXISTS entity_revisions_entity_idx ON entity_revisions(entity_id);
