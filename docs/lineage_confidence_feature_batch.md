# Backend Feature Batch: Lineage UI Contract, Confidence Propagation, Exhibit Numbering, Policy Diff/Impact, Tenant Isolation, Ops Console, Locator Canonicalization

## Objectives

Consolidated backend specifications for eight independent, feature-flagged capabilities. Each section provides:

- Contract and data model
- Flag and security posture
- Determinism and audit expectations
- Test surface (fixtures/snapshots)

### 1) Lineage Visualization Primitives Contract

- **Endpoint**: `GET /lineage/graph?entityId=&fieldPath=&collapse=`
- **Flag**: `LINEAGE_UI_CONTRACT=true`
- **Behavior**: returns `nodes[]`, `edges[]`, optional `layoutHints`. Stable deterministic ordering with stable node IDs. `collapse` accepts `evidence|transforms` to group nodes; groups emit `collapsed: true` with child references. Read-only; no mutations.
- **Shapes**:
  - `Node`: `{ id, type, label, badges: { confidence, trust, quality }, severity, groupId?, collapsed?, children? }`
  - `Edge`: `{ id, source, target, relationship, transform?: { op, inputs, outputs } }`
  - `layoutHints`: `{ groups: [{ id, label, type, order }], tiers?: ["evidence","transform","claim","entity"] }`
- **Determinism**: sort by `type` tier then `label`, ties by `id`. Stable hashing via `stableId(entityId, fieldPath, type)`.
- **Tests**: golden graph fixtures per entity/field path; collapse variants; snapshot for layout grouping.

### 2) Confidence Propagation Engine

- **Package**: `packages/confidence/`
- **Endpoint**: `GET /claims/:id/confidence`
- **Flag**: `CONFIDENCE_PROP=true`
- **Model**: deterministic scoring function combining evidence trust, corroboration (+), conflicts (-), recency decay. Returns overall confidence plus contribution breakdown and audit trail of factors.
- **Explainability**: `factors[]` with `weight`, `score`, `reason`, `evidenceRefs`. Sum of factor contributions equals overall (within epsilon).
- **Tests**: fixtures: no evidence (defaults), corroborated claim, conflicting evidence, stale evidence with decay; verify sums.

### 3) Evidence Numbering Standard

- **Endpoint**: `GET /cases/:id/exhibits`; override: `POST /cases/:id/exhibits/override`
- **Flag**: `EXHIBIT_NUMBERS=true`
- **Ordering**: stable sort by `createdAt`, `fileHash`, `title` fallback; deterministic numbering starting at 1. Overrides are append-only with audit trail (actor, reason, timestamp) and do not mutate history.
- **Output**: `{ evidenceId, exhibitNumber, label, override?: { by, reason, at } }[]`
- **Tests**: seeded evidence yields stable numbering across runs; override persists and reflected in subsequent GET.

### 4) Policy Diff Visualizer Backend

- **Endpoint**: `GET /ops/policy/diff?from=&to=` (admin)
- **Flag**: `POLICY_DIFF=true`
- **Function**: canonicalize bundles (sorted roles/permissions/rules) then diff; return added/removed roles/permissions, changed rules keyed by reason codes/endpoints, breaking-change flags, and impact preview of regression fixtures that would fail.
- **Tests**: fixture policies with snapshot diff; breaking flag logic validation.

### 5) Tenant Disaster Isolation Mode

- **Endpoint**: `POST /ops/tenants/:id/isolate { mode: "none"|"limited"|"quarantine" }`
- **Flag**: `TENANT_ISOLATION=true`
- **Behavior**: hooks single tenant into backpressure/quota middleware to block write-heavy ops, restrict exports, and limit concurrency. Emits audit + incident records on isolate/unisolate. Clear error envelopes with reason codes.
- **Tests**: integration with two tenants verifying isolated tenant blocked while control tenant unaffected; audit entries written.

### 6) In-Product Ops Console API

- **Endpoint**: `GET /ops/console/summary`
- **Flag**: `OPS_CONSOLE=true`
- **Behavior**: admin-only aggregator composing existing status providers (degrade mode, rollout status, DLQ counts, integrity scan, connector health, policy version). Uses short TTL cache; fields always present (null-safe when subsystems absent).
- **Tests**: integration with mocked subsystem adapters; ensure cache hits and null-safe defaults.

### 7) Evidence Locator Normalization + Canonicalization

- **Package**: `packages/locator`
- **Flag**: `LOCATOR_CANON=true`
- **Functions**: `canonicalize(locator)` normalizes URL (strip tracking params, lowercase host), page indices (standard base), text offsets, timestamps; returns normalized object + canonical string. `compare(a,b)` checks equivalence via canonical form. Strict validation errors with reason codes on ambiguity.
- **Tests**: golden fixtures verifying identical canonicalization across variants; validation errors for ambiguous locators.

### 8) Admin Policy Impact Simulation

- **Endpoint**: `POST /ops/policy/impact` with `{ candidatePolicyBundle }`
- **Flag**: `POLICY_IMPACT=true`
- **Behavior**: admin-only, time-bounded simulation re-running policy regression fixtures under candidate bundle; returns changed decisions count, top endpoints impacted, sample diffs with reason codes (redacted payloads). Deterministic ordering of results.
- **Tests**: fixture candidate bundle producing known diffs; asserts counts and sample outputs.

## Cross-Cutting Guardrails

- All endpoints are read-first (no state changes except exhibit overrides & isolation mode which audit). No UI work included.
- Feature flags gate behavior; default is no-op/disabled.
- Determinism: stable ordering, stable hashing, canonicalization, snapshot-friendly outputs.
- Security: admin-only routes where noted; rely on existing authz middleware.
- Observability: emit structured audit/incident events via existing event bus.

## Implementation Notes

- Use existing express router patterns; prefer `packages/` utilities for hashing/sorting.
- Keep exports untouched; new services should be injected via DI where present.
- Snapshot fixtures live alongside new packages under `__fixtures__` with golden JSON outputs.
- Do not introduce DB migrations; leverage existing models (evidence, claims, tenants).

## Testing Strategy

- Add Jest tests for packages and route handlers with fixtures.
- Snapshot outputs for deterministic contracts (graph, diff, numbering, canonicalization, simulations).
- Integration tests for isolation and ops console with mocked adapters.

## Forward-Looking Enhancements

- Add streaming mode for large lineage graphs.
- Incremental confidence recomputation using event sourcing.
- Policy diff visual overlays once UI enables new contract.
- Rate-aware isolation thresholds driven by SLO breaches.
