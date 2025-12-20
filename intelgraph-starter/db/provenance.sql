CREATE TABLE IF NOT EXISTS provenance_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id TEXT NOT NULL,
  source TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS provenance_entity_idx ON provenance_events (entity_id);
CREATE INDEX IF NOT EXISTS provenance_actor_idx ON provenance_events (actor);

CREATE TABLE IF NOT EXISTS audit_trail (
  id BIGSERIAL PRIMARY KEY,
  actor TEXT NOT NULL,
  path TEXT NOT NULL,
  verb TEXT NOT NULL,
  status INTEGER NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

COMMENT ON TABLE provenance_events IS 'Entity-level provenance with source + actor + action details';
COMMENT ON TABLE audit_trail IS 'HTTP audit for gateway + ingest interactions';
