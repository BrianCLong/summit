# Graph Schema Extension Spec: Hybrid Influence + Infrastructure Risk

## Purpose

This specification defines a governed schema extension for Summit's GraphRAG platform to model:

- provenance-weighted intelligence ingestion,
- relationship-operation detection,
- hybrid physical/cyber overlays, and
- capability migration across collaborating threat ecosystems.

The design goal is deterministic, auditable analysis with explicit uncertainty boundaries.

## Scope

Primary schema additions are constrained to one zone (`docs/`) and intended to drive phased implementation in `packages/knowledge-graph`, ingestion pipelines, and policy gates.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection via contaminated sources, graph poisoning, attribution spoofing, confidence inflation, relationship-op social engineering.
- **Mitigations**: provenance-first scoring, deterministic edge constraints, policy checks for evidence budgets, audit-stamped confidence fields.

## Canonical Node Types

### 1) `SourceArtifact`
Represents an ingestible evidence unit.

Required properties:

- `artifact_id: string` (stable UUID)
- `source_type: enum(primary|advisory|vendor|blog|social|synthetic_likely)`
- `published_at: datetime`
- `ingested_at: datetime`
- `citation_depth: int` (>= 0)
- `cross_source_corroboration: float` (0.0-1.0)
- `synthetic_probability: float` (0.0-1.0)
- `lineage_hash: string` (content lineage digest)
- `jurisdiction: string`

### 2) `Narrative`
Represents a claim frame tracked across media and entities.

Required properties:

- `narrative_id: string`
- `first_seen_at: datetime`
- `bot_density_score: float` (0.0-1.0)
- `media_tier_propagation: enum(tier1|tier2|tier3|long_tail)`
- `llm_contamination_likelihood: float` (0.0-1.0)
- `status: enum(emerging|accelerating|plateau|degrading)`

### 3) `PropertyAsset`
Physical real-estate object with proximity-sensitive risk context.

Required properties:

- `asset_id: string`
- `asset_type: enum(residential|commercial|industrial|mixed_use)`
- `geo_point: point`
- `country_code: string`
- `distance_to_critical_infra_m: int`
- `ownership_opacity_score: float` (0.0-1.0)

### 4) `ToolingCluster`
Capability bundle observed across multiple actors.

Required properties:

- `cluster_id: string`
- `cluster_label: string`
- `first_observed_at: datetime`
- `last_observed_at: datetime`
- `migration_risk_score: float` (0.0-1.0)

### 5) `RelationshipSequence`
A bounded sequence describing multi-channel trust-building or process-bypass behavior.

Required properties:

- `sequence_id: string`
- `target_org_id: string`
- `start_at: datetime`
- `end_at: datetime`
- `channel_hop_count: int`
- `escalation_velocity_score: float` (0.0-1.0)
- `workflow_bypass_attempted: boolean`

## Canonical Edge Types

- `(:SourceArtifact)-[:ASSERTS {confidence: float, method: string}]->(:Narrative)`
- `(:Narrative)-[:AMPLIFIED_BY {first_seen_at: datetime, velocity: float}]->(:Entity)`
- `(:PropertyAsset)-[:PROXIMITY_TO {distance_m: int, infra_type: string}]->(:CriticalInfrastructure)`
- `(:PropertyAsset)-[:OWNED_BY {beneficial_owner_confidence: float}]->(:Entity)`
- `(:ToolingCluster)-[:OBSERVED_IN {observed_at: datetime, confidence: float}]->(:Actor)`
- `(:ToolingCluster)-[:INFRA_OVERLAP {score: float}]->(:InfraNode)`
- `(:ToolingCluster)-[:FINANCIAL_FLOW_OVERLAP {score: float}]->(:FinancialPathway)`
- `(:RelationshipSequence)-[:TARGETS]->(:Organization)`
- `(:RelationshipSequence)-[:USES_CHANNEL {order: int}]->(:CommunicationChannel)`

## Determinism and Evidence-Budget Constraints

All retrieval plans that touch these node classes must satisfy:

1. `ORDER BY` on deterministic keys (`published_at`, `first_seen_at`, `confidence`, stable IDs).
2. hard `LIMIT` enforced by EvidenceBudget policy.
3. no open-ended traversals from user-provided seeds.
4. coalesced optional patterns (`COALESCE`) where nullable relationship properties exist.

## Scoring Contract

### Provenance Reliability (`R`)

`R = 0.30*source_weight + 0.25*cross_source_corroboration + 0.20*(1-synthetic_probability) + 0.15*citation_depth_norm + 0.10*lineage_integrity`

- `source_weight` is policy-driven by `source_type`.
- `citation_depth_norm` is depth capped and normalized to `[0,1]`.
- `lineage_integrity` is derived from lineage hash continuity.

### Relationship Risk (`RR`)

`RR = 0.35*escalation_velocity_score + 0.30*channel_hop_norm + 0.20*workflow_bypass + 0.15*timing_coincidence`

- `workflow_bypass` is `1.0` if true else `0.0`.
- `timing_coincidence` measures overlap with finance/HR/admin change windows.

### Capability Migration Risk (`CMR`)

`CMR = 0.4*tooling_similarity + 0.25*infra_overlap + 0.2*financial_overlap + 0.15*temporal_proximity`

Each component must be persisted with feature-level audit fields.

## Governance Hooks

Policy-as-code gates (OPA/Rego) must reject ingestion or query plans when:

- required provenance properties are absent,
- `synthetic_probability` exceeds configured threshold without corroboration,
- a retrieval plan violates deterministic constraints,
- confidence is emitted without feature trace.

## Minimal Query Shapes (Illustrative)

### Narrative spread with contamination weighting

```cypher
MATCH (s:SourceArtifact)-[a:ASSERTS]->(n:Narrative)
WHERE n.status IN ['emerging', 'accelerating']
RETURN n.narrative_id, n.first_seen_at,
       avg(a.confidence) AS claim_confidence,
       avg(s.synthetic_probability) AS synthetic_prob
ORDER BY n.first_seen_at DESC, claim_confidence DESC
LIMIT $limit;
```

### Property-to-infrastructure hybrid overlay

```cypher
MATCH (p:PropertyAsset)-[prox:PROXIMITY_TO]->(c:CriticalInfrastructure)
MATCH (p)-[:OWNED_BY]->(e:Entity)
RETURN p.asset_id, c.infra_id, prox.distance_m, e.entity_id
ORDER BY prox.distance_m ASC, p.asset_id ASC
LIMIT $limit;
```

## Rollout Plan

1. **Schema phase**: introduce node/edge definitions behind feature flag.
2. **Ingestion phase**: backfill provenance fields and lineage hashes.
3. **Policy phase**: enforce gate checks in CI and runtime.
4. **Query phase**: migrate retrieval templates to deterministic query shapes.
5. **Evaluation phase**: add contamination and relationship-risk benchmark suites.

## Validation Checklist

- `scripts/ci/verify_query_determinism.ts` passes for new query templates.
- EvidenceBudget policy tests cover new traversals.
- At least one regression fixture each for:
  - provenance-weight downgrade,
  - relationship-operation escalation,
  - tooling cluster migration overlap,
  - property/infrastructure risk linkage.
