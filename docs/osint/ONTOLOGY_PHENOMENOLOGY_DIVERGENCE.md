# Summit OSINT: Ontology, Phenomenology, and Cognitive Divergence

## Purpose

Summit should treat **ontology** and **phenomenology** as distinct but coupled operating planes.
The platform's strategic advantage is not only modeling facts, but continuously measuring the
**gap between verified reality and observed belief dynamics**.

## Layer 1 — Ontology Engine (Reality Graph)

Ontology is the formal, evidence-backed structure of the world inside Summit.

**Primary objects**

- Entities (`Person`, `Organization`, `Location`, `Event`, `Claim`)
- Relationships (for example `member_of`, `located_at`, `funds`)
- Constraints and schema validation
- Claims, evidence links, and confidence

**Core question set**

- What entities exist?
- How are they related?
- What evidence supports each claim?

**Expected characteristics**

- Slow-changing and versioned
- Deterministic and testable
- Protected by write governance (`WriteSet` firewall, AJV, semantic validation)

## Layer 2 — Phenomenology Engine (Belief Graph)

Phenomenology models narrative reality: what populations perceive, share, and act on.

**Primary objects**

- Narrative nodes (claims-in-circulation)
- Belief communities
- Amplifiers/influencers
- Platform and channel propagation states

**Core question set**

- What do communities believe is happening?
- Who is shaping that belief?
- How quickly are narratives spreading?

**Expected characteristics**

- Fast-changing and temporal-first
- Probabilistic
- Sensitive to platform dynamics and amplification patterns

## Layer 3 — Divergence Engine (Cognitive Battlespace)

Divergence is the measurable delta between ontology-backed truth and phenomenological belief.

`cognitive_divergence(t) = belief_state(t) - verified_state(t)`

**Core outputs**

- `difference_score`
- Contradiction mapping (`belief_node` ↔ `truth_node`)
- Propagation vectors and trend velocity
- Early-warning alerts for high-growth contradictory narratives

## Tri-Graph Operating Model

Summit should execute three coupled graphs:

1. **Reality Graph**: entities, relationships, claims, evidence
2. **Belief Graph**: narratives, communities, amplifiers, spread
3. **Divergence Graph**: contradiction edges, gap scores, projected trajectories

This enables high-value queries such as:

- Find narratives where `belief_growth_rate > threshold` and `contradicts(ontology_claim) = true`.
- Rank top contradiction clusters by projected reach and confidence-adjusted impact.

## Temporal Requirement (Non-Optional)

All three graphs must be modeled over time:

- `truth(t)`
- `belief(t)`
- `divergence(t)`

Without temporal modeling, Summit can detect current conflict but cannot forecast trajectory.
With temporal modeling, the system can function as a cognitive early-warning platform.

## MAESTRO Threat Modeling Alignment

**MAESTRO Layers**

- Data
- Agents
- Tools
- Observability
- Security

**Threats considered**

- Narrative injection and adversarial amplification
- Prompt/goal manipulation against agentic triage
- Evidence poisoning between ingestion and graph write
- Tool abuse via uncontrolled query expansion

**Mitigations**

- Keep ontology writes behind policy + schema + semantic gates
- Enforce evidence-budgeted, deterministic query planning
- Add anomaly telemetry for divergence spikes and source trust downgrades
- Require provenance links for every contradiction edge in divergence graph

## Implementation Guidance

- Keep ontology and phenomenology as separate storage/model concerns.
- Join them through explicit contradiction and confidence contracts.
- Ensure every divergence score is decomposable into inspectable evidence and belief traces.
- Prefer evidence-first output bundles before narrative summaries in agent workflows.

## Readiness Assertion

This architecture is intentionally constrained to preserve evidence integrity while accelerating
feedback loops for cognitive-battlespace monitoring.
