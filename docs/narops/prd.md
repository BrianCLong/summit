# NarrativeOps Product Requirements (GA)

## Summit Readiness Assertion
Product scope and gates are aligned to the Summit Readiness Assertion (`docs/SUMMIT_READINESS_ASSERTION.md`).

## Personas
- **Analyst**: clusters narratives and assigns frame/strategy labels.
- **Investigator**: validates actor networks and impact signals.
- **Policy Reviewer**: audits governance labels and approvals.

## Workflow (Evidence-First)
1. Ingest → canonicalize
2. Cluster → `NarrativeCluster`
3. Frame/Trope extraction → `NarrativeFrame`
4. Network & community detection → `Community`, `Actor`
5. Strategy mapping → `InfluenceStrategy`
6. Impact scoring → `ImpactSignal`
7. Governance labeling → `GovernanceLabel`
8. Evidence pack → `report.json`, `metrics.json`, `stamp.json`

## Acceptance Criteria (GA)
- Determinism gate: identical inputs produce identical hashes.
- Schema gate: artifacts validate against `narops-schemas`.
- Evidence gate: `evidence/<EID>/` has required files and provenance.
- At least one eval + one regression test per PR.
- Security checklist and threat model completed.

## MVP Scope
- Deterministic pipeline with evidence pack output.
- Narrative clustering and frame extraction.
- Basic community detection and actor features.
- Strategy taxonomy baseline mapping.
- Governance label scaffolding.

## GA Scope
- Impact scoring with calibration metrics.
- CDNP portability benchmark.
- Counterfactual testing for actor/community ablations.
- Policy-aware analyst workflows and audit logs.

## Differentiators
- **Provenance Ledger**: signed evidence chain for every label.
- **Counterfactual Testing**: narrative persistence without key actors.
- **Policy-Aware Workflows**: governance labels gate analyst actions.
- **CDNP KPI**: cross-domain narrative portability score.

## Non-Goals
- Real-time streaming inference (Intentionally constrained for deterministic GA).
- Unbounded graph traversals (disallowed by Evidence Budgeting).

## KPI & SLAs
- Evidence gate pass rate ≥ 99%.
- Determinism drift count = 0 per release.
- CDNP portability score within defined threshold.
