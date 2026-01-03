-- Autonomous Agents research feed persistence
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS autonomous_agent_papers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id TEXT UNIQUE NOT NULL,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_path TEXT NOT NULL,
  source_commit TEXT NOT NULL,
  extracted_at TIMESTAMPTZ NOT NULL,
  paper_title TEXT NOT NULL,
  paper_url TEXT NOT NULL,
  paper_host TEXT,
  published_or_listed_date DATE,
  summary_bullets JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT '{}',
  external_ids JSONB DEFAULT '{}'::jsonb,
  record_hash TEXT NOT NULL,
  normalized_title TEXT NOT NULL,
  arxiv_id TEXT,
  doi TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_autonomous_agent_papers_arxiv ON autonomous_agent_papers(arxiv_id);
CREATE INDEX IF NOT EXISTS idx_autonomous_agent_papers_title_host ON autonomous_agent_papers(normalized_title, paper_host);
CREATE INDEX IF NOT EXISTS idx_autonomous_agent_papers_tags ON autonomous_agent_papers USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_autonomous_agent_papers_summary ON autonomous_agent_papers USING GIN(summary_bullets);

CREATE TABLE IF NOT EXISTS autonomous_agent_ingest_state (
  source_name TEXT PRIMARY KEY,
  last_ingested_commit TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
