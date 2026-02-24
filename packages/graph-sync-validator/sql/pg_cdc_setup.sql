-- PostgreSQL CDC + checksum setup for audit-grade graph sync.
-- 1) Create logical replication slot for downstream consumers.
SELECT * FROM pg_create_logical_replication_slot('neo4j_sync', 'pgoutput')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_replication_slots
  WHERE slot_name = 'neo4j_sync'
);

-- 2) Canonical checksum views (stable key ordering via jsonb).
CREATE OR REPLACE VIEW public.customer_cdc_view AS
SELECT
  c.customer_id,
  c.name,
  c.tier,
  txid_current()::text AS txid,
  pg_current_wal_lsn()::text AS lsn,
  now() AS commit_ts,
  md5(
    jsonb_build_object(
      'customer_id', c.customer_id,
      'name', c.name,
      'tier', c.tier
    )::text
  ) AS checksum
FROM public.customer c;

CREATE OR REPLACE VIEW public.order_cdc_view AS
SELECT
  o.order_id,
  o.customer_id,
  o.amount,
  txid_current()::text AS txid,
  pg_current_wal_lsn()::text AS lsn,
  now() AS commit_ts,
  md5(
    jsonb_build_object(
      'order_id', o.order_id,
      'customer_id', o.customer_id,
      'amount', o.amount
    )::text
  ) AS checksum
FROM public."order" o;

-- 3) Slot lag telemetry query (wire this into alerting).
-- SELECT
--   slot_name,
--   pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal,
--   active
-- FROM pg_replication_slots
-- WHERE slot_name = 'neo4j_sync';
