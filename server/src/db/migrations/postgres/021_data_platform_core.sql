-- Migration: Data Platform Core Models
-- Description: Canonical models for Documents, Chunks, Collections, and Indices
-- Author: Jules
-- Date: 2025-10-27

-- Enable pgvector if not already enabled (should be in 001 but good to ensure)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- Collections
-- ============================================================================
CREATE TABLE IF NOT EXISTS doc_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    default_index_id UUID, -- Circular dependency handled by adding FK later if needed, or just loose coupling
    sensitivity VARCHAR(50) DEFAULT 'internal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_collection_name_per_tenant UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_doc_collections_tenant ON doc_collections(tenant_id);

-- ============================================================================
-- Indices
-- ============================================================================
CREATE TABLE IF NOT EXISTS doc_indices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    collection_id UUID REFERENCES doc_collections(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    kind VARCHAR(50) NOT NULL, -- 'vector', 'keyword', 'hybrid'
    config JSONB DEFAULT '{}', -- model, dims, provider
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_indices_collection ON doc_indices(collection_id);
CREATE INDEX IF NOT EXISTS idx_doc_indices_tenant ON doc_indices(tenant_id);

-- ============================================================================
-- Documents
-- ============================================================================
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(255) NOT NULL,
    collection_id UUID NOT NULL REFERENCES doc_collections(id) ON DELETE CASCADE,
    title TEXT,
    source_uri TEXT,
    mime_type VARCHAR(255),
    size_bytes BIGINT,
    hash VARCHAR(255),
    sensitivity VARCHAR(50) DEFAULT 'internal',
    metadata JSONB DEFAULT '{}',
    processing_status VARCHAR(50) DEFAULT 'pending', -- pending, processing, completed, failed
    processing_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection_id);
CREATE INDEX IF NOT EXISTS idx_documents_tenant ON documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash_source ON documents(hash, source_uri);

-- ============================================================================
-- Chunks
-- ============================================================================
CREATE TABLE IF NOT EXISTS doc_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) NOT NULL,
    collection_id UUID NOT NULL REFERENCES doc_collections(id) ON DELETE CASCADE,
    index_id UUID REFERENCES doc_indices(id) ON DELETE SET NULL,
    position INTEGER NOT NULL,
    text TEXT NOT NULL,
    embedding VECTOR(3072), -- Defaulting to 3072 (text-embedding-3-large), nullable if only keyword
    sensitivity VARCHAR(50) DEFAULT 'internal',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_doc_chunks_document ON doc_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_collection ON doc_chunks(collection_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_tenant ON doc_chunks(tenant_id);

-- Vector index for chunks (HNSW)
-- Note: 3072 dimensions is large for HNSW, might require tuning or 'vector_cosine_ops'
CREATE INDEX IF NOT EXISTS idx_doc_chunks_embedding
ON doc_chunks USING hnsw (embedding vector_cosine_ops);

-- Full text search index
CREATE INDEX IF NOT EXISTS idx_doc_chunks_fts
ON doc_chunks USING gin(to_tsvector('english', text));

-- ============================================================================
-- Update Triggers
-- ============================================================================
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_doc_collections_modtime BEFORE UPDATE ON doc_collections FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_doc_indices_modtime BEFORE UPDATE ON doc_indices FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_documents_modtime BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER update_doc_chunks_modtime BEFORE UPDATE ON doc_chunks FOR EACH ROW EXECUTE FUNCTION update_timestamp();
