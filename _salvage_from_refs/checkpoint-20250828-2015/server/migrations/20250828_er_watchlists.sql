-- Enable pgvector for ER
CREATE EXTENSION IF NOT EXISTS vector;

-- Entity vectors for nearest neighbor search
CREATE TABLE IF NOT EXISTS entity_vectors (
  hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding vector(384) NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_entity_vectors_kind ON entity_vectors(kind);
CREATE INDEX IF NOT EXISTS idx_entity_vectors_embedding ON entity_vectors USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);

-- ER suggestions
CREATE TABLE IF NOT EXISTS er_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  left_id TEXT NOT NULL,
  right_id TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'OPEN', -- OPEN, ACCEPTED, REJECTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_er_suggestions_status ON er_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_er_suggestions_conf ON er_suggestions(confidence);

-- Canonical entities and aliases
CREATE TABLE IF NOT EXISTS entities_canonical (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  name TEXT,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS entity_alias (
  canonical_id UUID NOT NULL REFERENCES entities_canonical(id) ON DELETE CASCADE,
  alias TEXT NOT NULL,
  source_hash TEXT,
  UNIQUE (canonical_id, alias)
);

-- Watchlists & alerts
CREATE TABLE IF NOT EXISTS watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id TEXT,
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS watchlist_members (
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'VIEWER',
  PRIMARY KEY (watchlist_id, user_id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  watchlist_id UUID NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
  entity_hash TEXT,
  doc_hash TEXT NOT NULL,
  rule_id TEXT,
  status TEXT NOT NULL DEFAULT 'NEW', -- NEW, ACKED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alerts_watchlist ON alerts(watchlist_id, status, created_at DESC);

