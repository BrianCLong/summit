# Summit Sync Acceptance Criteria (MVP)
- Logical decoding enabled on Postgres (`wal_level=logical`) and plugin `wal2json` available.
- Ingestion applies idempotent, provenance-carrying upserts to Neo4j.
- OpenLineage events emitted for: `ingestion_start`, `batch_applied`, `reconcile_start`, `reconcile_complete`.
- Reconciliation yields `mismatch_rate < 0.01%` over test dataset; automated repair executes where safe.
- Metrics exposed: `summit_mismatch_total`, `summit_reconcile_latency_ms`, `summit_openlineage_success_total`.
- Canary: enable for one schema (`public`) only; run for 24h; expand if thresholds met.
