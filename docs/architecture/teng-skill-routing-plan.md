# TENG Skill Routing & Execution Plan (Evidence-First)

## Readiness anchor

This plan is aligned to the Summit Readiness Assertion and governed by the Constitution and
Meta-Governance framework as the authoritative sources of record.

## Purpose

Establish a governed, evidence-first routing and execution plan for the Time-Aware Evidence &
Narrative Graph (TENG) methodology integration. The intent is to translate the routed workstreams
into an ordered, deterministic delivery path with explicit governance hooks.

## Skill routing (manual fallback)

The summit-skill-router file is not present in this environment; routing is executed manually to
preserve continuity while remaining within governance constraints. Routing is intentionally
constrained until the skill is available.

### Workstream ownership

1. Architect: graph schema, canonical serialization, stable hashing, bitemporal fields.
2. Security: threat model, ABAC/tenant isolation, append-only audit hooks.
3. Evals: deterministic eval harness and evidence artifacts.
4. Ops: runbooks, replay tooling, SLOs, cost controls.
5. Product: decay-first review workflow, explainability requirements, governance UX.

## MAESTRO alignment

- MAESTRO Layers: Data, Agents, Tools, Observability, Security.
- Threats Considered: nondeterminism, provenance loss, tenant bleed, prompt/tool abuse.
- Mitigations: stable sort + hash, provenance schema requirements, ABAC enforcement, append-only
  audit log, deterministic replays, observability hooks for drift detection.

## Execution phases (deterministic order)

### Phase 0 — Preflight alignment (governance)

- Confirm authoritative definitions and authority files.
- Record readiness anchor and evidence standards.
- Establish deterministic evidence bundle structure.

### Phase 1 — PR1: Schema + Canonical Serialization

- Implement node/edge schema with bitemporal fields.
- Add canonical serialization and stable hashing.
- Emit evidence bundle: report/metrics/stamp.

### Phase 2 — PR2: Lifecycle Observability + Constraint Drift

- Implement lifecycle transitions and drift telemetry.
- Store constraint state with append-only logs.
- Emit synthetic drift replay evidence.

### Phase 3 — PR3: Credibility (Behavior-Over-Time)

- Implement narrative stamina, error-handling scoring, dependency independence.
- Add monotonicity checks and upstream provenance enforcement.

### Phase 4 — PR4: Robustness Engine

- Implement assumption knockout and degradation curves.
- Ensure deterministic knockouts and confidence downgrade invariants.

### Phase 5 — PR5: Responsible Decay + Governance Hooks

- Implement decay policy, residency tags enforcement, append-only audit.
- Add SBOM enforcement and compliance gates.

## Evidence-first outputs

- evidence/<EID>/report.json
- evidence/<EID>/metrics.json
- evidence/<EID>/stamp.json

## Determinism requirements

- Stable sort for canonical serialization.
- Deterministic seeds pinned per eval suite.
- Hash inputs captured in stamp artifacts.

## Dependencies

- Graph backend confirmation (Deferred pending platform inventory).
- Connector constraint telemetry inventory (Deferred pending connector audit).
- Assessment schema mutation model (Deferred pending schema review).

## Finality

This plan is authoritative for the TENG routing and execution sequence until superseded by the
summit-skill-router skill or a governance-approved revision.
