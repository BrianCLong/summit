# Temporal Claims Intelligence (TCI) Skill Routing Plan

## Summit Readiness Assertion (Escalation)
This plan is anchored to the Summit Readiness Assertion and is scoped as a clean-room,
requirements-first routing artifact to protect governance, determinism, and evidence integrity
from the outset. All downstream artifacts must align with the authoritative definitions and
standards in `docs/SUMMIT_READINESS_ASSERTION.md` and the governance corpus.  

## Scope
This document routes the supplied methodology memo into Summit’s governed execution lanes,
translating it into a deterministic, evidence-first PR stack. It does **not** reuse any external
text verbatim and is intentionally constrained to clean-room specifications.

## OSINT Separation of Sensing & Reasoning
**Sensing (Evidence):**
- Methodology memo received as a requirements seed and treated as unlicensed ideas-only input.
- Claims are mapped to product and architecture capabilities without reuse of phrasing.

**Reasoning (Judgment):**
- The memo is integrated as a high-signal requirements seed for a Temporal Claims Intelligence
  (TCI) feature set that is graph-native, governed, and deterministically replayable.

## MAESTRO Threat Modeling Alignment
**MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.  
**Threats Considered:** goal manipulation, prompt injection, tool abuse, privacy overreach,
poisoning, and inference laundering.  
**Mitigations:** policy-as-code gates, evidence budgeting, determinism enforcement, provenance
sealing, ACLs on sensitive edges, and monitoring for mutation storms.

## Skill Routing (Manual Equivalent to Summit Skill Router)
The following lanes correspond to the requested sub-agent prompts and are executed in sequence:

1. **Architect Lane**
   - Deliverable: schema + service boundaries + determinism/replayability contracts.
   - Files: `docs/architecture/tci-schema.md`, `docs/architecture/tci-interfaces.md`,
     `docs/architecture/tci-determinism.md`.

2. **Security Lane**
   - Deliverable: threat model + controls + GA gates + data handling.
   - Files: `docs/security/tci-threat-model.md`, `docs/security/data-handling.md`,
     `docs/security/tci-security-gates.md`.

3. **Evals Lane**
   - Deliverable: deterministic benchmark plan, metrics schema, and CI thresholds.
   - Files: `docs/evals/tci-benchmarks.md`, `docs/evals/tci-metrics-schema.md`,
     `docs/evals/tci-ci-gates.md`.

4. **Ops Lane**
   - Deliverable: runbooks, dashboards, backfill + offline mode checklists.
   - Files: `docs/ops/tci-runbooks.md`, `docs/ops/tci-dashboards.md`,
     `docs/ops/tci-backfill.md`.

5. **Product Lane**
   - Deliverable: GA product spec, workflows, UI surfaces, and policy controls.
   - Files: `docs/product/tci-ga-spec.md`, `docs/product/tci-workflows.md`,
     `docs/product/tci-policy-controls.md`.

## PR Stack (Evidence-First, Deterministic)
All PRs must emit evidence artifacts and conform to Evidence ID conventions. Each PR must include:
- `artifacts/evidence/report.json`
- `artifacts/evidence/metrics.json`
- `artifacts/evidence/stamp.json`

**Sequenced PRs (Phase 1):**
1. **PR1 — Schema + Provenance Primitives**
   - Add graph schema objects for Artifact, Observation, LifecycleEvent, ClaimNode/Edge,
     ConstraintSnapshot, GovernanceState with `valid_from/valid_to`.
   - Gate: schema migration and roundtrip serialization.

2. **PR2 — Constraint Drift Ledger**
   - Implement drift detection logic with deterministic fixtures.
   - Gate: monotonic drift scoring test.

3. **PR3 — Lifecycle Event Deriver**
   - Rules-first derivation with deterministic snapshot tests.
   - Gate: lifecycle event coverage + determinism.

4. **PR4 — Dependency/Upstream Provenance**
   - False corroboration detection and dependency scoring.
   - Gate: FIB regression suite.

5. **PR5 — Credibility Behavior Over Time**
   - Stamina + correction handling with determinism tests.
   - Gate: scorer determinism + calibration checks.

6. **PR6 — Freshness Weighting + Responsible Decay**
   - Governance half-life + authority decay policies.
   - Gate: authority monotonicity constraints.

7. **PR7 — Assumption Stress-Testing + Graceful Degradation**
   - Premise ablation tests + degradation reporting.
   - Gate: runtime budget + determinism.

## Determinism & Replayability Requirements
- Fixed seeds and stable ordering for all scoring pipelines.
- Policy-versioned scoring outputs: `(inputs, policy_version, scorer_version)`.
- Offline/air-gapped support: no hidden online calls.

## Evidence & Governance Commitments
- Evidence-first artifacts are mandatory for each PR.
- Governance exceptions must be logged as **Governed Exceptions**.
- Every decision is reversible with an explicit rollback path.

## End State
This routing plan is complete and closed. Execution proceeds through the five lanes with the PR
stack above, and all artifacts align with Summit’s readiness, governance, and determinism
requirements.
