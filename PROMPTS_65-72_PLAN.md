# Prompts #65–#72: Issue Conversion & Delivery Blueprint

This blueprint converts prompts #65–#72 into CI-gated GitHub issues with feature-flagged branches, explicit deliverables, and rollout controls. It is written to be handed directly to teams to implement without further clarification. For an expanded execution package (requirements expansion, design, test/CI plan, and reviewer checklist), see `PROMPTS_65-72_EXECUTION_GUIDE.md`.

## Global workflow (applies to all prompts)
1. **Issue scaffolding**
   - Create one GitHub issue per prompt using the titles in the per-prompt matrix below.
   - Add labels: `feature-flagged`, `ci-gated`, `needs-preview`, `no-pii-logging`, prompt-specific tag (e.g., `prompt-65`).
   - Link dependencies only by typed API/event contracts; no shared DBs.
2. **Branching & flags**
   - Branch names from the matrix; protect with required checks; default flag = `false` in all envs.
   - Toggle via env vars/config maps; ensure safe-off code paths and null routing when disabled.
3. **CI gates (per branch, blocking)**
   - Unit + contract tests (schemas, APIs, events), coverage ≥80% for touched code.
   - Playwright/E2E covering UI + backend path for the prompt.
   - Chaos/simulation tests per prompt (see matrix), including broker drop/retry storms where specified.
   - Golden fixtures for idempotency/round-trip fidelity where specified.
   - k6/latency SLO checks aligned to prompt-specific p95 targets.
   - Lint/format/type-check (ESLint/Prettier/TS/Go vet/pytest-mypy as applicable).
   - Security: secret scans, dependency audit, and PII-log assertion.
4. **Preview + rollout**
   - Auto-preview per PR; capture baseline metrics (latency, error rate, resource caps).
   - Canary with auto-rollback on regression; observability dashboards per service and UI.
   - License/LAC hooks validated before persistence/export per constraints.
5. **Documentation & handoff**
   - Update README/architecture notes per service; include feature flag, API/CLI usage, and operational runbooks.
   - Record tuning defaults and override surfaces in config docs.

## Per-prompt delivery matrix
| Prompt | Issue Title | Branch | Feature Flag | Deliverables & APIs | CI/DoD highlights | Tuning defaults + answers |
| --- | --- | --- | --- | --- | --- | --- |
| #65 Streaming Ingest Orchestrator (SIO) | "[#65] Streaming Ingest Orchestrator" | `feat/sio/ingest-orchestrator` | `SIO_ENABLED` | Service `/services/ingest-orchestrator` (Node 18/TS, Redis Streams + Postgres). APIs: POST `/runs`, GET `/runs/:id`, POST `/retry/:dlqId`, GET `/health/connectors`. UI: live run console, DLQ triage, rate-limit knobs (React 18 + jQuery overlays). Emits `ingest.run.started|completed|failed|replayed` with provenance links. Exactly-once via offsets + sink dedupe keys; poison queue inspection. | Golden fixtures for idempotency; chaos tests for broker drop + retry storms; p95 enqueue→persist ≤400ms. Connector isolation per tenant; no PII in logs; license/LAC check before persistence. | Backoff: exponential w/ jitter, base 500ms, max 2m, 7 attempts before DLQ. Concurrency: per-connector cap=4 default plus global cap=32. |
| #66 Fact-Bound Summarizer & Narrative Builder (NARRATOR) | "[#66] Fact-Bound Narrator" | `feat/narrator/fact-bound` | `NARRATOR_ENABLED` | `/ai/narrator` FastAPI (Py 3.12) generating (summary, claims[], citations[]), hooks to contradiction detector (#56). UI "Narrate" panel: scope selector, claim table w/ citation chips, missing-proof workflow. Export PDF/HTML via Brief Studio (#13) manifest. Deterministic mode (seeded). | Snapshot tests; refusal when citations missing; latency p95 ≤1.2s for 50-claim briefs (cached indices). Enforce LAC/redaction; no free-text claims without citations. | Outline templates: executive (default), technical, legal. Max claims v1: 50. |
| #67 Annotation & Active Learning Studio (AALS) | "[#67] Annotation & Active Learning Studio" | `feat/aals/label-studio` | `AALS_ENABLED` | `/apps/web/label-studio` (React+jQuery) for labels, spans, relations; keyboard-first. `/ai/active-learning` (Python+Celery) for pool sampling, lightweight models, agreement metrics; emits `label.model.updated`. Dataset export to `/ai/gnn-lab`; suggestion queues. | Agreement/stat tests; Playwright label→train→suggest; precision/recall bounds; versioned labels with rollback; no PII leaving tenant. | Preload schemas: entities/relations/mentions (top 3 ontologies) + binary relevance quickstart. Surface model suggestions after ≥0.6 Cohen’s kappa or ≥70% agreement. |
| #68 Zero-Trust Mesh & Identity-Bound mTLS (ZTM) | "[#68] Zero-Trust Mesh" | `feat/ztm/mtls-mesh` | `ZTM_ENABLED` | `/platform/ztm` (Go): SVID issuance/rotation, sidecars, policy claim injectors, cert hot-reload, gateway adapters. Attestation node/workload; KMS (#27) for CA keys; deny-by-default outbound. Dashboards: cert health, trust graph, policy claim coverage. | mTLS conformance; chaos drills (CA rotate, node drain); p95 handshake ≤50ms. No plaintext intra-cluster; auto key rotation; break-glass dual-control. | Authority: start with SPIRE-backed CA. Cert TTL 24h; rotate at 12h; dual-control for CA ops. |
| #69 Content Disarm & Reconstruction Gateway (CDR) | "[#69] Content Disarm & Reconstruction" | `feat/cdr/gateway` | `CDR_ENABLED` | `/services/cdr-gateway` (Python workers): sanitize uploads (PDF flatten, macro strip, image re-encode, archive safe-list) with manifest of removed/normalized parts. Inline verifier + preview UI (React+jQuery sliders). Events: `cdr.cleaned|cdr.blocked`; handoff to Enrich-MM (#24). Originals preserved; sanitized copies forward only. | Malicious corpus tests; false-negative bounds; throughput baselines; Playwright upload→sanitize→inspect. Policy profiles per tenant. | Default policy: standard (strip macros, flatten PDFs, re-encode images; allow only safe-listed archives). v1 file types: PDF, DOCX, XLSX, PPTX, PNG, JPEG, ZIP/TAR (safe-listed contents). |
| #70 Global Work Scheduler & Fair-Share Planner (GWSP) | "[#70] Global Work Scheduler" | `feat/gwsp/scheduler` | `GWSP_ENABLED` | `/ops/scheduler` (Go or Node): priority queues, fair-share tokens, preemptible slots; adapters for Celery, K8s Jobs, custom workers. APIs: POST `/submit`, GET `/queue`, POST `/preempt`, GET `/forecast`. UI: queue explorer, SLA heatmap, preemption rationale. | Simulated workloads; SLA adherence; fairness proofs; p95 submit→start ≤500ms. Enforce residency + budget; no PII in job metadata. | Priority taxonomy: P0 critical, P1 high, P2 default, P3 background. Preemption grace: P0 none; P1 120s; P2 60s; P3 15s. |
| #71 Interop Exporters & Round-Trip Validator (IOX) | "[#71] Interop Exporters" | `feat/iox/exporters` | `IOX_ENABLED` | `/services/interop` (Node/TS): exporters/importers, schema mappers, diff tool for round-trip drift, signed manifests. CLI `iox export|import` with policy filters (batch/stream). UI wizard (React+jQuery): field maps, license tags, preview deltas. | Golden corpora; round-trip drift ≤ threshold; Playwright map→export→import→compare. LAC/residency on export; no PII beyond policy. | Formats first: STIX 2.1 + JSON-LD; next GraphML/CSV. Acceptable drift: ≤2% optional props; required props must round-trip intact. |
| #72 Auto-Postmortem & Continuous Improvement Engine (APCI) | "[#72] Auto-Postmortem Engine" | `feat/apci/postmortem-engine` | `APCI_ENABLED` | `/services/postmortem` (Node/TS): template engine, timeline extractor, root-cause drafts, action items w/ owners & SLAs. UI: Generate→Edit→Publish, incident heatmaps, regression guardrails; jQuery quick-insert. Integrations: open repo issues, notify via NHAI (#53), track DORA-like metrics. Redact sensitive data; dual-control for external sharing. | Golden postmortem fixtures; timeline accuracy checks; Playwright generate→approve→track actions. | Templates: ops incident + analytic miss (blameless, dual-control). Corrective action SLA: default 30 days; <7 days = urgent. |

## Execution checklist per issue
- [ ] Branch created with flag defaulting to `false`; config surface documented.
- [ ] Contracts defined (OpenAPI/GraphQL/Protobuf or event schema) and validated in CI.
- [ ] Service + UI scaffolds generated with observability (structured logs without PII, metrics, traces) and health/ready endpoints.
- [ ] Fixtures added for golden/idempotency/round-trip requirements.
- [ ] Playwright/E2E and chaos tests implemented per prompt; p95 SLO checks wired.
- [ ] Preview environment deployed; dashboards for latency/error/capacity published.
- [ ] License/LAC enforcement validated where applicable.
- [ ] Runbooks updated (feature flag, rollout, rollback, and DLQ/triage steps).
- [ ] Canary + auto-rollback policies configured; regression alerts subscribed.
- [ ] Issue closed after CI green, reviews approved, and docs linked.

## Delivery scaffolds per prompt
Use these implementation checklists to move from issue to shipping code with consistent architecture, feature-flag surfaces, and CI coverage. Each prompt uses **typed contracts only** and avoids shared databases; all logging must scrub PII.

### #65 Streaming Ingest Orchestrator (SIO)
- **Service layout**: `services/ingest-orchestrator/src/{routes,workers,domain,infra}`; Redis Streams client + Postgres persistence. Node 18 + TypeScript.
- **Feature flag**: `SIO_ENABLED` (boolean), surfaced via config map; default `false`. Guard API routes + workers; respond `404` when disabled.
- **Contracts**:
  - REST: POST `/runs` (start run from connector + offsets), GET `/runs/:id`, POST `/retry/:dlqId`, GET `/health/connectors`.
  - Events: `ingest.run.started|completed|failed|replayed` with provenance links + dedupe keys.
- **Core logic**: exactly-once via source offsets + sink dedupe keys; poison/DLQ queues; exponential backoff with jitter (base 500ms, max 2m, 7 attempts) and per-connector concurrency cap=4 (global=32). No PII in logs; tenant isolation per connector.
- **UI**: React 18 + jQuery overlays for live run console, DLQ triage, rate-limit knobs; subscribe to event stream.
- **Tests**: golden fixtures for idempotency; chaos (broker drop + retry storms); p95 enqueue→persist ≤400ms; contract/E2E coverage.

### #66 Fact-Bound Summarizer & Narrative Builder (NARRATOR)
- **Service layout**: `ai/narrator/app.py` (FastAPI) with pipeline modules for summarization, claims, citations, and contradiction detector hooks.
- **Feature flag**: `NARRATOR_ENABLED`; default `false`; 403 refusal if disabled.
- **Contracts**: POST `/narrate` accepting scope/time range/entities, returning `{summary, claims[], citations[]}`; export pipeline to Brief Studio (#13) manifest; deterministic seeded mode.
- **Constraints**: reject any free-text claim lacking citations; redaction-aware snippets; enforce LAC before publication.
- **UI**: “Narrate” panel with scope selector, claim table + citation chips, “fix missing proof” flow; deterministic toggle.
- **Tests**: snapshot fixtures; refusal when citations missing; p95 ≤1.2s for 50-claim briefs (cached); redaction + contradiction hooks validated.

### #67 Annotation & Active Learning Studio (AALS)
- **Service layout**: `apps/web/label-studio` (React+jQuery) for spans/relations/mentions; `ai/active-learning` (Python+Celery) for pool sampling + lightweight models.
- **Feature flag**: `AALS_ENABLED`; default `false`; UI hides and APIs 404 when disabled.
- **Contracts**: labeling APIs (CRUD labels, spans, relations), sampling endpoints, event `label.model.updated`; dataset export to `/ai/gnn-lab` queues.
- **Constraints**: no PII leaves tenant; labels versioned with rollback; inter-annotator agreement tracked.
- **UI**: keyboard-first labeling, relation drawing, suggestion trays; preload schemas (entities/relations/mentions, binary relevance quickstart); surface suggestions after ≥0.6 Cohen’s kappa or ≥70% agreement.
- **Tests**: agreement/stat tests; Playwright `label→train→suggest`; precision/recall bounds on fixtures; coverage of versioned rollback.

### #68 Zero-Trust Mesh & Identity-Bound mTLS (ZTM)
- **Service layout**: `platform/ztm/cmd` (Go) for control-plane, `platform/ztm/sidecar` for data-plane; KMS integration for CA keys.
- **Feature flag**: `ZTM_ENABLED`; default `false`; when off, sidecars refuse plaintext and gate enrollment.
- **Contracts**: SVID issuance/rotation APIs, policy-claim injectors, gateway adapters; attestation (node + workload) and cert hot-reload.
- **Defaults**: SPIRE-backed CA to start; cert TTL 24h, rotate at 12h; deny-by-default outbound; break-glass dual-control for CA ops.
- **Tests**: mTLS conformance, chaos drills (CA rotate, node drain), handshake p95 ≤50ms, policy claim coverage dashboards.

### #69 Content Disarm & Reconstruction Gateway (CDR)
- **Service layout**: `services/cdr-gateway` Python workers + manifest generator; inline verifier + preview UI (React+jQuery sliders for before/after).
- **Feature flag**: `CDR_ENABLED`; default `false`; upload endpoints disabled when off.
- **Contracts**: sanitize API returning sanitized copy + manifest; events `cdr.cleaned|cdr.blocked`; policy profiles (strict/standard/lenient) per tenant.
- **Defaults**: standard policy strips macros, flattens PDFs, re-encodes images; v1 file types: PDF, DOCX, XLSX, PPTX, PNG, JPEG, ZIP/TAR (safe-listed contents). Originals preserved.
- **Tests**: malicious corpus fixtures; false-negative bounds; throughput baselines; Playwright upload→sanitize→inspect.

### #70 Global Work Scheduler & Fair-Share Planner (GWSP)
- **Service layout**: `/ops/scheduler` (Go or Node) with priority queues, fair-share tokens, preemptible slots; adapters for Celery, K8s Jobs, custom workers.
- **Feature flag**: `GWSP_ENABLED`; default `false`; API returns disabled status when off.
- **Contracts**: POST `/submit`, GET `/queue`, POST `/preempt`, GET `/forecast`; enforcement of residency + budget; no PII in metadata.
- **Defaults**: priority taxonomy P0 critical, P1 high, P2 default, P3 background; preemption grace P0 none, P1 120s, P2 60s, P3 15s.
- **Tests**: simulated workloads, SLA adherence, fairness proofs, p95 submit→start ≤500ms, adapters validated.

### #71 Interop Exporters & Round-Trip Validator (IOX)
- **Service layout**: `services/interop` (Node/TS) exporters/importers, schema mappers, diff tool; CLI `iox export|import` batch + stream.
- **Feature flag**: `IOX_ENABLED`; default `false`; commands refuse execution when disabled.
- **Contracts**: STIX 2.1 + JSON-LD first; GraphML/CSV next. UI wizard with field maps, license tags, preview deltas. Signed manifests and policy filters; residency tagging.
- **Defaults**: acceptable drift ≤2% optional props; required props must round-trip intact.
- **Tests**: golden corpora; Playwright map→export→import→compare; contract validation; residency/LAC checks.

### #72 Auto-Postmortem & Continuous Improvement Engine (APCI)
- **Service layout**: `services/postmortem` (Node/TS) template engine, timeline extractor, root-cause drafts, action items with owners/SLAs; integrates NHAI (#53).
- **Feature flag**: `APCI_ENABLED`; default `false`; UI/API disabled unless on.
- **Contracts**: Generate→Edit→Publish flow; incident heatmaps; regression guardrails; quick-insert artifacts/citations (jQuery). Opens repo issues + tracks DORA-like metrics; redact sensitive data; dual-control for external sharing.
- **Defaults**: templates for ops incident + analytic miss; corrective action SLA default 30 days; urgent <7 days.
- **Tests**: golden postmortem fixtures; timeline accuracy checks; Playwright generate→approve→track actions; redaction + dual-control enforced.

## Notes on isolation and compliance
- **No shared databases**: each prompt uses its scoped data stores; cross-service communication only via typed APIs/events.
- **No PII in logs or exports**: enforce structured logging with redact filters; export paths respect residency and license constraints.
- **Tenant isolation**: connector isolation (#65), policy profiles per tenant (#69), residency-aware scheduling (#70), and per-tenant flag overrides where relevant.
- **Determinism & reproducibility**: seeded runs for NARRATOR (#66); repeatable fixtures for IOX (#71) and SIO (#65) idempotency.
- **Operational safety**: deny-by-default outbound for ZTM (#68); break-glass controls for CA keys; dual-control for sensitive publishing (#72).
