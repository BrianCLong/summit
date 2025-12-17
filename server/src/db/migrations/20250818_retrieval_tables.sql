-- Migration: Retrieval System Tables
-- Description: Create tables for knowledge objects and embeddings (pgvector)
-- Date: 2025-08-18

-- Ensure pgvector extension is available
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Knowledge Objects Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS knowledge_objects (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  title TEXT,
  body TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  source_pipeline_key VARCHAR(255),
  source_id VARCHAR(255),
  original_uri TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP,
  effective_at TIMESTAMP,

  -- Ensure unique source per tenant if source_id is provided
  CONSTRAINT uniq_source_per_tenant UNIQUE (tenant_id, source_id, kind) DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_knowledge_objects_tenant
  ON knowledge_objects(tenant_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_objects_kind
  ON knowledge_objects(kind);

CREATE INDEX IF NOT EXISTS idx_knowledge_objects_created
  ON knowledge_objects(created_at DESC);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_knowledge_objects_fts
  ON knowledge_objects USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, '')));


-- ============================================================================
-- Embedding Records Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS embedding_records (
  id VARCHAR(255) PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  object_id VARCHAR(255) NOT NULL,
  kind VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  model VARCHAR(100) NOT NULL,
  dim INTEGER NOT NULL,
  vector VECTOR, -- Allow varying dimensions to support model switching
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  version VARCHAR(50),

  CONSTRAINT fk_embedding_object
    FOREIGN KEY (object_id)
    REFERENCES knowledge_objects(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_embedding_records_tenant
  ON embedding_records(tenant_id);

CREATE INDEX IF NOT EXISTS idx_embedding_records_object
  ON embedding_records(object_id);

-- IVFFlat index for vector similarity search (optional, requires data to be effective)
-- We use a conditional creation here or just leave it for later when data scale justifies it.
-- For MVP, HNSW or IVFFlat on pgvector is good practice but creating it empty is fine.
-- CREATE INDEX ON embedding_records USING hnsw (vector vector_cosine_ops);
