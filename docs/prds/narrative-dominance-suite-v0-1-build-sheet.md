# Narrative Dominance Suite (NDS) v0.1 Build Sheet

## Purpose and posture

NDS v0.1 converts the Narrative Dominance Suite PRD into an executable, Summit-native build sheet with clear repo targets, agent templates, data model primitives, governance rails, and patent-claim draft language. This plan is intentionally constrained to a single, auditable delivery slice and references the Summit Readiness Assertion to preempt readiness scrutiny. See `docs/SUMMIT_READINESS_ASSERTION.md` for absolute readiness alignment.

## Scope boundaries (v0.1)

- **Primary zone:** `docs/` (this specification) with implementation targets spanning `packages/`, `apps/`, and `server/` in future sprints.
- **Non-goals:** no direct runtime deployment, no external data ingestion beyond existing OSINT connectors, no policy bypasses.

## Repo targets (implementation map)

**Core data & governance**
- `packages/knowledge-graph/`: NOG schema, lifecycle state machine, propagation tensors, deterministic query patterns.
- `packages/prov-ledger/`: provenance signing, policy decision records, audit trails for interventions.
- `packages/policy/`: policy-as-code for governor agent constraints (OPA-style).
- `packages/common-types/`: shared NOG and agent contract types.

**Orchestration & agents**
- `packages/maestro-conductor/`: multi-agent control loop orchestration, scheduling, and telemetry.
- `packages/workflow-diff-engine/`: scenario diffing and counterfactual comparison outputs.
- `packages/graphai/` or `packages/graphai`-adjacent: graph-aware ML scoring primitives.

**API + UX surfaces**
- `server/`: narrative radar API, simulation endpoints, governance decisions feed.
- `apps/web/`: narrative radar UI, graph explorer, simulator, governance console.

## v0.1 deliverables

### 1) Narrative Operating Graph (NOG) core
- **Graph entities**: Narrative, NarrativeStage, NarrativeMutation, Actor, Channel, Event, Asset, Outcome.
- **Lifecycle state machine**: seed → propagate → peak → mutate → decline.
- **Propagation tensors**: cross-channel propagation edges with `observed_at`, `geo`, `language`, `medium`, and `weight`.
- **Determinism**: all narrative query paths MUST include `ORDER BY` and `LIMIT`.

### 2) Multi-agent control loop (templates)

**Scout Agent**
- Inputs: OSINT feeds, anomaly triggers, prior seeds.
- Outputs: candidate seeds + evidence bundle references.

**Cartographer Agent**
- Inputs: seeds + entities.
- Outputs: NOG updates (nodes/edges), lifecycle stage tags, mutation detection.

**Forecaster Agent**
- Inputs: NOG slice + historical trajectories.
- Outputs: forecast curves, inflection points, risk score distributions.

**Strategist Agent**
- Inputs: objectives + constraints + forecasts.
- Outputs: candidate interventions + predicted impacts.

**Governor Agent**
- Inputs: interventions + policies + provenance.
- Outputs: allow/deny decisions, rationale, evidence pointers.

### 3) Counterfactual Simulator
- Takes Strategist interventions + NOG snapshot.
- Produces side-by-side trajectories, risk deltas, and uncertainty intervals.
- Emits governance decision records alongside scenario artifacts.

### 4) Governance & provenance rail
- Every intervention must carry: policy decision, provenance signature, jurisdictional flags.
- Evidence bundle structure aligned to `prov-ledger` + audit requirements.

## Core NOG data model (v0.1 draft)

```yaml
Narrative:
  id: string
  title: string
  summary: string
  lifecycle_stage: enum[seed, propagate, peak, mutate, decline]
  created_at: datetime
  updated_at: datetime

NarrativeStage:
  id: string
  narrative_id: string
  stage: enum
  observed_at: datetime
  evidence_refs: [string]

NarrativeMutation:
  id: string
  narrative_id: string
  parent_narrative_id: string
  mutation_type: enum[frame_shift, actor_shift, channel_shift, language_shift]
  detected_at: datetime

Actor:
  id: string
  type: enum[person, org, bot, channel]
  attributes: map

Channel:
  id: string
  medium: enum[social, news, broadcast, forum, chat, filing]
  platform: string

Event:
  id: string
  event_type: string
  occurred_at: datetime
  geo: string

Asset:
  id: string
  asset_type: enum[text, image, video, audio, link]
  uri: string

Outcome:
  id: string
  kpi: string
  value: number
  observed_at: datetime

Edges:
  PROPAGATES_TO: Narrative -> Channel
  AMPLIFIED_BY: Narrative -> Actor
  CAUSED_BY: Narrative -> Event
  REFERENCES: Narrative -> Asset
  IMPACTS: Narrative -> Outcome
  MUTATES_TO: Narrative -> Narrative
```

## MAESTRO alignment (required)

- **MAESTRO Layers:** Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection into agent inputs; adversarial narrative poisoning; data exfiltration via provenance trails; tool abuse in agent orchestration.
- **Mitigations:** policy-as-code gating in Governor Agent; deterministic query constraints; provenance signatures for all actions; telemetry and audit hooks for every agent decision.

## Evidence-first instrumentation (v0.1)

- All agent outputs must include evidence bundle references before narrative summaries.
- Evidence is stored in `prov-ledger` with immutable hashes and replayable lineage.

## Draft claim set (v0.1, counsel-ready)

1. **Narrative Operating Graph lifecycle encoding**
   - A method for constructing and updating a multi-layer narrative graph that encodes narrative lifecycles, mutations, actor coalitions, and cross-channel propagation with deterministically ordered, bounded queries.

2. **Governed multi-agent narrative control loop**
   - A system wherein specialized agents (collection, mapping, forecasting, intervention design, governance) operate under a shared policy and provenance layer, producing auditable, explainable narrative operations.

3. **Counterfactual narrative simulation with governance constraints**
   - A simulation engine that accepts candidate interventions and produces probabilistic narrative trajectories, while enforcing policy constraints and producing decision records tied to provenance signatures.

4. **Narrative-to-risk integration**
   - A method for mapping narrative states and forecasts to enterprise risk indicators (financial, operational, cyber), including causal/treatment-effect estimations for intervention outcomes.

## Delivery checklist (v0.1)

- [ ] NOG schema draft landed in `packages/knowledge-graph/`.
- [ ] Agent templates scaffolded with typed contracts in `packages/common-types/`.
- [ ] Governor policy scaffolds in `packages/policy/` and decision record in `packages/prov-ledger/`.
- [ ] Narrative Radar API stub in `server/` with deterministic query enforcement.
- [ ] Narrative Radar UI stub in `apps/web/`.

## Rollback posture

If any NOG schema or agent template changes introduce risk to integrity or governance, revert to prior schema versions and disable agent execution while preserving prov-ledger records for audit continuity.
