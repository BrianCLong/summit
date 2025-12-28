-- Sprint 12 Migrations

CREATE TABLE IF NOT EXISTS rag_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL,
  question TEXT NOT NULL,
  cypher TEXT,
  evidence_ids TEXT[],
  created_at BIGINT NOT NULL
);

CREATE INDEX idx_rag_turns_case_id ON rag_turns(case_id);

CREATE TABLE IF NOT EXISTS stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id TEXT NOT NULL,
  title TEXT NOT NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  timestamp BIGINT NOT NULL,
  description TEXT NOT NULL,
  entity_id TEXT,
  edge_id TEXT,
  source TEXT,
  created_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS story_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID REFERENCES stories(id),
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  citations TEXT[],
  position INT,
  created_at BIGINT NOT NULL
);
