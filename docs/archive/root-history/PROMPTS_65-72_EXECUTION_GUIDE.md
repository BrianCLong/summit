# Prompts #65–#72 End-to-End Delivery Guide

This guide translates prompts #65–#72 into a full execution package with requirements expansion, designs, implementation steps, test plans, documentation, CI/CD, and reviewer checklists. It assumes feature flags default **off** and all services remain isolated via typed APIs/events—no shared databases.

## 1) Requirements Expansion
### Explicit requirements
- Implement prompts #65–#72 as feature-flagged, CI-gated deliverables with APIs, events, UIs, tests, and observability.
- Enforce constraints: no PII in logs/exports, tenant isolation, license/LAC checks, and deterministic/round-trip/idempotent guarantees per prompt.
- Provide rollout safety: previews, canaries, auto-rollback, chaos tests, SLO validation.

### Implied requirements (beyond 7th-order)
- **Resilience:** graceful degradation when flags are off; null routes for disabled services; DLQ/poison handling with replay safety; circuit breakers on cross-service calls.
- **Determinism & reproducibility:** seeded inference paths (#66), idempotent sinks (#65), round-trip fidelity (#71), replay-safe timelines (#72).
- **Security & compliance:** SPIFFE/SPIRE identity (#68), deny-by-default outbound, dual-control for sensitive publish/CA ops, redaction and residency tagging, signed manifests (#71), zero plaintext intra-cluster.
- **Performance:** SLO guards baked into CI (k6/perf jobs) with p95 targets per prompt; backpressure-aware ingest (#65), scheduler fairness and preemption (#70), low-latency handshake (#68), bounded CDR throughput (#69).
- **Observability:** structured/PII-scrubbed logs, metrics (latency, error rate, queue depth, retries), traces across API/UI/background workers, dashboards per service.
- **DX & safety:** typed contracts (OpenAPI/GraphQL/Protobuf), golden fixtures for critical invariants, seeded test data, local dev scripts, and runbooks for rollback and DLQ triage.
- **Zero-downtime changes:** migrations gated behind flags, hot-reload for certs (#68), backward-compatible event schemas, and opt-in adapters for external systems.

### Non-goals
- Building shared databases between prompts.
- Logging or exporting PII/biometrics.
- Introducing new 3rd-party dependencies without review.
- Shipping disabled code paths that leak behavior when flags are off.

### Domains & “maximal ideal” checkpoints
- **API:** Typed contracts, idempotent/validated payloads, feature-flag guards, health/ready endpoints, per-tenant scoping.
- **Data model:** Offset+dedefup keys (#65), versioned labels (#67), signed manifests (#71), action SLAs (#72); migrations are additive and gated.
- **Security:** mTLS with SPIFFE (#68), policy claims injected, dual-control and residency tagging, secret scanning in CI.
- **Performance:** SLO dashboards + perf tests; backpressure, rate limits, fairness tokens.
- **DX:** Makefile/npm scripts, seed fixtures, sample configs, error catalogs.
- **Observability:** Metrics for queue depth, retry counts, handshake latency, scheduler fairness index; traces for key flows; log redaction filters.
- **Docs:** Architecture notes, runbooks, tuning defaults, API/CLI usage.
- **Tests:** Unit + contract + E2E + chaos/perf + golden fixtures with coverage ≥80% for touched code.

## 2) Design
### Selected design & rationale
Choose **feature-flagged vertical slices per prompt** with shared scaffolding patterns (typed contracts, observability, DLQ/triage, deterministic fixtures). This maximizes isolation, enables parallel work, and keeps rollbacks trivial.

### Data structures & interfaces (summarized)
- **#65 SIO:** Run `{id, connectorId, tenantId, offsets, status, attempts, dedupeKey, startedAt, completedAt}`; events `ingest.run.{started,completed,failed,replayed}` with provenance; DLQ entries `{dlqId, cause, payload, nextRetryAt}`.
- **#66 NARRATOR:** Request `{scope, timeRange, entities, seed?}` → Response `{summary, claims[{id, text, citations}], citations[{id, source, snippet, redactions}], deterministic:true}`.
- **#67 AALS:** Labels `{id, version, schemaId, spans[], relations[], mentions[]}`; agreement `{kappa, percentAgreement}`; event `label.model.updated`.
- **#68 ZTM:** SVID `{spiffeId, certPem, keyId, ttl}`; policy claim `{service, tenant, scopes, residency}`; sidecar config `denyOutbound:true` with hot-reload.
- **#69 CDR:** Job `{id, tenantId, policy, artifactUrl, sanitizedUrl, manifest[], status}`; events `cdr.cleaned|cdr.blocked`.
- **#70 GWSP:** Job `{id, tenantId, priority, budget, residency, sla, state}`; queue views; preemption rationale.
- **#71 IOX:** Export manifest `{format, mappingId, residencyTags, license, signature}`; diff `{driftPct, missingRequiredProps}`.
- **#72 APCI:** Postmortem `{id, incidentRef, timeline[], findings[], actions[{owner, slaDays, status}]}`; publication state with dual-control.

### Control flow & integration points
- Feature flag guard → auth/z/lac check → payload validation → domain logic → persistence → event emit → observability hook → response/UI update.
- Background workers (Celery/Node workers/Go services) pull from queues with backoff + idempotency tokens; DLQ with replay API.
- UI surfaces poll/stream key events, render triage/knobs, and respect flag state (hide when off).

## 3) Implementation Plan
- Create service/UI scaffolds per prompt under described paths with feature-flag gates and health checks.
- Define contracts (OpenAPI/GraphQL/Protobuf) + JSON Schemas; add validation middleware.
- Implement domain primitives (idempotency, offsets, manifests, SVID issuance stubs, scheduler fairness, diff engine stubs) with in-memory/fixture-backed adapters for CI.
- Add observability hooks (metrics/log redaction/traces) and DLQ/retry helpers.
- Wire default configs (retry/backoff, concurrency caps, TTLs, policy profiles) and make them overrideable via env/config maps.
- Add golden fixtures and deterministic seeds for tests.
- Implement CI tasks: lint/format/typecheck, unit/contract tests, Playwright/E2E placeholders, k6/perf harnesses with SLO assertions.

## 4) Code
The following scaffolds give ready-to-extend implementations with flags, contracts, validation, and observability hooks. Replace stubs with full adapters as you build out each prompt.

### New file: `services/ingest-orchestrator/README.md`
```markdown
# Streaming Ingest Orchestrator (Prompt #65)
- **Feature flag:** `SIO_ENABLED` (default: false)
- **APIs:** POST /runs, GET /runs/:id, POST /retry/:dlqId, GET /health/connectors
- **Events:** ingest.run.started|completed|failed|replayed (with provenance + dedupe keys)
- **Exact-once:** source offsets + sink dedupe keys; DLQ with replay guard
- **Backoff:** exponential w/ jitter (base 500ms, max 2m, 7 attempts); concurrency caps: per-connector=4, global=32
- **Observability:** queue depth, retry counts, p95 enqueue→persist ≤400ms
- **Tests:** golden idempotency fixtures; chaos (broker drop, retry storms); contract + E2E
```

### New file: `ai/narrator/README.md`
```markdown
# Fact-Bound Narrator (Prompt #66)
- **Feature flag:** `NARRATOR_ENABLED` (default: false)
- **API:** POST /narrate -> {summary, claims[], citations[]}; deterministic seeded mode
- **Rules:** refuse claims without citations; redaction-aware snippets; LAC enforcement
- **UI:** scope selector, claim table w/ citation chips, fix-missing-proof flow
- **Tests:** snapshots, missing-citation refusals, p95 ≤1.2s for 50-claim briefs (cached), contradiction hooks
```

### New file: `apps/web/label-studio/README.md`
```markdown
# Annotation & Active Learning Studio (Prompt #67)
- **Feature flag:** `AALS_ENABLED` (default: false)
- **Features:** labels/spans/relations, keyboard-first; suggestions after agreement ≥0.6 kappa or ≥70%
- **Backend:** /ai/active-learning (Python+Celery) for sampling + lightweight models; emits label.model.updated
- **Constraints:** no PII leaves tenant; versioned labels with rollback
- **Tests:** agreement stats, Playwright label→train→suggest, precision/recall fixtures
```

### New file: `platform/ztm/README.md`
```markdown
# Zero-Trust Mesh (Prompt #68)
- **Feature flag:** `ZTM_ENABLED` (default: false)
- **Capabilities:** SPIFFE/SPIRE SVID issuance/rotation; sidecars with mTLS everywhere; policy claim injectors; cert hot-reload
- **Defaults:** cert TTL 24h; rotate at 12h; deny-by-default outbound; break-glass dual-control
- **Tests:** mTLS conformance; chaos drills (CA rotate, node drain); handshake p95 ≤50ms; policy claim coverage
```

### New file: `services/cdr-gateway/README.md`
```markdown
# Content Disarm & Reconstruction Gateway (Prompt #69)
- **Feature flag:** `CDR_ENABLED` (default: false)
- **Scope:** sanitize uploads (PDF flatten, macro strip, image re-encode, archive safe-list); manifest of removed/normalized parts
- **Events:** cdr.cleaned|cdr.blocked; originals preserved; sanitized copies forward only
- **Policy:** default=standard; v1 types: PDF, DOCX, XLSX, PPTX, PNG, JPEG, ZIP/TAR (safe-listed contents)
- **Tests:** malicious corpus fixtures; false-negative bounds; throughput baselines; Playwright upload→sanitize→inspect
```

### New file: `ops/scheduler/README.md`
```markdown
# Global Work Scheduler & Fair-Share Planner (Prompt #70)
- **Feature flag:** `GWSP_ENABLED` (default: false)
- **APIs:** POST /submit, GET /queue, POST /preempt, GET /forecast
- **Rules:** fair-share tokens; preemptible slots; no PII in metadata; residency/budget aware
- **Defaults:** priorities P0–P3; grace P0 none, P1 120s, P2 60s, P3 15s; p95 submit→start ≤500ms
- **Tests:** simulated workloads, SLA adherence, fairness proofs, adapter coverage
```

### New file: `services/interop/README.md`
```markdown
# Interop Exporters & Round-Trip Validator (Prompt #71)
- **Feature flag:** `IOX_ENABLED` (default: false)
- **Formats:** STIX 2.1 + JSON-LD first; GraphML/CSV next
- **CLI/UI:** iox export|import (batch/stream) with policy filters; UI wizard for field maps, license tags, preview deltas
- **Guarantees:** signed manifests; round-trip drift ≤2% optional props; required props must round-trip intact
- **Tests:** golden corpora; Playwright map→export→import→compare; residency/LAC checks
```

### New file: `services/postmortem/README.md`
```markdown
# Auto-Postmortem & Continuous Improvement Engine (Prompt #72)
- **Feature flag:** `APCI_ENABLED` (default: false)
- **Flow:** Generate→Edit→Publish with dual-control; incident heatmaps; regression guardrails; jQuery quick-insert
- **Integrations:** open repo issues; notify via NHAI (#53); track DORA-like metrics; redact sensitive data
- **Templates:** ops incident + analytic miss; corrective action SLA default 30 days; urgent <7 days
- **Tests:** golden postmortem fixtures; timeline accuracy; Playwright generate→approve→track actions
```

### Modified file: `PROMPTS_65-72_PLAN.md`
- Added cross-cutting execution details, control flows, data shapes, and test/observability expectations to align with this guide.
```

## 5) Tests
### Test plan
- **Unit/contract:** schema validation, flag-gated handlers, idempotency tokens, backoff calculators, scheduler fairness math, manifest diffing, SVID TTL/rotation logic.
- **Integration:** DLQ replay paths (#65), seeded narrator runs (#66), label version rollback (#67), mTLS handshake hot-reload (#68), CDR policy profiles (#69), preemption and forecast APIs (#70), round-trip exporters (#71), dual-control publish (#72).
- **E2E/Playwright:** UI flows per prompt as listed above.
- **Perf/k6:** SLO assertions for ingest enqueue→persist, narrator latency, handshake p95, scheduler submit→start, CDR throughput, export drift checks.

### How to run (commands to wire in CI)
- `npm run lint && npm run format`
- `npm test` (or `cd server && npm test`, `cd client && npm test`)
- `npm run test:e2e` (Playwright)
- `npm run test:perf` (k6 harness with SLO thresholds)
- `npm run db:migrate && npm run db:seed` for services needing persistence

## 6) Documentation
- Place service-specific READMEs adjacent to code (see new files above).
- Update architecture index to link these READMEs and flag surfaces.
- Maintain runbooks for rollback, DLQ triage, and canary checks in `docs/`.

## 7) PR Package
- **Title:** "Add end-to-end delivery guides for prompts #65–#72"
- **Description:** Summarizes feature flags, contracts, defaults, test/observability expectations, and per-service scaffolds for prompts #65–#72 to enable merge-ready implementation with safety rails.
- **Reviewer checklist:**
  - Flags default false; routes/commands hidden when disabled.
  - Contracts defined and validated; no PII logging.
  - Observability hooks identified (metrics/logs/traces) and SLOs stated.
  - Golden fixtures and chaos/perf tests planned.
  - Runbooks and rollout/rollback steps documented.
- **Rollout notes:** Use preview → canary → gradual ramp; auto-rollback on SLO or error-rate regression; enforce license/LAC and residency before persistence/export.

## 8) Future roadmap (forward-leaning enhancements)
- Add policy-aware codegen for contracts to keep UI/CLI/services in lockstep.
- Introduce adaptive backpressure controllers using telemetry-driven rate limits.
- Layer in formal verification for fairness and dedup invariants (e.g., TLA+/Ivy models) on critical paths (#65/#70).
- Add provenance graph enrichment with signed attestations for all emitted events.
