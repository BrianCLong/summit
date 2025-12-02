-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add embedding column to cases table if it exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cases') THEN
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS embedding vector(3072);

        -- Create HNSW index for fast similarity search
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE schemaname = 'public'
            AND tablename = 'cases'
            AND indexname = 'cases_embedding_idx'
        ) THEN
            CREATE INDEX cases_embedding_idx ON cases USING hnsw (embedding vector_cosine_ops);
        END IF;
    END IF;
END $$;
