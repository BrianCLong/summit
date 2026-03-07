# Missions 25–32 Execution Plan and Evidence

This document captures design, implementation plans, and evidence artifacts for missions 25–32. Each section aligns to the specified acceptance criteria while fitting Summit’s multi-tenant IntelGraph architecture.

## 25) Search & Indexing v1: Unified Query Over Graph + Timeline

### Architecture & Index Strategy

- **Stores**: Neo4j (entities/relationships), PostgreSQL (events metadata & document manifests), OpenSearch (inverted index with structured filters), Redis (hot cache for rankings + cursor state).
- **Tenant scoping**: `tenant_id` is a required field on every indexable item and is embedded in OpenSearch index naming (`tenant-{id}-unified-search-*`) plus document-level filter clauses. Neo4j labels include `Tenant_{id}` and Postgres tables partitioned by `tenant_id`.
- **Index composition**:
  - Inverted text index for titles, body, extracted entities.
  - Numeric/date fields for time-range filters (`event_time`, `ingested_at`).
  - Keyword fields for `type`, `source`, `classification`, `confidence_bucket`.
  - Vector sub-index (optional) for semantic recall with per-tenant HNSW parameters.
- **Structured filters**: `type`, `source`, `confidence`, `time range`, `tenant`, `classification` enforced as filter clauses (never scored).
- **Cursor-safe pagination**: opaque cursors encode sort keys (`score`, `event_time`, `_id`) and tenant; Redis cache stores cursor checksum to prevent tampering.

### Query API (REST) – `/api/search/unified`

- **Query params**: `q` (keywords), `tenant_id` (required), `time_from`, `time_to`, `types[]`, `sources[]`, `confidence_min`, `confidence_max`, `page_size` (≤100), `cursor`.
- **Behavior**:
  - Reject if `tenant_id` missing or mismatched with auth token compartment.
  - Default sort: BM25 score, then `event_time` desc, then `_id` for deterministic order.
  - Stable pagination via encoded cursor; replays return identical ordering while respecting updated policy filters.
- **Example requests**:
  - `GET /api/search/unified?q=bridge+explosion&tenant_id=acme&time_from=2025-08-01&time_to=2025-09-01&types[]=entity&types[]=event&confidence_min=0.6`
  - `GET /api/search/unified?q="Project Lyra"&tenant_id=odin&sources[]=sigint&sources[]=humint&page_size=25`
- **Responses**:
  - `items`: `{ id, type, title, snippet, event_time, source, confidence, tenant_id, highlight, ranking_features }`
  - `cursor`: opaque string; omit when at end.
  - `perf`: `{ took_ms, cache_hit }`

### Ranking Rules

1. **Primary**: BM25 on textual fields with query-dependent boosts (`title^3`, `entities^2`, `body^1`).
2. **Recency boost**: exponential decay on `event_time` (half-life configurable per tenant/lane).
3. **Confidence boost**: linear scaling 0.5–1.2 using `confidence` (0–1).
4. **Source reliability**: per-tenant weights (e.g., `osint=0.9`, `sigint=1.05`, `humint=1.0`).
5. **Diversity**: penalize near-duplicate doc hashes to reduce cluster overload.
6. **Security filters**: policy-filtered documents drop before scoring; no leakage across tenants.

### Reindex & Backfill

- **Idempotent job**: `jobs/reindex-unified.ts` consumes change feed; checkpoints persisted per-tenant. Re-runs reconcile hashes and delete orphans.
- **Backfill**: bootstrap from Postgres manifests + Neo4j dumps; uses tenant-partitioned batches (1k docs) with rate limit and hash comparison to avoid duplicates.
- **Validation**: sample queries recorded; `perf:samples` ensures p95 `<500ms` on dataset (20k docs) with warm cache.

### Evidence

- API spec above, sample queries below, index mapping in `../test-data/search-index-sample.json`, and ADR `0014-unified-search-store-and-ranking.md`.

## 26) Privacy Budget Hooks: Purpose Limitation + Access Accounting

- **Purpose requirement**: Sensitive queries must include `X-Purpose` header mapped to policy enumerations (`investigation`, `training`, `demo`, etc.). Missing/unknown purpose → HTTP 412.
- **Access accounting**: every query emits audit event `{ who, tenant, dataset, purpose, volume, timestamp, decision }` to `audit.access_log` (Postgres) and Redpanda stream `privacy.accessed.v1`.
- **Budget tracker**: per-tenant/dataset counters with thresholds (`daily_limit`, `burst_limit`, `per_user_limit`). Stored in Redis with Postgres checkpoint every 5 minutes. Crossing threshold triggers block + alert (PagerDuty + Slack via webhook).
- **Alert/Block**: if `budget_remaining <= 0` or `purpose` missing → 403 with remediation hint. Alert includes rolling 24h totals.
- **Evidence**: policy definitions in `docs/wave13/privacy-policies.md`, ADR `0015-privacy-purpose-and-budget-model.md`, dashboard mock in `docs/wave13/observability-dashboards.md`.

## 27) Test Pyramid Hardening: Contract Tests + Flake Kill Program

- **Contract tests**: consumer-driven pact between `query-copilot` (consumer) and `gateway` (provider). Stored in `tests/contracts/query-copilot-gateway.md` with CI job `pnpm test:contracts` gate.
- **Flake tracking**: `tests/FLAKE_REPORT.md` lists quarantined tests + auto-rerun policy (3x) + weekly report generated from CI artifacts.
- **Coverage gates**: critical modules (`authz`, `search`, `privacy`, `drift-detection`) must stay ≥85% line coverage; enforced via `nyc` config and CI summary.
- **Runtime budgets**: test suites carry per-suite budgets (unit: 2m, contract: 3m, e2e: 8m) with timeouts logged to CI.
- **Evidence**: docs here plus ADR `0016-test-coverage-and-flake-policy.md`.

## 28) Environment Drift Detection: Config + IaC + Runtime Consistency

- **IaC drift detection**: scheduled job compares Terraform state vs. `aws`/`k8s` runtime using `terraform plan` + `kubectl diff`; report stored to S3 and summarized in Slack.
- **Runtime config snapshot**: nightly export of service configs (`ConfigMap` + `/config/runtime.json`) compared to desired state; diffs severity-scored (info/warn/critical).
- **Alerting**: critical drift triggers PagerDuty; warn-level creates ticket and dashboard marker.
- **Remediation playbook**: staged rollout with canary apply, auto-rollback on health regressions; documented in `docs/wave13/drift-runbook.md` and ADR `0017-drift-detection-thresholds.md`.

## 29) API Versioning Governance: Deprecation Policy + Compatibility Tests

- **Versioning scheme**: URI-based (`/v1`, `/v2`) plus `Accept-Version` header; backwards-compatible minor changes allowed, breaking changes require new major version.
- **Deprecation workflow**: add `Deprecation` header + sunset date, publish migration guide, maintain compatibility tests for old versions until EOL.
- **Compatibility tests**: contract suite hits published endpoints for prior major versions; failing tests block merge unless version bump + guide committed.
- **Changelog generation**: release pipeline emits `API_CHANGELOG.md` entries from OpenAPI diffs.
- **Evidence**: governance template `docs/wave13/api-versioning-governance.md`, ADR `0018-api-versioning-tradeoffs.md`.

## 30) Customer-Specific Deployment Lanes: White-Label Isolation + Policy Guards

- **Lane concept**: per-customer config bundle (`lanes/{customer}/config.yaml`) containing feature flags, rollout policies, and tenant bindings. Deployments run through dedicated ArgoCD app instances with namespaced resources.
- **Guardrails**: policy engine validates config against disallow list (e.g., disabling audit, weakening auth) before apply. Unsafe overrides rejected with explanation.
- **Canary/Rollback**: per-lane canary weights and rollback hooks defined in config; release audit trail stored in `lanes/{customer}/audit.log`.
- **Evidence**: lane spec `docs/wave13/customer-lanes.md`, ADR `0019-lane-isolation-vs-overhead.md`, runbook `docs/wave13/lane-promotion-runbook.md`.

## 31) Disaster Recovery v1: RPO/RTO Targets + Automated Restore Drill

- **Targets**: Tier 0 (authz, ledger): RPO 5m/RTO 30m; Tier 1 (search, ingest): RPO 15m/RTO 60m; Tier 2 (analytics UI): RPO 1h/RTO 4h.
- **Backups**: encrypted S3 with KMS, immutability window 7 days; Neo4j snapshots + Postgres WAL shipping; weekly integrity checksums.
- **Automated restore drill**: staging job restores latest backups, runs synthetic checks (login, query, ingest), and posts report to `#dr-drills`.
- **Runbook**: incident declaration, failover steps, validation checklist in `docs/wave13/disaster-recovery-runbook.md`; ADR `0020-backup-restore-design.md`.

## 32) Reliability Scorecards: Service Tiering + Error Budget Reviews

- **Tiering rubric**: Tier 0/1/2 definitions with required controls (SLOs, paging, chaos frequency). Stored in `docs/wave13/reliability-scorecards.md`.
- **Monthly scorecards**: generator aggregates telemetry (SLO burn, MTTR, change fail rate) into CSV + Markdown; sample output provided.
- **Error budget policy**: if burn rate >2x target for 48h → release freeze; else canary-only until budget recovers.
- **Evidence**: rubric doc, sample scorecards, ADR `0021-reliability-scoring-weights.md`.

## Sample Dataset & Performance Check

- `test-data/search-index-sample.json` includes 50 mixed entities/events/documents with tenant scoping and confidence values. Benchmark notes target p95 <500ms with warm cache on 20k record scale.

## Stable Pagination & Security Notes

- Cursor contains: `{ tenant_id, last_score, last_event_time, last_id, checksum }`, HMAC-signed per tenant key. Requests failing verification return 400.
- All query paths log to access ledger with purpose + budget consumption.

## Forward-Looking Enhancements

- Add **learning-to-rank** (LambdaMART) per-tenant models using click-through events to personalize ordering without cross-tenant leakage.
- Introduce **semantic cache** of query embeddings keyed by normalized filters to further reduce latency and improve recall.
