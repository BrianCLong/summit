CREATE TABLE IF NOT EXISTS entity_embeddings (
    id UUID PRIMARY KEY,
    entity_id UUID NOT NULL UNIQUE,
    embedding VECTOR(1536) NOT NULL, -- Assuming 1536-dimensional embeddings (e.g., OpenAI Ada-002)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entity_embeddings_entity_id ON entity_embeddings (entity_id);