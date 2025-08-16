-- PostgreSQL pgvector HNSW index migration for entity embeddings
-- Sprint 3: Similarity Search implementation

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create entity_embeddings table if not exists
CREATE TABLE IF NOT EXISTS entity_embeddings (
    id SERIAL PRIMARY KEY,
    entity_id VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) NOT NULL,
    investigation_id VARCHAR(255) NOT NULL,
    embedding vector(1536), -- OpenAI text-embedding-3-small dimension
    text_content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Convert existing embedding column to vector type if needed
ALTER TABLE entity_embeddings 
ALTER COLUMN embedding TYPE vector(1536) USING embedding::vector(1536);

-- Create HNSW index for cosine similarity
CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_cos 
ON entity_embeddings 
USING hnsw (embedding vector_cosine_ops) 
WITH (m=16, ef_construction=200);

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity_id 
ON entity_embeddings (entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_embeddings_tenant_investigation 
ON entity_embeddings (tenant_id, investigation_id);

CREATE INDEX IF NOT EXISTS idx_entity_embeddings_created_at 
ON entity_embeddings (created_at DESC);

-- Add constraints
ALTER TABLE entity_embeddings 
ADD CONSTRAINT IF NOT EXISTS unique_entity_tenant 
UNIQUE (entity_id, tenant_id);

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_entity_embeddings_updated_at ON entity_embeddings;
CREATE TRIGGER update_entity_embeddings_updated_at 
    BEFORE UPDATE ON entity_embeddings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON entity_embeddings TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE entity_embeddings_id_seq TO your_app_user;