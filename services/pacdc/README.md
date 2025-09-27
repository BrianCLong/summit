# PACDC

Policy-Aware Change Data Capture (PACDC) replicates PostgreSQL tables to data lake/warehouse targets (S3, BigQuery) with policy enforcement. The replicator enforces column-, row-, and jurisdiction-based filters during replication and produces manifest proofs for auditing.

## Features

- Snapshot + logical replication (WAL) ingestion pipelines.
- Schema-aware stream configuration with tagging metadata.
- Policy engine supports per-stream allow/deny/redact column actions and row filters.
- Replication-proof manifest containing event counts, per-stream hashes, and a policy hash.
- Backfill and cutover tooling for staged migrations.

See `cmd/pacdc` for CLI tooling and `pkg/` packages for library usage.
