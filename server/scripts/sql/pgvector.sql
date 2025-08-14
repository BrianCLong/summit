-- Enable required extensions (requires superuser or appropriate privileges)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Embeddings table for entities
CREATE TABLE IF NOT EXISTS entity_embeddings (
  entity_id TEXT PRIMARY KEY,
  embedding vector(384), -- adjust dimension to match your model
  model TEXT DEFAULT 'text-embedding-3-small',
  updated_at TIMESTAMP DEFAULT NOW()
);

-- HNSW index for fast ANN search (requires pgvector >= 0.5.0)
CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw ON entity_embeddings USING hnsw (embedding vector_l2_ops);

