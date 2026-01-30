# Summit Knowledge Graph: Subsumption Schema

This document defines the Knowledge Graph (KG) primitives for competitive subsumption intelligence.

## 1. Node Types

### EvidenceNode
Represents a raw piece of intelligence from a public source.
- `url`: Primary source URL.
- `snippet`: Quoted text (≤25 words).
- `hash`: SHA-256 hash of the source content.
- `captured_at`: Timestamp of collection.

### ClaimNode
Represents an atomic, falsifiable claim derived from evidence.
- `claim_text`: The statement being made.
- `confidence`: low | med | high.
- `rationale`: Why the claim is made.

### FindingNode
A collection of claims that represent a significant architectural or product pattern.
- `category`: arch | impl | agents | KG | UX | ops | security | biz.
- `adoption_risk`: low | med | high.

### DecisionNode
Represents the organization's choice regarding a finding.
- `decision`: Adopt | Adapt | Reject.
- `reason`: Rationale for the decision.

## 2. Relationships

- `(ClaimNode)-[:SUPPORTED_BY]->(EvidenceNode)`
- `(ClaimNode)-[:CONTRADICTED_BY]->(EvidenceNode)` (Counter-evidence)
- `(FindingNode)-[:CONSISTS_OF]->(ClaimNode)`
- `(DecisionNode)-[:EVALUATES]->(FindingNode)`
- `(DecisionNode)-[:SUPERSEDES]->(DecisionNode)` (Versioning)
- `(FindingNode)-[:MAPS_TO_MODULE]->(SummitModuleNode)`
