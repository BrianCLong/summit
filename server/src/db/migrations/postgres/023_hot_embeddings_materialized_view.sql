-- NO_TRANSACTION
-- Strengthen per-tenant hot embedding materialization for pgvector

-- Ensure tenant scoping columns exist for hot-path queries
ALTER TABLE IF EXISTS entity_embeddings
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

ALTER TABLE IF EXISTS entity_embeddings
ADD COLUMN IF NOT EXISTS investigation_id VARCHAR(255);

-- Indexes to keep recency scans online-safe
CREATE INDEX  IF NOT EXISTS idx_entity_embeddings_tenant_updated_at
ON entity_embeddings (tenant_id, updated_at DESC);

CREATE INDEX  IF NOT EXISTS idx_entity_embeddings_tenant_investigation
ON entity_embeddings (tenant_id, investigation_id);

-- Rebuild the materialized view to cap hot embeddings per tenant using a configurable window
DROP MATERIALIZED VIEW IF EXISTS tenant_hot_entity_embeddings CASCADE;

CREATE MATERIALIZED VIEW tenant_hot_entity_embeddings AS
WITH params AS (
  SELECT
    COALESCE(current_setting('ig.hot_embeddings.window', true), '3 days')::interval AS window,
    COALESCE(current_setting('ig.hot_embeddings.per_tenant', true), '500')::integer AS per_tenant
),
ranked AS (
  SELECT
    COALESCE(ee.tenant_id, 'unknown') AS tenant_id,
    ee.entity_id,
    ee.investigation_id,
    ee.embedding,
    ee.updated_at,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(ee.tenant_id, 'unknown')
      ORDER BY ee.updated_at DESC
    ) AS rn
  FROM entity_embeddings ee
  CROSS JOIN params p
  WHERE ee.updated_at >= NOW() - p.window
)
SELECT tenant_id, entity_id, investigation_id, embedding, updated_at
FROM ranked r
CROSS JOIN params p
WHERE r.rn <= p.per_tenant;

-- Unique and vector indexes to keep refreshes concurrent and searches fast
CREATE UNIQUE INDEX  IF NOT EXISTS idx_tenant_hot_entity_embeddings_pk
ON tenant_hot_entity_embeddings (tenant_id, entity_id);

CREATE INDEX  IF NOT EXISTS tenant_hot_entity_embeddings_hnsw
ON tenant_hot_entity_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 32, ef_construction = 200);

-- Parameterized refresh entrypoint for background jobs
CREATE OR REPLACE FUNCTION refresh_tenant_hot_entity_embeddings(
  window_override interval DEFAULT '3 days',
  per_tenant integer DEFAULT 500
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM set_config('ig.hot_embeddings.window', window_override::text, true);
  PERFORM set_config('ig.hot_embeddings.per_tenant', per_tenant::text, true);
  REFRESH MATERIALIZED VIEW  tenant_hot_entity_embeddings;
END;
$$;

-- Populate the view with the defaults
SELECT refresh_tenant_hot_entity_embeddings();