-- NO_TRANSACTION
-- Ensure tenant metadata is available for per-tenant hot embedding queries
ALTER TABLE IF EXISTS entity_embeddings
ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255);

-- Index to accelerate recency-filtered scans by tenant
CREATE INDEX  IF NOT EXISTS idx_entity_embeddings_tenant_updated
ON entity_embeddings (tenant_id, updated_at DESC);

-- Materialized view capturing the most recent embeddings per tenant for fast lookups
CREATE MATERIALIZED VIEW IF NOT EXISTS tenant_hot_entity_embeddings AS
SELECT tenant_key AS tenant_id, entity_id, embedding, updated_at
FROM (
  SELECT
    COALESCE(tenant_id, 'unknown') AS tenant_key,
    entity_id,
    embedding,
    updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(tenant_id, 'unknown')
      ORDER BY updated_at DESC
    ) AS rn
  FROM entity_embeddings
  WHERE updated_at >= NOW() - INTERVAL '7 days'
) scoped
WHERE rn <= 500;

-- Unique index required for concurrent refreshes
CREATE UNIQUE INDEX  IF NOT EXISTS idx_tenant_hot_entity_embeddings_pk
ON tenant_hot_entity_embeddings (tenant_id, entity_id);

-- Vector index to keep nearest-neighbor queries fast within the hot window
CREATE INDEX  IF NOT EXISTS tenant_hot_entity_embeddings_hnsw
ON tenant_hot_entity_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 200);

-- Convenience function for background refreshes
CREATE OR REPLACE FUNCTION refresh_tenant_hot_entity_embeddings()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW  tenant_hot_entity_embeddings;
END;
$$;