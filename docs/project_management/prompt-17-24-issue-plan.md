# Prompts #17–#24 — Issue Breakdown, Branching, and CI Gates

The following GitHub issue scaffolds assume independent, feature-flagged delivery with no shared databases. Each issue includes a suggested branch, scope notes, and CI requirements keyed to the acceptance criteria. Conventional branch pattern: `feature/<short-name>`.

## 23rd-Order Extrapolated Delivery Implications (applies to all prompts)
1. **Feature-flag-first rollout:** every capability defaults to off, with per-tenant overrides and audit logging for toggles.
2. **Append-only decision records:** RFCs, architecture decisions, and schema changes are stored immutably with signer identity.
3. **Determinism guarantees:** seeded randomness for fixtures, simulations, and load tests to make failures reproducible.
4. **Policy hooks everywhere:** each service invokes LAC/policy adapters before any network or storage side effect.
5. **Data minimization:** inputs scrubbed for PII, logs redacted, and test fixtures sanitized; ensure zero secret leakage in CI artifacts.
6. **Observability SLOs:** per-API RED metrics, histogram buckets tuned to p95 ≤ 1.5s, and alert routes wired to on-call schedules.
7. **Backpressure + overload protection:** rate limits, circuit breakers, and queue depth alarms on all async entry points.
8. **Contract-driven collaboration:** typed APIs/events with golden fixtures; breaking-change detectors block merge without migration plans.
9. **Security baselines:** TLS everywhere, mTLS where applicable, cosign/slsa provenance on artifacts, and SBOM generation in CI.
10. **Access scoping:** RBAC/ABAC checks enforced server-side; UI hides gated controls but never trusts client state.
11. **Chaos + resilience drills:** forced disconnects, retries, partition simulations, and controlled fault injection in CI.
12. **Resource ceilings:** per-tenant quotas (CPU/GB/ops), admission controls, and cost guardrails aligned to business SLAs.
13. **Zero-downtime deploys:** blue/green with automatic rollback on error budget burn or regression signals.
14. **Golden-path E2E flows:** scripted “happy path” journeys used for smoke tests, demo seeds, and regression replay.
15. **Compliance traceability:** every change linked to an issue with scope, threat model notes, and testing evidence.
16. **Multi-environment parity:** dev/stage/prod config drift detectors; ephemeral preview environments per PR with seeded data.
17. **Storage hygiene:** clear retention/TTL defaults, encryption at rest, and periodic cleanup jobs with reporting.
18. **Dependency pinning:** lockfiles, vendored schemas, and artifact integrity checks to prevent supply-chain drift.
19. **UI/UX safeguards:** explicit consent banners, accessible affordances, and prominent indicators for recording/transcript states.
20. **Performance baselines:** repeatable k6 suites; cache hit/miss dashboards; benchmark deltas tracked per commit.
21. **Documentation completeness:** runbooks, API references, and “how to validate” steps embedded in each issue.
22. **Inter-team interoperability:** typed events mapped to consumers; clear ownership for message topics and error handling.
23. **Rollback playbooks:** auto-generated rollback plans per migration/feature with data safety checks and verification steps.

### Maximal-ideal 23rd-order assurance grid (applies to all prompts)
- **Scope hygiene:** explicit in-/out-of-scope tables, upstream/downstream dependency matrices, and failure domains mapped to ownership.
- **Defense in depth:** layered controls (authn → authz → policy → data guardrails → transport hardening → runtime sandboxing) verified by CI checklists.
- **Data classification:** every payload and artifact tagged with sensitivity levels; CI blocks misclassified flows and unsafe logging sinks.
- **Failure semantics:** well-defined degraded modes, partial availability rules, and user messaging; chaos drills validate non-happy paths.
- **Inter-service contracts:** typed schemas + backward/forward compatibility matrices; contract snapshots promoted with provenance.
- **Operational readiness:** runbooks, paging policies, SLO error budgets, and continuous verification hooks (canary, shadow, replay) per feature flag.
- **Change governance:** dual-control for destructive or privacy-impacting actions, auditable approvals, and time-bounded access tokens.
- **Supply-chain integrity:** SBOM diffing, signature verification on binaries/images, and attestations for generated migrations/fixtures.
- **Drift detection:** config/schema/policy drift monitors with auto-remediation playbooks and clear escalation paths.
- **Customer assurances:** tenant-level toggles, privacy posture statements, and exportable compliance evidence packs for audits.

## #17 Schema Registry & Evolution (SRE)
- **Branch:** `feature/schema-registry`
- **Issue focus:** Versioned schema registry service with publish/diff/promote/rollback APIs; Cypher and GraphQL SDL diff emitters; append-only, signed releases; safety constraints on destructive changes; UI diff viewer.
- **Feature flag:** `SRE_ENABLED`.
- **CI gates:**
  - Contract tests for publish/diff/promote with append-only enforcement.
  - Golden Cypher migration fixtures and GraphQL SDL diffs.
  - Playwright flow: publish → promote → rollback.
  - Pre-merge breaking-change block unless migration plan attached.
- **Policy questions to resolve:** GraphQL semver rules; default for nullable → non-nullable transitions.
- **Extended plan:**
  - Add semantic versioning validator (MAJOR/MINOR/PATCH) for GraphQL SDL with lint rules and release signing (cosign/TUF metadata).
  - Emit dual-path migration guidance: non-destructive path default; destructive steps require dual-control approvals and scheduled windows.
  - Provide CLI and GitHub Action for schema diff checks that gate PRs and post annotated comments with remediation suggestions.
  - Materialize UI diff timelines with append-only history, integrity badges, and rollback buttons constrained by policy checks.
  - Capture Neo4j and Postgres migration manifests as immutable artifacts with checksum verification and automated rollback scripts.
  - **23rd-order checks:** Align schema evolution with consumer readiness matrices, protect against cross-environment drift, and script dry-run rollbacks validated on seeded previews before production promotion.

## #18 Risk Scoring & Anomaly Engine
- **Branch:** `feature/risk-engine`
- **Issue focus:** FastAPI + Redis streams scoring service with weighted rules, z-score/EWMA detectors, temporal decay, path rationales, and Kafka `risk.updated` events; UI badges/tooltips.
- **Feature flag:** `RISK_ENGINE_ENABLED`.
- **CI gates:**
  - Deterministic scoring fixtures with seeded randomness.
  - Unit coverage per rule/detector; snapshot tests for explanations.
  - Latency SLO checks and k6 load test.
- **Policy questions:** Initial detectors list; risk decay half-life defaults.
- **Extended plan:**
  - Implement rules DSL with composable weights, seeded RNG, and deterministic decay curves; store rule configs in signed bundles.
  - Add policy-aware filters that strip PII and enforce label-aware controls before emitting `risk.updated` events.
  - Build explanation graph traces (path rationales) with snapshot baselines and human-readable deltas per release.
  - Introduce circuit breakers and Redis stream backpressure monitors with alert thresholds tied to latency SLOs.
  - Provide UI badges with drill-down tooltips, plus contract tests ensuring UI-only data mirrors API responses without leakage.
  - **23rd-order checks:** Calibrate decay/weight parameters with governance-approved change windows, bake reproducibility proofs into CI artifacts, and stage blue/green scoring rollouts with shadow-mode comparisons and automatic rollback triggers.

## #19 Live Presence & Session Capture
- **Branch:** `feature/presence`
- **Issue focus:** Socket.IO presence service with rate limits; WebRTC huddles with opt-in transcript capture; React + jQuery overlays for cursors/selections/@mentions; signed session export.
- **Feature flag:** `PRESENCE_ENABLED`.
- **CI gates:**
  - Playwright multi-client sync tests.
  - Chaos tests for disconnect/reconnect.
  - Golden session manifest fixtures and retention-policy checks.
- **Policy questions:** Max concurrent collaborators; session log retention defaults.
- **Extended plan:**
  - Enforce consent banners and explicit mic/camera toggles; block hot-mic by default with server-side validation.
  - Implement rate-limited presence heartbeats, deduplication, and jitter buffers to smooth cursor/selection streams.
  - Capture session manifests with signed hashes, time-bounded retention, and export receipts; scrub PII from overlays.
  - Add reconnect/resume flows with idempotent session tokens and chaos tests for packet loss/ordering issues.
  - Provide admin tooling for forced room teardown, transcript deletion, and retention override with audit trails.
  - **23rd-order checks:** Validate multi-region relay failover, prove transcript consent lineage in audit reports, and pre-stage bandwidth/codec fallback ladders to preserve continuity without violating consent banners.

## #20 Redaction & Differential Privacy Toolkit
- **Branch:** `feature/redact-dp`
- **Issue focus:** Shared redaction + DP library with regex/NER/image masks, DP mechanisms with per-tenant ε budgets, export hooks, and preview diff panel.
- **Feature flag:** `REDACT_DP_ENABLED`.
- **CI gates:**
  - Unit tests for maskers and DP budget enforcement.
  - E2E draft → redacted → receipt verification.
  - Ensure DP only on derived analytics/exports.
- **Policy questions:** Default ε budget; mandatory blocklist entities/regexes.
- **Extended plan:**
  - Provide pluggable redaction pipeline (text, image, structured) with deterministic receipts and reversible test fixtures.
  - Implement ε budget ledger enforced by LAC adapters; alert and block when tenants exceed quota.
  - Add DP mechanism validators (Laplace/Gaussian) with composition tracking and variance bounds in CI.
  - Wire export hooks for PDF/HTML/CSV with preview diff UI, jQuery overlays, and redaction reason codes.
  - Ship “must-block” regex packs (e.g., SSN, passport) with upgrade-safe versioning and contract tests for false negatives.
  - **23rd-order checks:** Precompute DP privacy-loss accounting across chained exports, exercise irreversible vs. reversible mask paths in golden fixtures, and gate releases on peer-reviewed threat models for new detectors.

## #21 Synthetic Data Forge & Scenario Benchmarks
- **Branch:** `feature/synth-forge`
- **Issue focus:** Python CLI generators for graph scenarios (communities, chains, bursts), ATT&CK-like playbooks, seeds/manifests, fixtures for dependent teams.
- **Feature flag:** `SYNTH_FORGE_ENABLED`.
- **CI gates:**
  - Golden fixtures with variance bounds on metrics.
  - Nightly demo refresh job.
  - Deterministic outputs via seeds.
- **Policy questions:** First three scenarios; target scales (10k/100k/1M nodes).
- **Extended plan:**
  - Build scenario templates (ER, risk, runbooks) with seedable RNG, license tag `SYNTHETIC`, and manifest provenance hashes.
  - Provide CLI `forge make <scenario> --seed --size` with structured outputs for Neo4j, CSV, and JSON fixtures.
  - Add variance guardrails (degree dist, clustering) enforced by CI; fail fast on drift beyond tolerances.
  - Publish fixture bundles for downstream teams (#9, #11, #18, #8) with compatibility matrix and refresh cadence.
  - Include observability seeds for demo environments and nightly rebuild jobs with retention and cleanup tasks.
  - **23rd-order checks:** Stamp fixtures with deterministic seeds + lineage chains, validate license/synthetic tags in downstream consumers, and preflight large-scale runs (100k+/1M nodes) with resource budget forecasts and abort thresholds.

## #22 Federated Discovery via PSI/Bloom
- **Branch:** `feature/fed-discovery`
- **Issue focus:** PSI adapter + Bloom mode with tenancy/consent registry, replay/rate protections, audit trail; APIs for handshake/init/complete and overlap retrieval; LAC policy checks.
- **Feature flag:** `FED_DISCOVERY_ENABLED`.
- **CI gates:**
  - Cryptographic test vectors and interop between two mock tenants.
  - Consent-denial path and replay protection tests.
- **Policy questions:** Default PSI vs Bloom; overlap thresholds that trigger contact workflow.
- **Extended plan:**
  - Support both PSI (accuracy) and Bloom (speed) with explicit protocol negotiation and per-tenant capability registry.
  - Enforce consent proofs and replay protection tokens; log append-only audit trails with integrity hashes.
  - Provide rate-limited handshake APIs with DoS safeguards and configurable overlap thresholds tied to workflows.
  - Add interop test harness simulating two tenants with cryptographic vectors and failure-mode coverage (denial/timeouts).
  - Produce hashed-token-only outputs with optional differential privacy noise for low-cardinality overlaps.
  - **23rd-order checks:** Enforce cryptographic agility with versioned protocol suites, stage red/blue tenant rehearsals for consent denial/timeout paths, and wire fallback to Bloom-only mode with explicit accuracy caveats and audit evidence.

## #23 Materialized Subgraphs & Query Cache Manager
- **Branch:** `feature/subgraph-cache`
- **Issue focus:** Node service with Redis/Postgres backing for subgraph materialization, cost/size planner, LRU-by-cost cache, event-driven invalidation, and UI pin/usage stats.
- **Feature flag:** `SUBGRAPH_CACHE_ENABLED`.
- **CI gates:**
  - k6 cache hit/miss benchmarks and eviction policy tests.
  - Correctness checks vs. live graph; no PII in cache blobs.
- **Policy questions:** Max cache size per tenant; TTL vs event-only invalidation defaults.
- **Extended plan:**
  - Implement cost-aware planner with size estimates and per-tenant quotas; enforce policy-aware cache keys (policy+time).
  - Add event-driven invalidation listeners for graph change topics plus manual bust endpoints with audit logs.
  - Provide Redis+Postgres hybrid persistence for snapshots with integrity hashes and snapshot pinning.
  - Build UI “Pin this view” and usage stats with React widgets and jQuery DOM glue; ensure client-side cache never trusted.
  - Benchmark hit/miss rates with k6 and export dashboards; include eviction simulations and OOM safety tests.
  - **23rd-order checks:** Simulate cache-poisoning attempts, verify policy/time-scoped keys under daylight savings/timezone shifts, and run steady-state + burst benchmarks with automatic rollback to live graph on anomaly detection.

## #24 Multimodal Enrichment Pipeline (OCR/ASR/EXIF)
- **Branch:** `feature/enrich-mm`
- **Issue focus:** Celery-based enrichment for OCR/ASR/EXIF with safety constraints (no biometrics), Redis backpressure, manifesting, and UI previews with redaction overlays.
- **Feature flag:** `ENRICH_MM_ENABLED`.
- **CI gates:**
  - Golden IO tests and manifest verification.
  - Throughput/accuracy baselines; retry/backoff coverage.
- **Policy questions:** Minimum OCR/ASR accuracy targets; queue concurrency/throughput goals.
- **Extended plan:**
  - Provide pipeline DAGs for OCR (Tesseract/rapid), ASR (Whisper-small), EXIF parsing, and logo/text detectors (non-face).
  - Enforce no-biometric rule with classifier blocks and policy checks; scrub PII before persistence.
  - Add retry/backoff with dead-letter queues, circuit breakers, and queue depth alerts for backpressure.
  - Generate manifests with hashes/provenance and UI previews with redaction rectangles/jQuery overlays; include export hooks.
  - Track accuracy/throughput baselines per model with regression alerts and fixture-based golden IO tests.
  - **23rd-order checks:** Validate GPU/CPU parity paths, pre-compute fallback models for constrained environments, and attest manifests with content hashes plus non-biometric guarantees before exposing UI previews or exports.

## Cross-track Parallelization Notes
- #17 gates via CI only; others are event/API isolated with no shared DBs; align manifests and feature flags per acceptance criteria.
