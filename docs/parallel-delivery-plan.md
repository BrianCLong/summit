# Parallel Delivery Plan for Feature Suites

This document outlines architecture, delivery, and validation for eight service-bounded feature streams requested for Summit/IntelGraph. Each stream is additive, feature-flagged, and designed for clean merges with contract and schema safety.

## High-Level Delivery Principles

- **Feature flags:** `provLedger.enabled`, `lac.enforced`, `copilotNLQ.enabled`, `licenseRegistry.enabled`, `cases.enabled`, `reports.enabled`, `zktx.enabled`, `edgeKit.enabled` default **off**; enable in stage for canary.
- **Safety:** Idempotent APIs, back-compatible schemas, additive GraphQL namespaces, and read-only sim/diff paths before enforcement.
- **Observability:** OTEL tracing, Prom metrics, structured logs with correlation IDs; trace sampling tuned per service.
- **Security:** OIDC + RBAC/ABAC, OPA policy bundles, audit trail with reason-for-access, signed artifacts, step-up WebAuthn for admin/exports.
- **Testing Gates:** Unit ≥90% coverage (95% for ledger), Pact contract tests for REST/gRPC, GraphQL schema diff checks, k6 perf smoke, mutation tests on critical evaluators.
- **Rollout:** Ephemeral preview env per PR → canary 10%/50%/100% with auto-rollback. Golden fixtures maintained for provenance, policy corpus, NLQ prompts, CSV mapping, ZK overlap partners, and edge sync divergence.

## Service Blueprints

### 1) Prov-Ledger (GA)

- **Scope:** Claim/evidence ingestion (`POST /ledger/evidence`, `/ledger/claim`), manifest export (`GET /ledger/export/:caseId`), Kafka topic `etl.claims`, GraphQL namespace `Prov_*`.
- **Data:** Postgres for manifests, object store for artifacts, Neo4j IDs only, contradiction graph maintained.
- **Internals:** Hash-tree builder (Merkle), transform chain log, signature pipeline (HSM-backed), contradiction detection, disclosure bundle builder; OpenTelemetry spans around ingest and export.
- **Verification:** External CLI replays manifests against fixtures; manifests include transform chain + proofs.

### 2) License/Authority Compiler (LAC)

- **Scope:** DSL→WASM compiler, decision logs, deny reasons; GraphQL directive `@requiresAuthority` (additive).
- **APIs:** `POST /lac/compile`, `POST /lac/simulate`, OPA bundle output; feature flag `lac.enforced`.
- **Guarantees:** 100% policy hit-rate on corpus, immutable audit events, diff simulator for policy changes.

### 3) NL→Cypher Copilot (Sandboxed)

- **Scope:** NL prompt→plan→Cypher generator with cost/row estimates, sandboxed execution with rollback, result explainer, side-by-side diff vs manual queries.
- **APIs:** `POST /copilot/plan`, `POST /copilot/execute?sandbox=true`; UI preview behind `copilotNLQ.enabled`.
- **Quality:** ≥95% syntactic validity on prompt suite; full tracing and redaction compliance.

### 4) Ingest Wizard + Data License Registry

- **Scope:** AI-assisted CSV/JSON mapping UI, PII classification, DPIA checklist, redaction presets; license registry enforcing TOS at query/export via `onBeforeExport` hook.
- **Interfaces:** `/ingest/wizard/*`, `/licenses/*`; feature flag `licenseRegistry.enabled`.
- **Outcomes:** Map CSV→canonical within 10 minutes; blocked exports show clause/owner/override workflow; lineage recorded.

### 5) Case Spaces + Report Studio + Disclosure Packager

- **Scope:** Case roles/tasks/SLA with four-eyes, Report Studio (timeline/map/graph figures), Disclosure Packager emitting bundles tied to provenance manifests.
- **GraphQL:** Namespaces `Case_*`, `Report_*`, `Disclosure_*`; flags `cases.enabled`, `reports.enabled`.
- **Definition of done:** Immutable audit, one-click report, exports validate through manifest verifier.

### 6) Zero-Knowledge Trust Exchange + Federation Planner

- **Scope:** ZK set/range/overlap proofs for cross-tenant deconfliction; federation planner with pushdown filters returning claims + proofs.
- **APIs:** `POST /zktx/proof`, `POST /federation/query`; guardian flag `zktx.enabled`.
- **Guarantees:** Overlap demos with zero leakage; planner meets latency SLO with signed salts/HSM entropy.

### 7) Ops Pack (SLOs, Cost Guard, OTEL/Prom, Chaos)

- **Scope:** Shared metrics/tracing lib, Cost Guard (budgeter + slow-query killer + cold tiering), Grafana dashboards, chaos drills with automated runbooks.
- **Packaging:** Delivered via `@intelgraph/ops`; opt-in, infra-only; CI perf smoke required.
- **Outcomes:** p95 SLO dashboards live, chaos checklist green, autoscaling policies documented.

### 8) Offline/Edge Expedition Kit

- **Scope:** Local tri-pane analyst console, CRDT merges, conflict resolution UI, signed sync logs, deterministic replay on reconnect.
- **APIs:** `edge://sync`, `POST /edge/merge`, `GET /edge/divergence`; flag `edgeKit.enabled`.
- **Definition of done:** 72-hr offline test, signed logs, deterministic replay yields identical outputs.

## Cross-Cutting Implementation Map

- **Contracts:** OpenAPI for REST, versioned GraphQL namespaces; Pact for clients; gRPC for ledger/verifier where applicable.
- **Data Models:** Postgres migrations per service; Neo4j for graph IDs; object storage for artifacts; CRDT storage for edge kit.
- **Security:** OIDC/JWT, ABAC/RBAC via OPA bundles, license enforcement hooks, step-up WebAuthn for sensitive actions; signed manifests and sync logs.
- **Observability:** OTEL exporters standardized; Prom metrics with dashboards; structured logs with correlation IDs; k6 perf smoke profiles per service.
- **CI/CD:** Schema-diff checks, API contract tests, SBOM/license scans, mutation tests on evaluators, k6 smoke, canary strategy scripted; ephemeral env per PR.

## Risk & Mitigation Highlights

- **Contradiction in ledger:** automated graph consistency checks; manual override workflow.
- **Policy regressions:** diff simulator and immutable audit log; guardrails to prevent unsafe operations in WASM.
- **NLQ sandbox escape:** strict read-only execution, rollback-by-default, cost/row estimation gate.
- **Edge replay divergence:** deterministic ordering with signed logs and CRDT conflict-resolution policies.

## Forward-Looking Enhancements

- Adaptive caching for manifest verification and policy compile results (content-addressed, privacy-preserving).
- LLM-grounded NLQ guardrails using structured EBNF sampling for improved safety.
- Autonomous chaos injectors tied to live SLO drift detection to preempt incidents.
