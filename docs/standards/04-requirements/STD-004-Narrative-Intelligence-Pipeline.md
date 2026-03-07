# STD-004: Narrative Intelligence Pipeline (NIP)

**Identifier**: STD-004
**Title**: Narrative Intelligence Pipeline (NIP)
**Author**: Jules (Deep Spec Writer & Standards Author)
**Status**: ACTIVE
**Version**: 1.0.0
**Last Updated**: 2026-02-07

## 1. Purpose

Define the authoritative schema, metrics, state machine, evidence outputs, and CI-style tests for
narrative intelligence within Summit/IntelGraph. This standard establishes deterministic, auditable
patterns for narrative inference without collapsing observed artifacts into inferred claims.

## 2. Scope

This standard applies to:
- Narrative graph schema extensions (nodes + edges).
- Narrative state machine transitions and required signals.
- Deterministic metrics and tests for narrative resilience, seeding, handoff, and compression.
- Evidence bundles, provenance receipts, and SOC-style controls.
- CI gates for narrative analysis pipelines and outputs.

## 3. Definitions

- **Narrative**: A coherent storyline over time (not a topic).
- **Frame**: The interpretive angle or attribution applied to a narrative.
- **Claim**: An explicit assertion that is verifiable or falsifiable.
- **Assumption**: An unstated premise required for narrative coherence.
- **Artifact**: Observed content item (post/article/video/transcript).
- **Actor**: Account, organization, or outlet producing artifacts.
- **Community**: Graph-derived audience cluster or diffusion cohort.
- **Event**: Exogenous trigger (real-world or media event).
- **Handoff**: Transition of narrative into a higher credibility tier.
- **Governed Exception**: A documented legacy bypass treated as policy-bound and auditable.

## 4. The Standard

### 4.1 Schema Requirements

#### 4.1.1 Required Entities
The narrative graph MUST include the following node types:
- Narrative
- Frame
- Claim
- Assumption
- Artifact
- Actor
- Community
- Event
- Handoff

#### 4.1.2 Required Edges
The narrative graph MUST support these directed edges:
- (Artifact)-[:EXPRESSES]->(Frame)
- (Frame)-[:SUPPORTED_BY]->(Assumption)
- (Artifact)-[:MAKES]->(Claim)
- (Actor)-[:PUBLISHED]->(Artifact)
- (Community)-[:AMPLIFIED]->(Artifact)
- (Narrative)-[:COMPOSED_OF]->(Frame)
- (Narrative)-[:TRIGGERED_BY]->(Event)
- (Narrative)-[:HANDOFF_TO]->(Tier|Community|Outlet)
- (Claim)-[:DISPUTED_BY]->(Evidence|CounterClaim)
- (Assumption)-[:BROKEN_BY]->(Evidence|Counterfactual)

#### 4.1.3 Deterministic Separation
Pipelines MUST preserve a strict separation between:
- **Observed**: Artifact nodes and their raw content hashes.
- **Inferred**: Claim/Assumption/Frame nodes with confidence and provenance.

Collapsing artifact text directly into claims is prohibited.

### 4.2 Narrative State Machine

Narratives MUST be stateful and follow explicit transitions:

Seeded → Contested → Normalized → Institutionalized
OR
Seeded → Contested → Normalized → Exhausted → Dormant → Reactivated

#### 4.2.1 Transition Signals
- **Seeded → Contested**: rebuttals begin, high quote-tweet ratio, cross-community exposure.
- **Contested → Normalized**: shorthand increases, explanations drop, fewer links required.
- **Normalized → Institutionalized**: appears in semi-legitimate outlets or policy discourse.
- **Normalized → Exhausted**: shift from persuasion to cynicism/fatigue.
- **Dormant → Reactivated**: event similarity + assumption reuse + abrupt frame reappearance.

Transition logic MUST be deterministic and stored with evidence metadata.

### 4.3 Metrics & Scores

#### 4.3.1 Narrative Resilience Score
Measures survival of a narrative after refutation.
- Signal: assumption-set embedding stability across time windows.
- Signal: claim rotation while assumptions remain stable.

#### 4.3.2 Seeding Density Index
Detects “many small origins” patterns.
- Signal: distinct originators within Δt.
- Signal: low connectivity among originators at t0.
- Signal: later convergence into shared channels.

#### 4.3.3 Handoff Detection Score
Flags migration into higher credibility tiers.
- Signal: register shift (informal → technical/legalistic).
- Signal: increased hedging (“may”, “suggests”, “raising questions”).
- Signal: circular or low-quality citations with tier jump.

#### 4.3.4 Narrative Compression Ratio
Indicates internalization within a community.
- Signal: median artifact length drops.
- Signal: implied references rise.
- Signal: fewer external links.

### 4.4 CI-Style Tests

Pipelines MUST implement deterministic tests producing evidence bundles:

1. **Assumption Breakpoint Test**
   - Output: assumption_id, break_probability, fallback_assumptions.
2. **Mutation Test**
   - Output: stable core phrases/assumptions + replaceable components.
3. **Handoff Test**
   - Output: handoff_event with provenance links.
4. **Counter-Absorption Test**
   - Output: absorbed rebuttal fragments + reframed variants.

### 4.5 Deterministic Evidence Outputs

Pipelines MUST emit deterministic artifacts without timestamps in file paths. Time is stored in run
metadata (stamp.json). Required paths:

- narratives/<narrative_id>/assumptions.json
- narratives/<narrative_id>/frames.json
- narratives/<narrative_id>/state_transitions.json
- tests/<run_id>/results.json (content-hash keyed)

### 4.6 Provenance Receipts

Each inferred node MUST include:
- Source artifact IDs (content hashes)
- Inference model/version
- Confidence and rationale template ID
- Transformation chain (tokenization → embedding → clustering → extraction)

### 4.7 Governance Controls

1. **Inference Traceability**: Reject pipeline output if any inferred node lacks provenance edges.
2. **Tier Handoff Monitoring**: Daily deterministic list of handoff candidates.
3. **Resilience Escalation**: High resilience enters enhanced monitoring.
4. **Assumption Stability Drift**: Similarity to prior narrative triggers reactivation flag.

### 4.8 MAESTRO Security Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: Goal manipulation, prompt injection, tool abuse, provenance spoofing,
  and evidence erasure.
- **Mitigations**: Deterministic outputs, content-hash provenance receipts, evidence-first gates,
  and traceable transition metadata.

### 4.9 Authority Alignment

All artifacts MUST align with the Summit Readiness Assertion and governance authorities. The
Summit Readiness Assertion is the top-level readiness reference for narrative pipelines.

### 4.10 Reference Implementation Artifacts

The following machine-readable artifacts are normative companions to this standard:

- `docs/standards/04-requirements/nip/node-edge-schema.v1.json`
- `docs/standards/04-requirements/nip/state-machine.v1.json`
- `docs/standards/04-requirements/nip/metric-formulas.v1.yaml`
- `docs/standards/04-requirements/nip/ci-gates.v1.yaml`
- `docs/standards/04-requirements/nip/evidence-bundle.schema.json`

Implementations MUST validate pipeline inputs and outputs against these artifacts (or approved
successor versions).

### 4.11 Pipeline Architecture (Deterministic Control Plane)

```mermaid
flowchart LR
  A[Collectors] --> B[Normalizer]
  B --> C[Artifact Hashing]
  C --> D[Claim/Assumption/Frame Extractor]
  D --> E[Graph Writer]
  E --> F[State Machine Evaluator]
  F --> G[Metric Engine]
  G --> H[CI Narrative Tests]
  H --> I[Evidence Bundle Generator]
  I --> J[Governance Gates]
```

#### 4.11.1 Stage Contracts
- **Collectors** MUST emit immutable artifact payloads with source and retrieval metadata.
- **Normalizer** MUST canonicalize language, platform metadata, and deduplicate by content hash.
- **Extractor** MUST emit inferred nodes with confidence, rationale template, and transformation
  chain provenance.
- **Graph Writer** MUST preserve separation of observed vs inferred entities.
- **Evaluator/Metric Engine** MUST use deterministic rounding and fail-closed behavior for missing
  required signals.
- **Evidence Generator** MUST emit deterministic file paths and hash-indexed manifests.

### 4.12 Gate Threshold Baseline

The initial policy thresholds are:

- `narrative_resilience_score >= 0.72` -> Enhanced monitoring.
- `seeding_density_index >= 0.75` -> Seeding alert.
- `handoff_detection_score >= 0.70` -> Handoff event declaration.
- `narrative_compression_ratio >= 0.80` -> Institutionalization risk signal.

Thresholds MAY be tuned only via governed policy updates that preserve historical comparability and
include migration notes.

### 4.13 CI for Narratives

NIP CI MUST run nightly and on-demand for incident analysis. Required checks:

1. Schema validation gate
2. State machine transition gate
3. Metric recomputation gate
4. Assumption breakpoint test
5. Mutation test
6. Handoff test
7. Counter-absorption test
8. Provenance completeness gate
9. Deterministic artifact naming gate

If any gate fails, the run state is **blocked** and no new narrative state is published to
downstream consumers.

### 4.14 Forward-Leaning Enhancement (Policy-Safe)

Implementers SHOULD adopt a two-layer scoring strategy:

- **Base deterministic layer**: fixed formulas defined in `metric-formulas.v1.yaml`.
- **Adaptive calibration layer**: drift-aware percentile calibration over rolling windows, stored as
  policy data under governed change control.

This architecture improves robustness against adversarial adaptation while preserving auditability.


## 5. Invariants

- Observed artifacts and inferred claims remain separate entities.
- Every inference has provenance receipts.
- State transitions are deterministic and auditable.
- Evidence outputs are timestamp-free in filenames.
- Governed Exceptions are explicitly logged, not implied.

## 6. Examples

### 6.1 Correct Usage
- An Artifact node links to a Claim via :MAKES and to a Frame via :EXPRESSES.
- A Narrative enters Normalized state only after deterministic transition signals are met.

### 6.2 Anti-Patterns
- Storing claims as raw artifact text.
- Emitting outputs with timestamps in file paths.
- Missing provenance edges for inferred assumptions.

## 7. Lifecycle

- Updates require a standards PR with version bump.
- Deprecations must specify a migration path and sunset date.
- Governed Exceptions must be reviewed quarterly.
