DROP FUNCTION IF EXISTS ensure_outbox_partition(INTEGER, INTEGER);
DROP TABLE IF EXISTS outbox_events;
ALTER TABLE outbox_events_legacy RENAME TO outbox_events;
