-- Rollback migration: Remove metadata columns added for deduplication

DROP INDEX IF EXISTS entity_embeddings_metadata_gin;

-- Note: We don't drop metadata, text, or investigation_id columns as they may be used by other features
-- Only drop if you're certain they're not needed:
-- ALTER TABLE entity_embeddings DROP COLUMN IF EXISTS metadata;
-- ALTER TABLE entity_embeddings DROP COLUMN IF EXISTS text;
-- ALTER TABLE entity_embeddings DROP COLUMN IF EXISTS investigation_id;

COMMENT ON COLUMN entity_embeddings.metadata IS NULL;
