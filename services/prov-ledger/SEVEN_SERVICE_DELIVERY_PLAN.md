# Seven-Service Delivery Blueprint

This document outlines a production-grade delivery plan across the seven parallel workstreams described in the build brief. It is optimized for conflict-free merges, frozen contracts, and strict compliance with the repository governance standards.

## High-Level Goals
- Stand up independent services with frozen OpenAPI/contract artifacts under `contracts/v1/{service}`.
- Enforce event-only publication (`type={domain}.v1.*`) without cross-service subscriptions during this phase.
- Default all new features behind `FF_{SERVICE}_ENABLED` flags (off by default).
- Maintain deployable-first posture: every branch must be releasable and CI green.

## Architecture Overview
- **Isolation:** Unique namespaces, DB schemas, and Docker images per service. No shared tables.
- **Security:** OIDC/JWKS for auth; bearer tokens validated per request. Ed25519 signatures for provenance, PQ-ready formats for ZK-TX.
- **Observability:** OpenTelemetry traces + Prometheus metrics + structured JSON logs; CloudEvents emitted for mutations.
- **Testing:** Consumer-driven contract tests plus golden fixtures. Coverage goals: ≥95% for hash/chain logic (prov-ledger); 100% unsafe-op fixtures (policy-compiler); ≥95% syntactic validity (ai-copilot); deterministic overlap verification (zk-tx); mapping/quarantine correctness (ingestion); citation integrity (tri-pane explain); deterministic CRDT merge (expedition-kit).

## Workstream Blueprints

### 1) Provenance & Claim Ledger
- **APIs:** `POST /claims`, `POST /evidence`, `GET /manifest/{bundleId}` with Ed25519 signatures and SHA-256 digests.
- **Data Model:** Claims table (sourceUri, hash, type, confidence, licenseId, signature); Evidence table (artifactDigest, transformChain[]); Bundles store Merkle roots.
- **Outputs:** Tamper-evident manifests; CloudEvents `claims.v1.created`, `manifests.v1.emitted`.
- **Tooling:** CLI `plc bundle create …`; verifier lib capable of replaying golden bundle bit-for-bit.

### 2) License/Authority Compiler
- **APIs:** `/compile`, `/simulate`, `/explain` with deterministic bytecode and OPA adapter.
- **Artifacts:** Bytecode spec doc, golden policy pack, unsafe-op fixtures (must pass 100%).
- **Rules:** Deterministic diff simulator; explain returns rule hits + citations.

### 3) Connectors & ETL Assistant
- **APIs:** `/ingest/sessions`, `/ingest/{sessionId}/map`, `/stream` (NDJSON).
- **Enrichers:** GeoIP, language, hash/perceptual-hash, EXIF scrub, OCR stub. Emit only normalized records + lineage to Kafka `normalized.v1`.
- **DoD:** CSV→canonical mapping within 10 minutes on fixtures; quarantines poison samples with human-readable rationale.

### 4) NL→Graph Query & Graph-RAG
- **APIs:** `/nl2cypher`, `/sandbox/execute`, `/rag`.
- **Guardrails:** All answers require citations or return “missing citation”; sandbox read-only.
- **DoD:** ≥95% syntactic validity; published answers include resolvable citations.

### 5) Zero-Knowledge Trust Exchange
- **APIs:** `/proofs/overlap`, `/verify` for set/range proofs with PQ-ready keys.
- **Deliverables:** Circuits, verifier lib, CLI demo, security notes. Zero leakage on fixtures.

### 6) Tri-Pane UI + Explain-This-Decision
- **Routes:** `/cases/:id`, `/views/:id/explain` (React + Tailwind).
- **Behavior:** Synchronized map/timeline/graph brushing; Explain panel renders evidence maps & policy bindings; keyboard-first and AAA accessible.
- **DoD:** Time-to-COA reduced ≥30% on usability task; every paragraph opens an evidence map with zero uncited assertions.

### 7) Edge “Expedition Kit” (Offline/CRDT)
- **APIs:** `/edge/runbook`, `/edge/sync` with CRDT logs to `sync.v1` topic.
- **Behavior:** Offline manifest signer; deterministic merge visualizer; no central policy edits (consume policy-compiler snapshots).
- **DoD:** Disconnected runs produce verifiable receipts; merges deterministically with zero data loss.

## Delivery Mechanisms
- **Contracts:** Place OpenAPI/proto under `contracts/v1/{service}` without cross-service edits. Lock versions in CI.
- **CI/CD:** Extend existing `pr-quality-gate.yml` with service filters; run lint, fmt, typecheck, contract tests, coverage, and smoke. Enforce SCA and license checks.
- **Release:** Trunk-based branching; short-lived branches. Tag Docker images per service with commit SHA + semver. Supply rollback playbooks per service.
- **Observability:** Add OTEL exporters, Prometheus scrape configs, and alert rules for error rate, latency, and event emission failures per service.

## Risk Controls
- **Security:** No secrets in repo; enforce CORS/Helmet defaults; validate bearer tokens; sign manifests and proofs; PQ-ready key handling for ZK-TX.
- **Data Safety:** No PII decryption; no cross-tenant raw data exchange; quarantines for poison samples; sandbox execution only.
- **Governance:** Follow Constitution and Living Rulebook; maintain CODEOWNERS per service to reduce merge contention.

## Ready-to-Implement Checklist
- [ ] Feature flags created: `FF_PROV_LEDGER_ENABLED`, `FF_POLICY_COMPILER_ENABLED`, `FF_INGEST_ASSISTANT_ENABLED`, `FF_AI_COPILOT_ENABLED`, `FF_ZK_TX_ENABLED`, `FF_TRI_PANE_ENABLED`, `FF_EXPEDITION_KIT_ENABLED`.
- [ ] Contracts generated and version-pinned under `contracts/v1/*`.
- [ ] CI matrix jobs for lint, fmt, typecheck, unit, contract tests per service.
- [ ] Golden fixtures stored and referenced in contract tests.
- [ ] CloudEvents schemas validated; event emission smoke tests added.
- [ ] Security notes & threat models authored per service.
- [ ] Rollback procedures documented alongside deployment manifests.

## Forward-Looking Enhancements
- **Deterministic provenance proofs:** Consider integrating transparent log (Trillian-style) to anchor manifest Merkle roots.
- **Policy compilation acceleration:** Generate WebAssembly targets for bytecode to reduce OPA adapter overhead.
- **Edge sync resilience:** Add Delta CRDT compression for lower bandwidth during reconnection.
- **UX telemetry:** Add RUM with privacy-preserving sampling to measure time-to-COA and accessibility KPIs.
- **AI copilot quality:** Introduce property-based tests for prompt stability and cost-estimation sanity checks.

