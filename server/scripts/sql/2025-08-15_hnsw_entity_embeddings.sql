CREATE EXTENSION IF NOT EXISTS vector;
ALTER TABLE entity_embeddings ALTER COLUMN embedding TYPE vector(1536);
CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_cos
  ON entity_embeddings USING hnsw (embedding vector_cosine_ops)
  WITH (m=16, ef_construction=200);