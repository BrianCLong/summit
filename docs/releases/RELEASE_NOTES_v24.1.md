**Release:** v24.1 — Hardening & Operations
**Date:** [Awaiting Input: Date of release]

## Highlights

- Ingest reliability & idempotency hooks
- Redis caching + RPS limiter
- Residency guard + fine‑grained scopes
- Subscription latency metric; trace sampling

## SLO Validation

- Read p95: [Awaiting Input: p95 read latency]
- Write p95: [Awaiting Input: p95 write latency]
- Error‑rate: [Awaiting Input: Error rate]
- Sub p95: [Awaiting Input: p95 subscription latency]
- Ingest p95: [Awaiting Input: p95 ingest latency]

## Ops Notes

- Feature flags unchanged; same rollback path as v24.0.0

## Upgrade Notes

- **Pre-checks:** Announce a 15-minute maintenance window and confirm Redis cache nodes are healthy.
- **Service impact:** Designed for zero downtime; run steps during low-traffic window to minimize cache churn.
- **Configuration changes:** Ensure rate limiter defaults are set (`RPS_LIMIT`/`RPS_BURST`); enable residency guard via `TENANT_RESIDENCY_MODE=strict` before rollout.
- **Upgrade steps:**
  1. `make bootstrap` (workspace deps) and `pnpm run db:migrate` to apply ingestion idempotency metadata tables.
  2. Restart stateless services to pick up caching and tracing defaults; drain queues before restarting ingestion workers.
  3. Validate subscription latency metric exports to observability backend.
- **Rollback:** Revert to v24.0.0 images and clear Redis feature toggles; disable ingestion workers until queues drain, then restore previous cache snapshots if needed.

## Migration Notes

- **Database/data migrations:** The ingestion idempotency hooks add metadata tables; after migration, backfill historical ingest batches with `pnpm --filter intelgraph-server run backfill:idempotency-state` and verify counts against source manifests.
- **API/contract changes:** No breaking API changes; the residency guard enforces stricter scopes—clients must include tenant region claims.
- **Client/SDK actions:** Update SDK config to pass residency scopes and tune cache TTLs where applicable; older clients remain compatible but lose residency enforcement.
- **Operational checks:** Monitor ingest retry dead-letter queues and Redis hit ratios; alert if hit ratio drops below 75% or DLQ growth exceeds 1% of traffic.

## Post-Upgrade Validation

- **SLOs to verify:** Confirm ingest p95 and subscription p95 meet targets listed above for at least 30 minutes post-upgrade.
- **Smoke tests:** Run `make smoke` and targeted ingestion replay for two representative tenants.
- **Owner approvals:** Release Captain + oncall SRE sign off in the release ticket with links to dashboards and logs.
