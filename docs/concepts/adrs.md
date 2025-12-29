---
title: Architecture Decision Records (ADR)
summary: Log of significant architectural decisions and their context.
version: v2.0.0
lastUpdated: 2025-12-29
---

# Architecture Decision Records (ADR)

This log captures the _why_ behind the technical evolution of the Summit platform. Each record represents a significant decision that shapes the architecture.

## Index

| ID               | Title                                                    | Status      | Date       |
| :--------------- | :------------------------------------------------------- | :---------- | :--------- |
| **ADR-001**      | **[Ontology & Temporal Model](adrs/001-ontology.md)**    | Proposed    | 2025-12-05 |
| **ADR-002**      | **[LBAC Security Proxy](adrs/002-lbac.md)**              | Accepted    | 2025-11-15 |
| **ADR-003**      | **[Airgap Ingest Gateway](adrs/003-airgap.md)**          | Accepted    | 2025-10-20 |
| **ADR-2025-001** | **[Resolver Refactoring](adrs/2025-001-resolver.md)**    | Implemented | 2025-12-07 |
| **ADR-2025-002** | **[TypeScript Strictness](adrs/2025-002-strictness.md)** | Active      | 2025-12-01 |

## Recent Key Decisions

### ADR-001: Ontology & Temporal Model

**Context**: We need to model conflicting facts ("The world as it is") vs. our knowledge of them ("The world as we know it") over time.
**Decision**:

1.  **Bitemporal Storage**: Store `transaction_time` (DB write) and `valid_time` (Real world) for key relationships.
2.  **Observation Pattern**: Do not mutate Entities directly. Write `Observation` nodes linked to `Source` nodes to track lineage and confidence.
3.  **Trust Scores**: Every observation carries a `trust_score` (0-1).

### ADR-2025-001: Resolver Refactoring

**Context**: Complex GraphQL queries caused N+1 issues and DB pool exhaustion.
**Decision**:

1.  **DataLoader**: Mandated for all relationship resolvers.
2.  **Complexity Analysis**: Field-level cost analysis to reject runaway queries.
3.  **Streaming**: Use async iterators for large result sets.

## Creating a New ADR

1.  Copy the template from `docs/templates/adr-template.md`.
2.  Focus on **Context** (The Problem), **Decision** (The Solution), and **Consequences** (Trade-offs).
3.  Submit a PR with the label `area/architecture`.
