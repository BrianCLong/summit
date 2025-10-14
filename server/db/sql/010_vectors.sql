-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Basic snippet store with provenance + policy labels
CREATE TABLE IF NOT EXISTS rag_snippets (
  id BIGSERIAL PRIMARY KEY,
  entity_id TEXT,                   -- e.g., email:<id>, deck:<id>, intel:<id>
  kind TEXT,                        -- email|deck|intel|timeline|crm|note
  text TEXT NOT NULL,
  embedding vector(1536),           -- adjust dim to your embedder
  ts TIMESTAMPTZ DEFAULT now(),
  scope JSONB DEFAULT '{}',         -- {account:"ACME", classification:"internal"}
  provenance JSONB DEFAULT '{}'     -- {source:"gmail", url:"...", span:[s,e]}
);

-- Simple GIN for metadata filters
CREATE INDEX IF NOT EXISTS idx_rag_snippets_kind ON rag_snippets(kind);
CREATE INDEX IF NOT EXISTS idx_rag_snippets_scope ON rag_snippets USING GIN(scope);

-- Enable postgresql-http extension (safer than plpython in many shops)
CREATE EXTENSION IF NOT EXISTS http;

-- one-time: set embed url
CREATE TABLE IF NOT EXISTS kv_settings (k text primary key, v text);
INSERT INTO kv_settings (k,v) VALUES
  ('EMBED_URL','http://model-runner:8080/embed')
ON CONFLICT (k) DO NOTHING;

CREATE OR REPLACE FUNCTION query_embed(q text)
RETURNS vector
LANGUAGE sql AS $$
  SELECT (to_jsonb(http_post(
            (SELECT v FROM kv_settings WHERE k='EMBED_URL'),
            'application/json',
            json_build_object('input', json_build_array(q))::text
          )->> 'content')::jsonb -> 'data' -> 0 -> 'embedding')::text::vector;
$$;