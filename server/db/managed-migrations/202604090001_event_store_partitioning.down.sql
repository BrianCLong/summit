-- Rollback event store partitioning (leave legacy tables untouched)
DROP VIEW IF EXISTS event_store_partition_overview;
DROP VIEW IF EXISTS event_store_partition_metrics;
DROP FUNCTION IF EXISTS ensure_event_store_partitions_for_all(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS ensure_event_store_partition(TEXT, INTEGER, INTEGER);
DROP TABLE IF EXISTS event_store_partitioned CASCADE;
