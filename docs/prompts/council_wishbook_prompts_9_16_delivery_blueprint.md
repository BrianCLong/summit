# Council Wishbook Prompts #9–#16 — Delivery Blueprint

This blueprint expands prompts #9–#16 into an execution-ready plan that covers requirements (explicit + implied), design choices, implementation steps, test strategy, observability, and rollout guardrails. It assumes strict feature-flag isolation across ERIS, Temporal Engine, Analytics Kernel, GraphRAG, Case Spaces/Brief Studio, Offline Kit, API Surface, and DQ Dashboards, consistent with the meta prompt.

## 1) Requirements Expansion

### Explicit Requirements
- Preserve each stream’s missions, deliverables, constraints, DoD/CI gates, tuning defaults, and feature flags as written.
- Keep services isolated and couple only through typed APIs or events; no shared databases across streams.
- Ensure append-only logs, explicit manifests, and verifiable proofs across all artifacts.
- Maintain p95 latency ≤1.5s for standard graph queries; never log PII; apply redaction-aware handling.
- Run k6 smoke, Playwright E2E, and contract tests per PR with canary + auto-rollback.

### Implied Requirements (23rd-Order Expansion)
- **Policy determinism:** Decisions (merges, cost gating, ABAC, redaction) are replayable using signed policy snapshots and versioned ABAC rules; caches keyed by policy + snapshot digests.
- **Reproducibility by construction:** Every analytics/output payload echoes snapshot digest, seed, policy shard, and feature-flag state; SDKs/CLIs accept these inputs for reruns.
- **Minimal trust surfaces:** Detached signatures for webhooks, manifests, and offline bundles; offline-to-online reconciliation verifies hashes before ingest.
- **Safety defaults:** Features fail closed if manifests, proofs, or citations are missing; dual-control enforced for exports, merges, and policy overrides with time-bound validity.
- **Cost and backpressure hygiene:** Gateways/SDKs expose preflight cost estimates and typed backpressure hints; retries use bounded exponential backoff with jitter.
- **Redaction-first UX:** UI flows display redaction state and block exports/publication when coverage is incomplete; counter-evidence is mandatory for GraphRAG answers.
- **Observability parity:** Metrics/traces/logs tag feature flag, snapshot digest, policy shard, and tenant; SLO violations emit `slo.violation` events and trigger automatic rollback.
- **Drift and gap controls:** Temporal gap detectors emit DQ alerts; ER confidence decay schedules periodic re-review; caches evicted on policy/snapshot mismatch.
- **Acceptance packs:** Feature enablement is blocked until signed acceptance packs (fixtures, tolerance bands, manifests) are present and validated.
- **Zero data sharing leakage:** No PII in metrics/events; hashed IDs with per-tenant salts; manifests reference only pseudonymous handles.

### Non-Goals
- Altering base data models beyond required facets (e.g., adding new PII fields).
- Introducing cross-service database links or bypassing feature flags.
- Implementing biometric identification or irreversible merges.
- Relaxing dual-control or redaction requirements for speed.

## 2) Design

### Selected Design and Rationale
- **Isolation + manifest-first:** Each stream runs behind its feature flag with append-only manifests and detached signatures, avoiding shared persistence while retaining verifiability.
- **Digest-pinned execution:** All compute (analytics, GraphRAG, exports) pins to snapshot digests and policy shards to guarantee reproducibility and cache correctness.
- **Typed contracts + events:** Kafka events and GraphQL/REST APIs use versioned, typed schemas; SDKs consume persisted queries and surface cost/backpressure hints.
- **Fail-closed governance:** Publication, exports, merges, and syncs require proofs (citations, manifests, signatures) and dual-control where risk is elevated.

### Data Structures and Interfaces (representative)
- **SnapshotDescriptor:** `{ digest: string, observedAt: string, policyShardId: string, featureFlags: string[] }`.
- **ER Merge Event (`er.merged.v1`):** `{ entityId, mergedIds[], policyLabel, rationaleHash, override?: { userId, reason, signature }, snapshot: SnapshotDescriptor }`.
- **Temporal Gap Alert (`dq.gap.v1`):** `{ entityId, expectedCadence, lastObservedAt, snapshot: SnapshotDescriptor, riskBand }`.
- **GraphRAG Response:** `{ answer, paths: { supporting[], counter[] }, exhibits[], snapshot: SnapshotDescriptor, publicationReady: boolean }`.
- **Webhook Envelope:** Headers `X-Webhook-Signature: <algo>:<keyId>:<signature>`, body includes replay counter and snapshot digest.

### Control Flow and Integration Points
- ERIS emits advisory priors to Analytics Kernel; kernel only uses them when `ANALYTICS_KERNEL` and `ER_ENABLED` are on and the snapshot digest matches.
- Temporal Engine gap detector publishes `dq.gap` events; DQ dashboards annotate gaps and enforce steward acknowledgement.
- GraphRAG publication gate blocks outputs lacking supporting + counter paths and unresolved citations; integrates with manifest verifier from Brief Studio for exports.
- API Gateway attaches cost estimates and backpressure hints to responses; SDKs render preflight UI and propagate typed errors.
- Offline Kit sync reconciles CRDT bundles by verifying signatures and vector clocks; divergence reports sandbox conflicting edits until steward release.

## 3) Implementation Plan

### Step-by-Step Plan
1. Define shared descriptors (snapshot, policy shard, feature flag envelope) and event/webhook schemas with versioning and signatures.
2. Add service-level contracts: ERIS APIs, Temporal snapshot/gap APIs, Analytics kernel endpoints, GraphRAG retriever/publisher, Case/Brief exporters, Offline Kit sync, API GW persisted queries/webhooks, DQ jobs + dashboards.
3. Wire feature flags and fail-closed guards: refuse execution when manifests, citations, or acceptance packs are missing.
4. Implement observability and SLO rollback hooks emitting `slo.violation` and canary audit trails.
5. Codify test harnesses: golden fixtures, contract tests, E2E Playwright flows, k6 smoke, and conformance suites with tolerance bands.
6. Document operations: rollout/rollback, key rotation for webhooks, cache invalidation proofs, steward workflows, and acceptance pack handling.

### File-by-File Change Summary
- **docs/prompts/council_wishbook_prompts_9_16_delivery_blueprint.md** — New blueprint covering expanded requirements, design, interfaces, test/rollout plans, and reviewer checklist for prompts #9–#16.

## 4) Code

_No runtime code added yet; blueprint only._

## 5) Tests

### Test Plan
- **Golden fixtures:** Pin ERIS merges/splits and Temporal snapshots to reproducible datasets; store manifests with digests for replay.
- **Contract tests:** Validate Kafka event schemas (e.g., `er.merged.v1`, `dq.gap.v1`) and webhook signature headers; verify SDK error typing for backpressure and cost envelopes.
- **E2E Playwright:** Run flows for GraphRAG citation gating, Brief Studio export + manifest verification, Offline Kit divergence review, and Case Spaces dual-control approval.
- **Performance (k6):** Validate p95 ≤1.5s for standard graph queries and snapshot diffing; assert backpressure hints surface under load.
- **Conformance suites:** Analytics kernel tolerance bands (±3% centrality), snapshot-digest pinning, and policy shard partitioning.

### How to Run
- `npm test` for monorepo unit suites (server + client). Add `npm run test:e2e` for Playwright and `npm run test:k6` for k6 smoke once corresponding scripts are wired per service.

## 6) Documentation
- Keep this blueprint at `docs/prompts/council_wishbook_prompts_9_16_delivery_blueprint.md` and link it from team runbooks.
- Annotate service READMEs to reference shared descriptors (snapshot digest, policy shard, feature flags) and the acceptance-pack gate before enabling feature flags.

## 7) PR Package
- **PR Title:** Expand wishbook #9–#16 into a delivery blueprint
- **Description:** Adds a delivery blueprint that expands explicit and implied requirements, presents an isolation-first design with digest-pinned contracts, details implementation and test plans, and enumerates rollout and governance guardrails for prompts #9–#16.
- **Reviewer Checklist:**
  - Blueprint captures explicit + implied requirements and non-goals.
  - Interfaces cover snapshots, events, webhooks, citations, manifests, and feature flags.
  - Test and rollout plans include k6, Playwright, contract suites, and acceptance packs.
  - Governance constraints (redaction, dual-control, signatures, PII avoidance) are explicit and fail-closed.
- **Rollout/Migration Notes:** No runtime changes yet; use blueprint to sequence feature-flagged delivery with acceptance-pack gating and canary rollback hooks.
