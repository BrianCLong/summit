# Summit Evolution Roadmap (GA Acceleration Plan)

## Purpose

This roadmap converts Summit's architecture exploration into merge-safe, dependency-ordered
execution lanes that preserve Golden-Main stability while accelerating GA readiness.

## Readiness Anchor

This plan is aligned to the Summit Readiness Assertion and establishes a deterministic sequence:
identity integrity first, epistemic stability second, autonomous scaling third.

## Phase Plan (Merge-Safe)

| Phase | Capability | PR Count | Primary Dependency |
| --- | --- | ---: | --- |
| Phase 1 | Canonical Identity Spine | 4 PRs | IntelGraph schema |
| Phase 2 | Epistemic Truth Engine | 5 PRs | Evidence schema |
| Phase 3 | Source Credibility Engine | 3 PRs | Ingestion layer |
| Phase 4 | Autonomous Discovery Agents | 6 PRs | Agent framework |
| Phase 5 | Strategic Simulation Engine | 7 PRs | Graph stability |

## Phase Details

### Phase 1 — Canonical Identity Spine (4 PRs)

**Outcome:** All graph edges reference canonical entity IDs only.

1. `models/entities/canonical-entity.ts`
   - Canonical entity model (`canonicalId`, aliases, provenance, confidence)
2. `docs/intelgraph/canonical-identity.md`
   - Contract: canonical IDs are mandatory for edge creation
3. `services/identity-resolver/`
   - Deterministic entity resolution service and conflict policy
4. `analysis/entity-merge-engine/` + `metrics/entity-duplication-rate.json`
   - Merge engine and daily dedup KPI artifact

**Gate to Phase 2:** duplication rate trend stable and falling; no non-canonical edge writes.

### Phase 2 — Epistemic Truth Engine (5 PRs)

**Outcome:** Belief-state tracking prevents false-signal amplification.

Artifacts:
- `belief_state.json`
- `hypothesis_graph.json`
- `confidence_distribution.json`

Capabilities:
- Competing hypotheses
- Contradictory evidence handling
- Probabilistic confidence updates

**Gate to Phase 3:** contradictory evidence reconciles deterministically and confidence updates are calibrated.

### Phase 3 — Source Credibility Engine (3 PRs)

**Outcome:** Adversarial ingestion defenses are enforced before evidence elevation.

Artifacts:
- `source_profile.json`
- `credibility_score`
- `deception_flags`

Pipeline:
- `Switchboard -> SourceCredibility -> EvidenceHarvester`

Capabilities:
- Coordinated narrative detection
- Bot-network suspicion signals
- Deception-risk scoring

**Gate to Phase 4:** low-confidence/deceptive sources are quarantined by policy.

### Phase 4 — Autonomous Discovery Agents (6 PRs)

**Outcome:** Agents discover safely under validation and budget controls.

Required controls:
- Agent write validation against canonical IDs
- Evidence-budget enforcement for graph traversals
- Explainability artifacts (`reasoning_trace.json`, `decision_path.json`, `evidence_chain.json`)

**Gate to Phase 5:** autonomous writes are traceable, reversible, and bounded by policy.

### Phase 5 — Strategic Simulation Engine (7 PRs)

**Outcome:** Forecasting and scenario analysis operate on stable graph substrate.

Required controls:
- Deterministic simulation inputs
- Forecast calibration telemetry
- Rollback triggers for instability

**Exit:** decision intelligence outputs are stable, auditable, and operationally trusted.

## Stability Substrate (Highest-Impact Order)

1. Canonical Identity Spine
2. Epistemic Truth Engine
3. RepoOS Control Loop Telemetry
4. Source Credibility Engine
5. Graph Health Monitoring

This sequence intentionally constrains autonomy until graph integrity, epistemic control, and sensing
quality are measurable and enforceable.

## Operational Workstreams

### RepoOS Control Loop Telemetry

Implementation targets:
- `metrics/system-homeostasis/`
- `scripts/health/compute_graph_metrics.mjs`
- `system_homeostasis_report.json`

Daily metrics:
- `belief_entropy`
- `signal_noise_ratio`
- `entity_growth_rate`
- `relationship_density`
- `agent_pressure`
- `forecast_calibration_error`

### Graph Health Monitoring Service

Output:
- `graph_health_report.json`

Metrics:
- `entity_growth_rate`
- `relationship_density`
- `cluster_coherence`
- `confidence_drift`
- `signal_noise_ratio`

Automated remediations when thresholds breach:
- prune low-quality edges
- trigger entity merge pass
- pause discovery agents

### Intelligence Workflow OS

Lifecycle:
- Signal -> Investigation -> Hypothesis -> Evidence Validation -> Analyst Review -> Report

Core objects:
- `Investigation`
- `Task`
- `Agent`
- `Evidence`
- `ReviewState`
- `DecisionRecord`

Reference doc target:
- `docs/architecture/intelligence-workflow-os.md`

## Merge Strategy

- Keep one primary change zone per PR.
- Use dependency-ordered PR stacks with explicit rollback criteria.
- Require evidence artifacts for each phase gate before promotion.
- Block advancement if Golden Path regresses.

## Definition of Done (Roadmap Execution)

- Phase gates passed in order with evidence artifacts attached.
- Canonical-ID contract enforced on all edge writes.
- Epistemic and credibility engines live before autonomy expansion.
- Homeostasis and graph health telemetry active as daily controls.
- Strategic simulation reads only from validated graph state.
