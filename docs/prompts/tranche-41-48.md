# Prompts #41–#48: High-Impact Feature Blueprints

This tranche introduces eight feature-flagged, event-coupled initiatives designed to ship independently under full CI. Each
section spells out scope, data boundaries, events, acceptance criteria, and decision levers so teams can execute without
backchannel context.

## Prompt #41 — Audit Correlator & Forensics Timeline (ACF)

- **Mission:** Correlate traces, logs, and webhook receipts into tamper-evident, case-scoped forensic timelines with chain-of-custody proofs.
- **Scope & Data Boundaries:**
  - Build signed event DAGs from OTEL traces, app logs, and webhook receipts; include only hashes + metadata with redact reasons.
  - Append-only store; dual-control required for any redaction of audit entries; no raw payload PII retained.
- **Deliverables:**
  - `/services/audit-correlator` (Node 18 + TypeScript) with Merkle-tree hashbooks per case, manifest export, and CLI verifier.
  - React UI (with jQuery overlays) for session heatmap, jump-to-evidence, “why is this here?” explainer, and provenance badges.
  - Event emissions: `audit.timeline.updated` and `audit.proof.emitted` with pointers to manifest rows.
- **Acceptance & Performance:**
  - Golden audit fixtures; verifier round-trip; Playwright “reconstruct session” flow; p95 timeline query ≤ 300ms on 95th percentile case size; feature flag `ACF_ENABLED`.
  - Chain-of-custody report must render hash lineage and signing principals per hop.
- **Open Decisions:** Required retention defaults for audit artifacts? Correlation grain: trace span vs. logical action vs. user-initiated session boundary?

## Prompt #42 — Sovereignty Router & Partitioning (SRP)

- **Mission:** Enforce regional data residency and tenant isolation with policy-driven routing and cross-region federation.
- **Scope & Data Boundaries:**
  - Region policy DSL governs reads/writes for GraphQL/Cypher; cross-region PII blocked unless policy allows; KMS per region.
  - Fail-closed routing with jurisdiction context tagged on every query to LAC.
- **Deliverables:**
  - `/platform/sovereignty-router` (Go or Node) with cross-region read replicas, “don’t-go” lists, and placement attestations.
  - Placement engine for shard/partition planning and signed residency attestations.
  - Admin UI for residency matrix, policy simulator, and cross-region latency estimator.
- **Acceptance & Resilience:**
  - Residency simulation tests; chaos drill for region loss with automatic fail-closed; conformance proofs emitted on placement; feature flag `SRP_ENABLED`.
  - Router must surface explicit denial reasons for blocked routes and log policy IDs (no payload PII).
- **Open Decisions:** Initial supported regions and default fallback behavior? Partitioning strategy (hash by tenant vs. by case)?

## Prompt #43 — Field Capture PWA & Safe Uploads (FC-PWA)

- **Mission:** Mobile/PWA for field teams to capture photo/audio/notes with on-device redaction preview and offline manifests.
- **Scope & Data Boundaries:**
  - Capture, redact, tag, GPS/timebox; offline vault with CRDT notes; signed capture manifests stored locally until sync.
  - Store redacted previews only; no biometric identification; no auto-upload by default; WebAuthn step-up before export; location fuzzing controls.
- **Deliverables:**
  - `/apps/pwa/field` (React + Service Worker; jQuery camera overlays) with on-device OCR/ASR (light models) and redaction rectangles prior to upload.
  - Sync agent to Disclosure/Prov-Ledger (#1/#7) with retry/backoff and conflict markers for CRDT merges.
- **Acceptance & Offline Guarantees:**
  - Air-gapped smoke tests; E2E “capture→redact→sync→verify”; Lighthouse ≥ 90 for installable PWA; feature flag `FC_PWA_ENABLED`.
  - Export manifest must include device time, GPS (fuzzed per policy), redaction rationale, and signer identity.
- **Open Decisions:** Minimum viable offline set (photo+audio vs. include notes)? Default location fuzz radius and floor for low-precision devices?

## Prompt #44 — Ontology & Vocabulary Studio (OVS)

- **Mission:** Manage types/properties/synonyms/taxonomies and map external vocabularies (e.g., ATT&CK, STIX) to IntelGraph schema—versioned and explainable.
- **Scope & Data Boundaries:**
  - SKOS-like model with synonym sets, deprecations, mapping packs, and GraphQL SDL emitters; provenance captured for every mapping.
  - No breaking changes without migration plans; rollbackable versions with audit trail connected to Schema Registry (#17).
- **Deliverables:**
  - `/services/ontology` (Node/TS + Postgres) with change-impact reports and signed mapping bundles.
  - Studio UI (term finder, synonym editor, mapping tester) using jQuery micro-interactions for inline edits and provenance callouts.
  - Events: `ontology.version.published`, `ontology.map.changed`.
- **Acceptance & Governance:**
  - Golden mapping packs; diff/impact tests; Playwright “propose→review→publish→rollback”; feature flag `OVS_ENABLED`.
  - Must surface dependency breaks in downstream schemas and require explicit approval for deprecations.
- **Open Decisions:** Which external vocabularies to preload? Policy for auto-accepting non-breaking synonyms and how to mark disputed mappings?

## Prompt #45 — Multilingual & Transliteration Layer (I18N/TL)

- **Mission:** Provide end-to-end language detection, transliteration (Arabic, Cyrillic, CJK), diacritic-insensitive search, and full UI localization with RTL support.
- **Scope & Data Boundaries:**
  - `/services/i18n` (Python 3.12 + FastAPI) exposes language ID, script detection, transliteration, and normalization APIs; originals never overwritten and license tags propagated.
  - Store normalized forms separately; add jQuery helpers for input normalization; preserve script metadata for explainers.
- **Deliverables:**
  - Client libraries with ICU pluralization, RTL layouts, and message bundles; search hooks (#34) for cross-script matching.
- **Acceptance & Latency:**
  - Precision/recall fixtures for transliteration search; UI RTL acceptance; latency p95 ≤ 80ms for normalize/lookup; feature flag `I18N_ENABLED`.
  - Normalization pipeline must return explainers indicating applied transforms and transliteration scheme.
- **Open Decisions:** Initial locales to ship? Preferred transliteration schemes (ALA-LC vs. ISO 9 vs. Pinyin) and fallback rules per script?

## Prompt #46 — Live Subscriptions & Push Updates (SUBS)

- **Mission:** Deliver reliable GraphQL subscriptions for live updates (graph deltas, case events, audit alerts) with cost/backpressure controls.
- **Scope & Data Boundaries:**
  - `/services/subscriptions` (Node + WebSocket/SSE) with topic fan-out, replay cursors, at-least-once delivery, and per-tenant backpressure/rate caps.
  - Presence channels must exclude payload PII; payload filters enforce LAC/license; slow consumers isolated; kill-switch per tenant.
- **Deliverables:**
  - Gateway adapters, persisted subscription queries with planner hashes (#26), and UI glue for live toasts, “blink & fade” highlights, pause/resume, and jQuery DOM hooks.
- **Acceptance & Scale:**
  - Multi-client Playwright tests; soak at 50k concurrent connections; recovery after disconnect; p95 sub-delivery ≤ 200ms; feature flag `SUBS_ENABLED`.
  - Replay cursors must be monotonic and exportable for audit replay.
- **Open Decisions:** Default replay window length? Preferred transport default (WS vs. SSE) and throttle caps per tenant tier?

## Prompt #47 — Hypothesis Sandbox & Counterfactual Lab (HSCL)

- **Mission:** Allow analysts to run “what-if” simulations by toggling proposed facts/edges in an ephemeral branch to see analytic impacts, proof debt, and risk deltas without prod writes.
- **Scope & Data Boundaries:**
  - `/services/hypothesis-lab` (Node/TS) runs ephemeral branches via GBDM (#25); read-only to prod; auto-GC idle scenarios.
  - No exports without provenance reasoning; scenario manifests carry toggle history and proof-debt scoring factors.
- **Deliverables:**
  - Costed diffs, risk deltas via #18, rule re-eval via #28, and proof debt scorecards; UI with toggle panel, sensitivity spider chart, revert-all, and jQuery overlays.
  - Export of snapshot manifests for peer review with reproducible seeds.
- **Acceptance & Determinism:**
  - Deterministic deltas on fixtures; Playwright “create→toggle→compare→share”; p95 scenario init ≤ 400ms; feature flag `HSCL_ENABLED`.
  - Branch lifecycle must log creation/GC triggers and enforce TTL caps.
- **Open Decisions:** Default TTL for ephemeral scenarios? Metrics for sensitivity chart (centrality, path count, risk) and scoring weights per metric?

## Prompt #48 — Watermarking & Canary Tokens (LeakTrace)

- **Mission:** Embed robust per-audience watermarks in exports and issue canary identifiers to trace leaks; verify suspect artifacts.
- **Scope & Data Boundaries:**
  - `/services/leaktrace` (Python + workers) handles PDF/image watermarking (visible + invisible), CSV canary fields, and hash beacons; originals never modified—only exports.
  - Per-audience seeds sourced from KMS (#27); revocation cascades to verifier deny-list.
- **Deliverables:**
  - Export hooks for Brief Studio/Disclosure (#13/#7), manifest records of watermark seeds, and verifier APIs for uploads.
  - UI with audience selector, watermark preview, and jQuery per-page intensity sliders; explainers for strength profiles.
- **Acceptance & Robustness:**
  - Robustness tests (recompress, crop, re-print-scan); document false-positive/negative thresholds; Playwright “export→verify→revoke”; feature flag `LEAKTRACE_ENABLED`.
  - Verifier must return traceability trail (audience seed, generation time, export manifest) without exposing secret seeds.
- **Open Decisions:** Default watermark strength profiles (press/court/partner)? CSV canary fields acceptable per audience and masking rules for high-sensitivity exports?

## Parallelization Map

- #41 ACF reads telemetry and emits proofs—no shared DB; safe with all others.
- #42 SRP is a routing layer with gateway-only integration; policy-driven and additive.
- #43 FC-PWA runs at the edge with manifest-based sync; offline-first and decoupled.
- #44 OVS coordinates with Schema Registry (#17) via typed APIs and has isolated storage.
- #45 I18N is a sidecar service with adapters for search; integration via hooks only.
- #46 SUBS is push-only with persisted queries and backpressure isolation.
- #47 HSCL uses ephemeral branches from GBDM (#25) and read-only analytics.
- #48 LeakTrace is export-time only with Disclosure/Brief hooks; no runtime coupling.

## Meta-Prompt

“Implement exactly to the acceptance criteria above, hide behind the specified feature flag, depend on other teams only via typed APIs/events, and ship with unit + contract + E2E tests and golden fixtures. Use React 18 + jQuery for DOM glue on the client, Node/Apollo/Express on the gateway, Neo4j/Postgres/Redis on data, and never log PII. Each PR spins a preview environment, enforces schema via SRE (#17), runs Jest/Playwright/k6, supports canary + auto-rollback, and targets p95 ≤ 1.5s for typical reads.”

## Delivery Response (Structured to 7th-Order Expansion)

### 1) Requirements Expansion

- **Explicit requirements:**
  - Ship eight feature-flagged capabilities (#41–#48) with independent deployability, typed interfaces, events, and UI hooks; each must meet its listed missions, deliverables, constraints, and DoD/CI gates with preview environments and no PII logging.
  - Provide verifiable provenance (hashbooks, manifests, attestations) and strict data boundaries (append-only audit, residency-aware routing, normalized i18n storage, export-only watermarking) with failure-safe behaviors (fail-closed routing, kill-switches, offline-first safety).
  - Maintain performance envelopes (e.g., ≤300 ms timeline queries, ≤80 ms i18n normalization, ≤200 ms subscription delivery, ≤400 ms HSCL init) and deterministic reproducibility (golden fixtures, monotonic cursors, repeatable deltas).
- **Implied requirements (deep expansion):**
  - **Security & compliance:** Default-deny posture for PII transit, dual-control redaction, per-region KMS, attested manifests, and license-aware payload filters; redact reasons and provenance must survive exports and replays.
  - **Resilience & recovery:** Replayable event streams with cursor/export support, chaos-ready routing for region loss, offline capture vaults with CRDT conflict hints, GC/TTL enforcement for ephemeral scenarios, and verifier deny-lists on revocation.
  - **Observability & auditability:** Structured, PII-free logs; trace/span IDs propagated across router/subscriptions; metrics for p95/p99 latency, delivery/backpressure, cache hit rates, and GC/TTL actions; Merkle proofs and residency attestations must be inspectable via CLI/manifest exports.
  - **DX & safety:** Typed SDKs/adapters, contract tests, schema validation (SDL emitters, planner hashes), feature-flag guards, seeded fixtures, and migration-safe rollouts with canary + auto-rollback; clear denial reasons and explainers for users (e.g., normalization transforms, routing blocks, watermark strength).
  - **Performance & capacity:** Bounded storage/indexing strategies (append-only audit indices, partition planning, normalized text stores, replay windows), backpressure for slow consumers, lightweight on-device models, and deterministic caching rules (e.g., transliteration cache keyed by locale+scheme).
  - **Interoperability:** Events and manifests compatible with downstream services (#1, #7, #17, #18, #25, #26, #28, #34) via typed APIs; no shared DBs; export/import paths documented with schema versions.
- **Non-goals:**
  - Changing upstream schema registries or base auth; rewriting unrelated services; persisting raw PII/payloads; speculative ML beyond listed light OCR/ASR; altering existing routing outside feature flags; bypassing CI/test gates or performance targets.

### 2) Design

- **Selected design and rationale:**
  - Use service-per-feature isolation with feature flags gating runtime paths and events. Favor append-only, manifest-driven provenance (Merkle hashbooks, residency attestations, snapshot manifests) to enable replay, proofs, and offline/edge operation while minimizing coupling.
- **Data structures and interfaces:**
  - **Provenance artifacts:** Merkle DAG nodes for audit correlator, residency attestation records, watermark seed manifests, HSCL scenario manifests with toggle history, replay cursors with monotonic sequence IDs.
  - **APIs/events:** Typed GraphQL/REST endpoints per service; event topics as specified (`audit.timeline.updated`, `audit.proof.emitted`, `ontology.version.published`, etc.); CLI/manifest verifiers for proofs and residency attestations; client bundles for i18n and subscription adapters.
  - **Feature-flag controls:** `ACF_ENABLED`, `SRP_ENABLED`, `FC_PWA_ENABLED`, `OVS_ENABLED`, `I18N_ENABLED`, `SUBS_ENABLED`, `HSCL_ENABLED`, `LEAKTRACE_ENABLED` guarding server handlers, UI components, and workers.
- **Control flow and integration points:**
  - **ACF:** Ingest OTEL/log/webhook metadata → normalize → build signed DAG → emit proofs/timeline events → UI heatmap/why-here overlays. Dual-control redaction writes redact records only.
  - **SRP:** Evaluate policy DSL + residency matrix → tag queries with jurisdiction → route/fail-closed; emit placement attestations; admin simulator for policies/latency.
  - **FC-PWA:** Capture → on-device OCR/ASR and redaction preview → sign manifest → offline vault (CRDT) → sync agent to Disclosure/Prov-Ledger with retry/backoff.
  - **OVS:** Manage SKOS-like vocab, synonyms, mappings → emit GraphQL SDL → publish events and change-impact reports → rollback support.
  - **I18N:** Detect language/script → normalize/transliterate with explainers → store normalized forms separately → provide client helpers and search hooks.
  - **SUBS:** Persisted subscription queries with planner hashes → fan-out via WS/SSE with backpressure → replay cursors/export → UI live toasts/highlights with pause/resume.
  - **HSCL:** Spin ephemeral branches via GBDM → apply toggles → compute costed diffs/risk deltas/proof debt → export snapshot manifest → enforce TTL/GC.
  - **LeakTrace:** Generate watermarked exports (PDF/image/CSV) with per-audience seeds → log manifests → verifier API for uploads → deny-list on revocation.

### 3) Implementation Plan

- Land iterative commits (docs, schema/contracts, service scaffolds, UI glue, fixtures/tests, CLIs/verifiers) per feature flag, preserving zero-downtime.
- Wire event schemas and manifest formats; add typed SDK stubs for router, i18n, subscriptions, and provenance verifiers.
- Implement guard rails: feature flags, policy DSL validation, backpressure thresholds, TTL/GC settings, and denial explainers.
- Add fixtures and golden datasets (audit timelines, mappings, transliteration search corpora, watermark robustness set, subscription replay logs, HSCL scenarios).
- Expand CI to run unit + contract + Playwright + k6 slices where applicable; enforce coverage and performance budgets.

### 4) Code

- This blueprint supplements implementation by specifying the cross-service interfaces, flags, manifests, and control flows required for production readiness; code generation and scaffolds must align to these structures when built.

### 5) Tests

- **Test plan:** Unit (hashbook/Merkle integrity, policy parsing, normalization transforms), contract (event schemas, manifest verifiers, planner hashes), integration/E2E (Playwright flows per prompt, offline/online sync, replay cursors), performance (p95 targets, soak at 50k conns), robustness (watermark recompress/crop/re-scan, chaos drills for region loss).
- **Execution:** Standard commands per service (`npm test`, `npm run test:e2e`, `pytest`, `k6 run`), with seeded fixtures and deterministic expectations; replay/export verifiers must round-trip proofs.

### 6) Documentation

- Keep this file as the authoritative tranche blueprint; add service-level READMEs (ingest contracts, policy DSL grammar, normalization schemes, replay cursor semantics, watermark strength profiles) and operator runbooks (dual-control redaction, residency simulator, GC/TTL tuning, deny-list propagation).

### 7) PR Package

- **Title:** “Expand tranche #41–#48 blueprint to full implementation guide.”
- **Description:** Summarizes requirements expansion, chosen design, implementation plan, test strategy, docs expectations, and rollout safety for all eight feature-flagged initiatives.
- **Reviewer checklist:** Feature flags present; manifests/proofs defined; policy/normalization/GC rules explicit; denial explainers and PII guards in place; fixtures deterministic; performance budgets stated; rollback/canary paths documented.
- **Rollout notes:** Deploy behind flags, run contract + Playwright suites, validate proofs/verifiers against golden fixtures, and stage canary + auto-rollback with monitoring on latency, error rates, and backpressure metrics.
