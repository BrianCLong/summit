# Summit Data Lineage Snapshot

This report captures an example ingestion batch flowing from the HTTP ingest endpoint through PostgreSQL aggregation and Neo4j graph storage. The lineage metadata is emitted by the new Python lineage service and persisted in the `openlineage_events` table for GraphQL consumption.

## Run Summary

- **Run ID:** `9c2c63a2-2fb5-4c44-85a9-15cbb9e8bf80`
- **Job:** `http_ingest_batch`
- **Tenant:** `default`
- **Signals Processed:** `128`
- **Started:** `2026-03-04T19:22:11.043Z`
- **Completed:** `2026-03-04T19:22:12.198Z`
- **Status:** `COMPLETED`

## Dataset Lineage

| Direction  | Source Dataset              | Target Dataset                        | Transformation                  | Target System | Event Time (UTC)         |
|------------|-----------------------------|---------------------------------------|---------------------------------|---------------|--------------------------|
| Upstream   | `default.ingest.signals`    | `default.postgres.coherence_scores`   | `aggregate_coherence_score`     | PostgreSQL    | `2026-03-04T19:22:11.511Z` |
| Downstream | `default.ingest.signals`    | `default.neo4j.signals`               | `materialize_signal_nodes`      | Neo4j         | `2026-03-04T19:22:11.879Z` |

Each lineage edge records the batch size, deduplication status, and storage target so downstream consumers can validate provenance end-to-end.

## Operational Notes

1. The ingestion worker now opens a lineage run for every batch, tagging the run with tenant, batch size, and source system metadata.
2. PostgreSQL and Neo4j writes emit `LOAD` events, enabling the GraphQL API and dashboard to render upstream/downstream views.
3. The Python lineage service persists events and exposes an HTTP API suitable for backfills, audit exports, or integration with OpenLineage ecosystems.

Refer to the new **Data Lineage** panel on the Summit dashboard to monitor live runs and lineage edges in real time.
