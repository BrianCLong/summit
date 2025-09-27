-- Promote runtime ensures to SQL migrations for OSINT documents
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS osint_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hash TEXT NOT NULL UNIQUE,
  title TEXT,
  summary TEXT,
  url TEXT,
  language TEXT,
  published_at TIMESTAMPTZ,
  license JSONB NOT NULL DEFAULT '{}'::jsonb,
  policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  provenance JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS osint_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_hash TEXT NOT NULL REFERENCES osint_documents(hash) ON DELETE CASCADE,
  entity_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  name TEXT,
  UNIQUE (doc_hash, entity_id)
);

CREATE TABLE IF NOT EXISTS osint_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_hash TEXT NOT NULL REFERENCES osint_documents(hash) ON DELETE CASCADE,
  text TEXT NOT NULL,
  confidence NUMERIC CHECK (confidence >= 0 AND confidence <= 1)
);

CREATE INDEX IF NOT EXISTS idx_osint_documents_published ON osint_documents(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_osint_documents_fts ON osint_documents USING gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(summary,'')));

