# Cognitive Security Engine (CSE) Graph Extensions Standard

## Purpose

Define governed graph extensions and scoring requirements for the Cognitive Security Engine (CSE)
layer in Summit/IntelGraph. This standard codifies node/edge definitions, evidence rules, and
agentic scoring so cognitive warfare detection can operate with deterministic, audit-ready inputs.

## Summit Readiness Assertion

This work aligns with the Summit Readiness Assertion and uses governed artifacts and
standards-backed definitions to shorten feedback loops and enforce evidence-first workflows.

## Scope

- Govern CSE-native graph entities for campaigns, cognitive vulnerabilities, audience segments,
  and cognitive state transitions.
- Require evidence references for all campaign declarations and relationship edges.
- Establish deterministic scoring inputs for cognitive risk and reconstitution risk.
- Provide Neo4j-ready seed patterns while keeping attribution gated by evidence.

## Schema

- **Schema ID**: `cse.graph.v1`
- **Schema file**: `schemas/cogwar/cse.graph.v1.schema.json`

## Node Definitions

| Node Type | Key Properties | Notes |
| --- | --- | --- |
| `Campaign` | `campaign_id`, `playbook_id`, `phase`, `start_date` | Links to narrative and vulnerability edges with evidence. |
| `CognitiveVuln` | `vuln_id`, `type`, `bias`, `strength` | Strength range `[-1, 1]` enforces bounded scoring. |
| `AudienceSegment` | `segment_id`, `demographics`, `vulnerability_score`, `platform_reach` | Segmentation is evidence-bound and non-attributed by default. |
| `CognitiveState` | `state_id`, `trust_level`, `polarization`, `salience_shift` | Dynamic state transitions remain deterministic. |

## Relationship Definitions

- `Campaign` **EXPLOITS** `CognitiveVuln`
- `Campaign` **TARGETS** `AudienceSegment`
- `CognitiveVuln` **EXPLOITED_IN** `Narrative`
- `AudienceSegment` **RECEPTIVE_TO** `Narrative`
- `Campaign` **DRIVES** `CognitiveState`
- `AudienceSegment` **INFLUENCED_BY** `Campaign`
- `CognitiveState` **TRANSITIONS_TO** `CognitiveState`

All relationships must include `evidence_refs[]` per the schema.

## Cypher Seed Example

```
CREATE (rc:Campaign {campaign_id: 'CSE-CAMP-8F2KQ1', playbook_id: 'reflexive_control', phase: 'shaping', start_date: '2025-01-10'})
CREATE (cv:CognitiveVuln {vuln_id: 'CSE-VULN-7Q2M9T', type: 'dissonance', bias: 'overestimate_threat', strength: 0.8})
CREATE (rc)-[:EXPLOITS {evidence_refs: ['EVID-8J4K9Q2M1X']}]->(cv)
MATCH (n:Narrative {id: 'nato_escalation'}) CREATE (cv)-[:EXPLOITED_IN {evidence_refs: ['EVID-4X7T2Q8M1B']}]->(n);
```

## Scoring Requirements

### Cognitive Risk Score

\[
\text{Risk} = w_1 \cdot \text{reach} + w_2 \cdot \text{vuln_strength} + w_3 \cdot \text{emotional_intensity} + w_4 \cdot \text{trust_erosion}
\]

Baseline weights: `[0.3, 0.25, 0.25, 0.2]`. Weights are controlled via governed configuration and
must be versioned with evidence bundles.

### Reconstitution Risk

```
reconstitution_score = 1.0 - (similarity_to_known(network, suppressed_clusters) * remediation_completeness)
```

The score must be computed from deterministic inputs and logged as a governed exception if
legacy data lacks required evidence.

## Agent Hooks

- **Detection Agent**: Maps cognitive attack graph paths (impersonation → urgency → compliance).
- **Simulation Agent**: Runs cognitive cascades on `AudienceSegment` and `CognitiveState` nodes.
- **Mitigation Agent**: Generates prebunk and DEG playbooks with evidence-bound outputs.
- **Lifecycle Agent**: Monitors reconstitution risk and enforces governed alert thresholds.

## Determinism & Evidence Controls

- All graph queries must include explicit `LIMIT` and `ORDER BY` clauses.
- Evidence refs are mandatory for campaign declarations and relationship edges.
- Any missing evidence is logged as a **Governed Exception** with rollback instructions.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Agents, Tools, Observability, Security.
- **Threats Considered**: prompt injection, attribution laundering, evidence spoofing, goal
  manipulation.
- **Mitigations**: schema validation gates, evidence refs on edges, deterministic query caps,
  audit logging on reconstitution scoring.

## Verification Checklist

1. Validate payloads against `schemas/cogwar/cse.graph.v1.schema.json`.
2. Run query determinism checks when modifying graph traversal logic.
3. Record evidence bundle artifacts for scoring configuration updates.

## Status

- **Feature flag**: default OFF for ingestion/scoring changes.
- **Roll-forward**: additive schema changes only; no breaking changes without version bump.
