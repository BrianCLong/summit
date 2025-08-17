
-- This migration adds indexes to the entity_embeddings table for faster similarity searches.

-- Add an index on the entity_id column for faster embedding lookups.
CREATE INDEX IF NOT EXISTS entity_embeddings_entity_id_idx ON entity_embeddings (entity_id);

-- Add an index on the investigation_id column for faster filtering.
CREATE INDEX IF NOT EXISTS entity_embeddings_investigation_id_idx ON entity_embeddings (investigation_id);
