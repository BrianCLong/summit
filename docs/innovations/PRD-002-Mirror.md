# PRD: Project Mirror (Counter-intelligence)

## 1. Executive Summary
Project Mirror generates a high-fidelity "Decoy Knowledge Graph" to poison adversary reconnaissance. It creates plausible but fake entities and relationships that look like the real `IntelGraph` but trap unauthorized accessors.

## 2. Problem Statement
Sophisticated adversaries often map our data structures before attacking. We have no way to detect or mislead this mapping phase.

## 3. Non-Goals
- Replacing real data.
- Honeypots for network services (this is data-layer only).

## 4. User Stories
- As a security engineer, I want to generate 1000 decoy nodes that statistically resemble our 'Confidential' projects.
- As an auditor, I want to be alerted immediately if anyone queries a decoy node.

## 5. Functional Requirements
- `generateDecoySubgraph(seed: string, size: number): CypherQuery`
- Decoy nodes must have valid schemas but marked with `_decoy: true`.
- Accessing a decoy node triggers a `HighSeverity` alert.

## 6. Non-Functional Requirements
- Decoy generation should be indistinguishable from real data to a casual observer (LLM-generated text).
- Zero performance impact on valid queries (use separate labels or indexes).

## 7. Architecture
- `DecoyGraphService` uses `Faker` or LLMs to generate content.
- Writes to Neo4j with a specific Label `Decoy`.
- `AccessControlMiddleware` checks for `Decoy` label on result sets.

## 8. Data Flows
Admin -> DecoyService -> Neo4j.
Attacker -> Query -> Neo4j -> Middleware (Alert) -> Response.

## 9. Policy & Governance
- Decoy data must never appear in `Production` reports.
- STRICT isolation in reporting pipelines.

## 10. Test Strategy
- Verify alert triggering on access.
- Verify exclusion from standard reports.

## 11. Rollout
- Deploy to Staging.
- Inject 1% decoys in Prod (Dark Launch).

## 12. Risks
- Pollution of real intelligence. Mitigation: Strict Label separation (`:Entity` vs `:DecoyEntity`).

## 13. Success Metrics
- Time-to-Detection for internal breaches reduced by 90%.
