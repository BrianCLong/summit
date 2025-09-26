# Workstream 47 – Database Index Optimization Report

## Summary
- Added targeted Postgres indexes to accelerate residency compliance analytics queries.
- Introduced Neo4j constraints and composite indexes that support tenant scoped history lookups.
- Verified improvements via `EXPLAIN ANALYZE`, `PROFILE`, and a focused K6 workload.

## PostgreSQL Findings
### Encryption audit aggregation
- **Before:** Bitmap heap scan over 20k rows, ~72 ms runtime.【71d950†L1-L20】
- **After:** Index-only scan using `(tenant_id, classification_level)` include index, ~7.8 ms runtime with 0 heap fetches.【f8b7a4†L1-L18】

### Non-compliant event counting
- **Before:** Filter executed after bitmap heap scan, ~29 ms runtime.【a73442†L1-L20】
- **After:** Partial index `tenant_id` + `WHERE NOT compliant` enables index-only scan (~0.88 ms).【3d2464†L1-L16】

### Encryption method coverage
- **Before:** All rows visited to filter `encryption_method != 'none'`, ~28 ms runtime.【f283ac†L1-L14】
- **After:** Partial index on `tenant_id` excluding `none` reduces runtime to ~3.3 ms with index-only scan.【b9ca34†L1-L16】

## Neo4j Findings
### Compensation log drill-down
- **Before:** `NodeByLabelScan` drove >100k DB hits with `Time: 345` ms.【dfdf52†L1-L36】
- **After:** Unique constraint enables `NodeUniqueIndexSeek`, dropping hits to 25 and lowering runtime to ~112 ms.【a5ba08†L1-L35】

### Tenant history aggregate
- **Before:** Label scan touched ~105k records despite narrow filters.【ef08c4†L1-L11】
- **After:** Index hint (supported by new composite index) switches to `NodeIndexSeek` with ~2.5k hits.【7b571e†L1-L28】
- **Follow-up:** Reordered the history resolver so the `OPTIONAL MATCH` executes after limiting the candidate logs, preventing large fan-out traversals before pagination.【F:server/src/db/compensationLog.ts†L421-L428】

## Load Validation
- K6 workload (5 VUs, 5s) sustained ~40 req/s with 95th percentile 37 ms against the optimized Neo4j profile query.【f116c2†L1-L44】

## Operational Updates
- New migrations (`server/db/migrations/postgres/2025-09-26_encryption_audit_indexes.sql`, `server/src/db/migrations/neo4j/20250926_120000_compensation_indexes.js`) codify index changes.
- `docker-compose.db.yml` now provisions Postgres and Neo4j for local verification.
- `tools/k6/neo4j-compensation.js` provides repeatable load checks.
