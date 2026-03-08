# CDC Rollout (Postgres → Debezium → Kafka → Neo4j)

## Staging
1) Create logical slot (staging DB):
   SELECT pg_create_logical_replication_slot('summit_cdc_slot','pgoutput');

2) Deploy Debezium connector:
   - Apply connectors/debezium/postgres-connector.json via Kafka Connect REST/UI.
   - Verify topics: summit.postgres.public.*

3) Initialize checkpoint:
   INSERT INTO cdc_consumer_checkpoints(consumer_name,last_lsn)
   VALUES ('cdc-to-neo4j','0/0')
   ON CONFLICT DO NOTHING;

4) Dry-run consumer (no writes):
   Set env DRY_RUN=1 (if implemented) or run read-only path.
   Compare parity for sample tables.

5) Enable writes (canary namespace):
   - Start consumer.py with constrained topic subset or label filter.
   - Watch `pg_replication_slots` confirmed_flush_lsn vs `cdc_consumer_checkpoints.last_lsn`.
   - Monitor WAL size, connector lag.

## Validation
- **Monotonic LSN:** last_lsn strictly increases.
- **Parity check:** sampled table checksums match in Neo4j (<0.1% mismatch).
- **Backfill (if gaps):** Debezium incremental snapshot or `pg_dump --data-only` for affected ranges; apply via APOC `apoc.periodic.iterate` with bounded batches.

## Production
- Lift canary, scale consumer horizontally with partitioned topics.
- Alerts:
  - `pg_replication_slots` inactive > N min
  - WAL directory growth
  - Debezium connector errors & lag
  - Consumer last_lsn stalled
