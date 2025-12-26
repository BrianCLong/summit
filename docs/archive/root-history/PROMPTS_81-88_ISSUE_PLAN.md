# Prompts #81–#88 Packaging and Delivery Plan

This document captures ready-to-execute issue definitions and branch/CI guardrails for the eight feature-flagged initiatives (#81–#88). Each initiative is scoped to merge independently with full test coverage and preview environments.

## Global Delivery Principles
- **Isolation:** No shared runtime databases between prompts; operate on snapshots or read-only sources as specified.
- **Feature Flags:** Gate by prompt flag (`IPSA_ENABLED`, `CLAT_ENABLED`, `C3D_ENABLED`, `TDSC_ENABLED`, `ER_SOD_ENABLED`, `GDAST_ENABLED`, `OTR_ENABLED`, `ETTL_ENABLED`). Default off.
- **CI:** Jest/Vitest/Go/Jest, Playwright, and k6 where applicable; schema enforcement via SRE (#17); auto-rollback enabled; p95 targets ≤ 1.5s for typical reads.
- **Security/Privacy:** No PII in artifacts; redact literals in logs; synthetic tenants for security testing; read-only where mandated.
- **Branch Pattern:** `feat/<prompt-number>-<slug>` (e.g., `feat/81-ipsa-trace`); conventional commits required.

## Issue Templates (ready to open)

### #81 Influence Propagation & Source Attribution (IPSA)
- **Branch:** `feat/81-ipsa-analytics`
- **Scope:** /ai/ipsa Python 3.12 package with rumor-center/Jordan centrality kernels, cascade reconstruction, counterfactual node/edge removal, and snapshot-pinned read-only inputs.
- **APIs:** POST `/trace`, GET `/source/:id`, GET `/explain/:traceId` returning suspects, paths, and confidence with citations.
- **UI:** Propagation timeline with graph overlay, jQuery hover explainers, hypothesis comparison panel.
- **CI/DoD:** Golden cascades with known sources, tolerance bands, Playwright "select cluster → trace → compare". Flag: `IPSA_ENABLED`.
- **Tuning:** Decide default propagation window (hours vs days), max path depth, and candidate source count.

### #82 Cypher Lint & Auto-Tuner (CLAT)
- **Branch:** `feat/82-clat-lint`
- **Scope:** /services/clat (Node/TS) Cypher AST parser, lint rules (cartesian product, accidental scans, unbounded var-length), parameter guard, rewrite previews.
- **Integrations:** IDE hooks for NL→Cypher (#2) and Gateway (#15); planner comparison (#26); CI action blocking failing persisted queries unless justified.
- **Constraints:** Advisory only, read-only, no auto-DDL, logs redact literals.
- **CI/DoD:** Rule corpus tests, snapshot diffs for rewrites, k6 lint latency ≤50ms/query. Flag: `CLAT_ENABLED`.
- **Tuning:** Must-have rules for v1; composite index suggestion thresholds.

### #83 Coordinated Campaign & Synchrony Detector (C3D)
- **Branch:** `feat/83-c3d-detection`
- **Scope:** /ai/c3d (Python) detection of temporal synchrony, near-duplicate clusters, community drift; outputs clusters with scores and rationale paths.
- **UI:** Coordination radar with time-brushing, side-by-side cluster inspection, jQuery lasso selection.
- **Constraints:** No biometric content; explanations required; redaction-aware snippets only.
- **CI/DoD:** Synthetic brigade fixtures, precision/recall bounds, Playwright "flag → review → export evidence". Flag: `C3D_ENABLED`.
- **Tuning:** Synchrony window defaults; auto-escalation threshold to Risk (#18).

### #84 Temporal Deduplication & Sliding-Window Compactor (TDSC)
- **Branch:** `feat/84-tdsc-compaction`
- **Scope:** /services/tdsc (Node/TS + Redis) LSH + window compaction; exemplar retention; reversible manifests.
- **APIs:** POST `/compact?window=…`, GET `/exemplars/:key`, POST `/restore/:manifest`.
- **UI:** Before/After counters, cost savings estimates, jQuery diff expander.
- **Constraints:** Never discard originals; compaction is a view/materialization; provenance preserved; consult LAC.
- **CI/DoD:** Dedupe fixture accuracy, reversible restores, k6 throughput with p95 compact op ≤200ms/shard. Flag: `TDSC_ENABLED`.
- **Tuning:** Default windows per connector; exemplar policy (recent vs highest trust).

### #85 Entitlement Review & SoD Governance (ER-SoD)
- **Branch:** `feat/85-ersod-campaigns`
- **Scope:** /platform/entitlements (Node/TS + Postgres) campaigns, attestations, SoD rules, exception justifications; exports to Compliance Center (#64).
- **UI:** Reviewer queue, bulk attest/revoke, SoD conflict explainer, jQuery keyboard triage.
- **Events:** `entitlement.campaign.started|completed|exception.granted`; dual-control for exceptions; immutable audit; no secrets in notifications.
- **CI/DoD:** Campaign fixtures, SoD rule tests, Playwright "launch → attest → resolve conflicts → export proof". Flag: `ER_SOD_ENABLED`.
- **Tuning:** Campaign cadence (quarterly/biannual); initial SoD rulepacks (admin vs ombuds, prod vs audit).

### #86 Graph DAST & Fuzz Lab (G-DAST)
- **Branch:** `feat/86-gdast-fuzz`
- **Scope:** /security/gdast (Go or Node) fuzzers for GraphQL, Cypher params, file uploads; replayable attack traces; sanitizer regression tests.
- **Constraints:** Preview/test only; synthetic tenants; never exfiltrate payloads.
- **CI/DoD:** Baseline vuln corpus, coverage growth tracking, Playwright "preview → attack → assert denials". Flag: `GDAST_ENABLED`.
- **Tuning:** Priority vectors (N+1, overfetch, alias collisions); minimum security score to ship.

### #87 OTR Messaging & Ephemeral Notes (OTR-Notes)
- **Branch:** `feat/87-otr-notes`
- **Scope:** /services/otr (Go/Node) with double-ratchet E2EE, forward secrecy, sealed-sender; per-thread TTLs; message manifests (hash only); WebAuthn step-up.
- **UI:** Inline tri-pane chat, jQuery burn-after-read toggles, secure screenshot warnings.
- **Constraints:** No server-side plaintext; legal hold overrides TTLs with proof; export only metadata unless mutual consent.
- **CI/DoD:** Crypto test vectors, TTL/hold precedence tests, Playwright "start → burn → hold". Flag: `OTR_ENABLED`.
- **Tuning:** Default TTLs; consent model for exporting content.

### #88 External Timestamping & Transparency Log (ETTL)
- **Branch:** `feat/88-ettl-tslog`
- **Scope:** /services/tslog (Go) RFC-3161 TSA client, Sigstore-style transparency log (Merkle), inclusion proofs; CLI verifier.
- **Hooks:** Prov-Ledger (#1), Disclosure (#7), Audit (#41), LeakTrace (#48); UI badge with jQuery copy-proof buttons.
- **Constraints:** Hash-only content, offline verification supported, region-local TSAs via SRP (#42).
- **CI/DoD:** Inclusion/consistency proof tests, verifier round-trip, Playwright "export → anchor → verify". Flag: `ETTL_ENABLED`.
- **Tuning:** Preferred TSA/backends; anchoring cadence (immediate vs batch).

## Parallelization Map
- IPSA: Read-only analytics on snapshots; emits events only.
- CLAT: CI + gateway hooks; advisory.
- C3D: Read-only detection; emits flags; no schema coupling.
- TDSC: Materialized compacted views; reversible; no destructive edits.
- ER-SoD: Dedicated Postgres; exports to Compliance Center; dual-control exceptions.
- G-DAST: Preview-only; synthetic tenants.
- OTR-Notes: Edge crypto; short-lived metadata; Presence integration; no plaintext storage.
- ETTL: Append-only sidecar; hooks into manifest emitters; no shared DBs.

## Immediate Next Steps
1. Confirm tuning defaults per prompt (windows, depths, thresholds, cadences) with stakeholders.
2. Open issues using the branch patterns above; scaffold feature-flag toggles in configs with defaults off.
3. Wire CI gates: lint/test/Playwright/k6 per prompt; ensure PR templates capture justification for any lint overrides (CLAT).
4. Schedule preview environments per prompt; validate p95 latency and rollback signals before enabling flags.
