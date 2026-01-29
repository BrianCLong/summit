# Claim-Level Grounding Interop — claim-level-graphrag

## Summary
Claim-Level GraphRAG decomposes answers into atomic claims, grounding each against evidence paths. This standard defines the data contracts and verification requirements for this pattern.

## Data Contracts

### Claim JSON Schema
A claim is defined as:
- `claim_id`: Stable identifier (e.g., `CLM-001`).
- `text`: Atomic assertion text.
- `support`: Enum (`supported`, `unsupported`, `contradicted`, `unknown`).
- `evidence_refs`: Array of evidence identifiers or paths.

### Evidence Reference
Evidence should point to verifiable artifacts or graph paths, not just text snippets.

## Compatibility
- **Graph Stores:** The pattern is agnostic to the underlying graph store (Neo4j, etc.) via adapter interfaces.
- **Retrieval:** Supports composable "micro-query" models where each claim triggers a specific subgraph verification query.

## Migration Notes
- Systems moving from answer-level grounding to claim-level arbitration should implement the `ClaimExtractor` interface.
