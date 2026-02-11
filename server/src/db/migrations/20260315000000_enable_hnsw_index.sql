-- Migration: Enable HNSW Vector Index
-- Description: Explicitly create HNSW index for embedding_records for deterministic performance and GA stability.
-- Date: 2026-03-15

CREATE INDEX IF NOT EXISTS idx_embedding_records_vector_hnsw
ON embedding_records USING hnsw (vector vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
