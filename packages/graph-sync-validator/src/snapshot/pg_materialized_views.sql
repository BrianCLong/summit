-- Canonical node view
CREATE MATERIALIZED VIEW IF NOT EXISTS canon_nodes AS
SELECT
  n.id::text AS id,
  n.type::text AS type,
  to_jsonb(n.payload) - 'volatile_fields' AS payload,
  n.updated_at AS updated_at
FROM public.nodes n
WITH NO DATA;

-- Canonical edge view
CREATE MATERIALIZED VIEW IF NOT EXISTS canon_edges AS
SELECT
  e.src_id::text AS src,
  e.rel::text    AS rel,
  e.dst_id::text AS dst,
  to_jsonb(e.payload) - 'volatile_fields' AS payload,
  e.updated_at AS updated_at
FROM public.edges e
WITH NO DATA;

-- Deterministic refresh helpers
CREATE OR REPLACE FUNCTION refresh_canon_views() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY canon_nodes;
  REFRESH MATERIALIZED VIEW CONCURRENTLY canon_edges;
END $$;

-- Ledger table for drift timing + backfill/rollback
CREATE TABLE IF NOT EXISTS sync_ledger (
  id bigserial PRIMARY KEY,
  entity_id text NOT NULL,
  entity_type text NOT NULL,
  op text NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  tx_ts timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION ledger_nodes() RETURNS trigger AS $$
BEGIN
  INSERT INTO sync_ledger(entity_id, entity_type, op, tx_ts)
  VALUES (NEW.id::text, 'node', TG_OP, now());
  RETURN NEW;
END $$ LANGUAGE plpgsql;

-- Trigger setup (conditional to avoid errors if already exists, or just DROP/CREATE)
DROP TRIGGER IF EXISTS nodes_cdc ON public.nodes;
CREATE TRIGGER nodes_cdc
AFTER INSERT OR UPDATE OR DELETE ON public.nodes
FOR EACH ROW EXECUTE FUNCTION ledger_nodes();
