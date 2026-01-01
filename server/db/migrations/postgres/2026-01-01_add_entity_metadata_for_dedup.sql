-- Migration: Add metadata columns to entity_embeddings for improved deduplication
-- This supports topology similarity (neighbor overlap) and provenance similarity

-- Add metadata JSONB column if it doesn't exist (stores neighbor_ids, source_system, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_embeddings'
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE entity_embeddings
        ADD COLUMN metadata JSONB DEFAULT '{}';
    END IF;
END $$;

-- Add text column if it doesn't exist (some schemas use 'text', others 'text_content')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_embeddings'
        AND column_name = 'text'
    ) THEN
        -- Check if text_content exists and alias it
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'entity_embeddings'
            AND column_name = 'text_content'
        ) THEN
            -- Create a view or just rename
            ALTER TABLE entity_embeddings
            RENAME COLUMN text_content TO text;
        ELSE
            ALTER TABLE entity_embeddings
            ADD COLUMN text TEXT;
        END IF;
    END IF;
END $$;

-- Add investigation_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'entity_embeddings'
        AND column_name = 'investigation_id'
    ) THEN
        ALTER TABLE entity_embeddings
        ADD COLUMN investigation_id VARCHAR(255);
    END IF;
END $$;

-- Create GIN index on metadata JSONB for fast lookups
CREATE INDEX IF NOT EXISTS entity_embeddings_metadata_gin
ON entity_embeddings USING gin (metadata);

-- Create index on investigation_id for filtering
CREATE INDEX IF NOT EXISTS entity_embeddings_investigation_id_idx
ON entity_embeddings (investigation_id);

-- Ensure HNSW index exists for vector similarity
CREATE INDEX IF NOT EXISTS entity_embeddings_hnsw_idx
ON entity_embeddings USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Comments for documentation
COMMENT ON COLUMN entity_embeddings.metadata IS 'JSONB field storing neighbor_ids (array of strings), source_system (string), and other entity metadata for deduplication';
COMMENT ON INDEX entity_embeddings_metadata_gin IS 'GIN index for fast JSONB queries on metadata';
COMMENT ON INDEX entity_embeddings_hnsw_idx IS 'HNSW index for fast approximate nearest neighbor search using cosine distance';
