# Release Notes Template (v0.1)

**Release:** vX.Y.Z — IntelGraph Quickstart Slice
**Date:** YYYY-MM-DD

## Highlights

- CSV→Graph ingest (S3/Local) with provenance
- GraphQL: `personById`, `searchPersons`, `neighbors`
- OPA ABAC seed; tenant scoped queries
- Observability hooks; k6 SLO verification

## SLO & Cost

- API p95: \_\_\_ ms (target ≤ 350)
- Write p95: \_\_\_ ms (target ≤ 700)
- Cypher 1-hop p95: \_\_\_ ms (target ≤ 300)
- Budget burn: within dev/stg/prod caps

## Migrations

- Postgres: `0001_ingest_manifest.sql` applied
- Neo4j: constraints created (id+tenant composite keys)

## Security & Privacy

- mTLS (local placeholder)
- OIDC issuer: \_\_\_ (TBD)
- Field-level encryption planned for email (demo only in local)

## Backout Plan

- Helm rollback; feature flags off; revert DB migration (safe)
