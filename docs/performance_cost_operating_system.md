# Performance & Cost Operating System

This blueprint operationalizes the latency, efficiency, and spend-control epics into a coherent delivery program with architecture, guardrails, and validation steps suitable for production deployment.

## High-Level Summary & Deep Implications

- **Primary objective:** drive p95 latency to SLO targets while reducing infra/telemetry/vendor spend through explicit ownership, observability, and automated enforcement.
- **7th-order implications:**
  1. RUM + tracing data must be privacy-safe; sampling/PII scrubbing enforced to avoid telemetry bloat and compliance risk.
  2. Release cadence (“Speed Release”) demands automated regression gates and rollback playbooks.
  3. Cost/latency controls require taxonomy: service/env/tenant/feature tags flowing through infra, telemetry, and billing exports.
  4. Reliability cannot regress: caching, response shaping, and async offloads need invariants and health signals to avoid stale/partial responses.
  5. Developer velocity depends on CI perf budgets and query regression tests; guardrails must be lightweight and cached to keep PR cycle times low.
  6. Multi-tenant fairness (quotas, concurrency caps, cache keys) is mandatory to prevent noisy-neighbor cost or latency spikes.
  7. Governance: tie dashboards, budgets, and alerts to accountable owners; every automated ticket includes owner, suspect deploy, and rollback path.

## Architecture Overview

- **Telemetry Spine:** OpenTelemetry traces from browser → edge/CDN → gateway → services → DB/cache with W3C trace propagation; RUM beacon adds TTFB, FCP, INP, CLS per journey.
- **Cost Attribution Plane:** Enforced tags (service, env, tenant, feature, domain) injected via deploy pipelines; exported to billing (cloud), APM, and warehouse tables for showback/chargeback.
- **Performance Budget Gate:** CI job that loads budgets (p95 per step, bundle KB, query plan cost) and blocks on regressions; emits annotations to PRs.
- **Query Health Loop:** Slow-query log -> ingestion job -> leaderboard -> JIT fixes (indexes, batching, N+1 elimination) -> regression tests locked to fixtures.
- **Caching & Edge Layer:** CDN with ETags and SWR; application cache with per-tenant keys, TTL + jitter, stampede protection; upstream API cache with allowlist + backoff.
- **Async & Work Management:** Heavy work offloaded to job runners with progress topics, idempotency keys, DLQs, and kill switches; fairness scheduler per tenant.
- **Release Markers:** Deployment pipeline annotates traces/metrics/dashboards with version + owner; blame tooling correlates regressions to change events.

## Critical Journeys, Targets, and Instrumentation

1. **Case search & load** – p95 targets: search API ≤600ms, graph fetch ≤450ms, page TTFB ≤300ms, FCP ≤1.5s, INP ≤200ms.
2. **Entity creation & link** – p95: form submit API ≤500ms, relationship write ≤350ms, UI acknowledgment ≤250ms.
3. **Investigation timeline playback** – p95: timeline query ≤700ms, media fetch ≤800ms, visible paint ≤1.8s.
4. **Export/report generation** – p95: request ack ≤200ms, job enqueue ≤100ms, job completion p95 ≤90s, download start ≤400ms post-ready.
5. **Copilot suggestion delivery** – p95: prompt pipeline ≤1.2s, model call ≤800ms, render ≤400ms.

**Instrumentation:**

- Inject `journey` + `step` attributes into RUM and traces; add synthetic journeys nightly.
- For each step: emit `p95`, `error_rate`, `sample_rate`, `cache_hit`, `payload_bytes`, and `tenant` tag where allowed.

## Top-Offender Board (Dashboards)

- **Slow endpoints:** sorted by p95 & error-rate × volume; links to exemplar traces and last deploy marker.
- **Slow queries:** leaderboard using `duration × frequency × rows/blocks`; includes index recommendation status and query plan snapshot.
- **Slow pages/bundles:** RUM metrics (INP, FCP, CLS) + bundle KB deltas; highlights modules with highest cost/byte.

## Database & Query Hardening

- **N+1 prevention:** enforce dataloader/federated loader checks; add lint to reject unbatched GraphQL resolvers on hot paths.
- **Indexing:** weekly job to compare slow-query fingerprints vs existing indexes; auto-propose partial/covering indexes with safety checks (bloat thresholds, write amp).
- **Transaction hygiene:** cap transaction scope; add timeout + lock wait alerts; prefer retryable, idempotent mutations.
- **Regression tests:** capture query plans for critical endpoints; CI rejects plan-cost deltas beyond threshold.

## Response Shaping & Payload Discipline

- **Field selection:** persisted queries and projection lists for GraphQL/REST; forbid wildcard selects in hot paths.
- **Pagination:** cursor-based for feeds; enforce page-size limits by tenant tier.
- **Compression:** gzip/br when payload >1KB; brotli at edge; minification/tree-shaking on bundles.
- **Schema contracts:** response envelopes include `version`, `checksum`, and `partial` flag when async streaming.

## Caching & Invalidation Strategy

- **App cache:** per-tenant keys; TTL + jitter; negative caching with short TTL; stampede protection via request coalescing.
- **Edge/CDN:** ETags, `Cache-Control: public, max-age`, SWR for semi-static content; prewarm for predictable spikes.
- **External APIs:** allowlist cache with TTL + circuit breaker; cache bust on upstream version change.
- **Invalidation:** hooks on writes emitting cache-bust events; side-channel to purge CDN and app caches atomically.

## Async Offloading & Job Efficiency

- **Work classification:** CPU-heavy vs IO-heavy; assign to right pool with autoscaling; enforce concurrency caps per tenant.
- **Idempotency/dedupe:** idempotency keys + content hashes; dedupe window per job type.
- **Progress UI:** job status stored in read model; clients poll via ETag or subscribe to progress channel.
- **Kill switches:** admin toggles + automated circuit trips on cost/latency anomalies.

## Telemetry Cost Controls

- **Budgets:** per-team telemetry budget (logs/metrics/traces); alerts at 50/80/100% with owners.
- **Cardinality:** block new high-cardinality labels; require review token for exceptions.
- **Sampling:** adaptive trace sampling; full-fidelity only on critical journeys; audit logs isolated with minimal fields.
- **Retention tiers:** prod vs non-prod retention; auto-expiry and monthly purge of unused dashboards/alerts.

## Vendor & Tooling Guardrails

- **Inventory:** single catalog with cost, owner, renewal, overlap; mandatory SSO and seat reclamation.
- **Procurement gate:** security/legal/cost/exit checks for new tools; exit plan stored with owner.
- **Contract leverage:** usage evidence powering renegotiation; track projected vs realized savings.

## FinOps & Governance Operating Rhythm

- **Weekly FinOps review:** actions, owners, outcomes; integrate cost to incident templates.
- **Budgets tied to OKRs:** auto-alert and ticket creation; showback/chargeback per tenant for enterprise deals.
- **Release markers:** every deploy emits marker to traces/metrics and board; blame view correlates regressions to commit SHAs.
- **Monthly Speed Release:** ship 3+ perf/cost fixes; regression-free requirement with rollback rehearsed.

## CI/CD Enforcement

- Perf budgets loaded from repo config; CI fails on p95/bundle/query plan regressions.
- Query regression tests and telemetry budget checks run in PRs; annotations posted to PR with owner + remediation link.
- Bundler config enforces tree-shaking, code splitting, and dead-dep detection; bundle-size budgets enforced per route.

## Validation & Runbooks

- **Smoke:** make bootstrap → make up → make smoke (golden path verification).
- **Load tests:** synthetic journeys with p95/p99 tracking and error budgets; run pre/post major releases.
- **Cost anomaly runbook:** thresholds trigger auto-ticket with suspected services, recent deploys, and rollback steps.
- **Rollback:** blue/green preference; cache purge + release markers cleared; verify RUM/trace baselines post-rollback.

## Forward-Looking Enhancements

- **Predictive caching:** ML-based prewarming using historical spike patterns; tie to CDN APIs.
- **Wasmtime edge workers:** move lightweight response shaping to edge for latency-critical tenants.
- **Plan-aware compilers:** automated hints to ORMs for join order/index usage based on telemetry feedback.
- **Adaptive sampling with QoE:** tune trace sampling based on user-perceived INP/FCP degradations.

## Ownership Matrix (initial)

- **Perf budgets & RUM:** Frontend Lead + SRE
- **Query leaderboard/indexing:** DB Reliability + Backend Lead
- **Async/job efficiency:** Platform Workflows
- **Telemetry budgets:** Observability Lead
- **Vendor consolidation:** FinOps + Security

## Delivery Checklist (per epic cluster)

- Targets set & documented; owners assigned; dashboards live.
- Instrumentation merged (RUM + traces + metrics) with sampling rules.
- CI budgets enforced; failing thresholds block deploys.
- Offenders triaged weekly; top 20 queries optimized with PR links.
- Caching + invalidation rules tested with invariants and synthetic checks.
- Release markers + blame wiring validated; rollback drill completed.
