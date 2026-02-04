Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# Epic 5 — Performance + Cost “Hot Path” Strike Team (speed and margin together)

1.  Identify top 10 expensive/slow Tier-0 operations by volume × cost × latency.
2.  Add p95/p99 latency and unit-cost budgets for each hot path.
3.  Optimize DB queries (indexes, query plans, N+1 elimination) with proofs.
4.  Introduce caching where safe (with explicit invalidation rules).
5.  Reduce payload sizes (field selection, pagination, compression) and enforce limits.
6.  Move heavy work async (batching, jobs, streaming) with UX status.
7.  Tune worker concurrency and queue settings to increase throughput per $.
8.  Add cost regression checks for hot endpoints in CI (sampling ok).
9.  Track infra spend deltas per release and auto-open regressions.
10. Publish monthly “hot path wins” and unit-cost movement.
11. Delete expensive features that don’t move retention or revenue.
