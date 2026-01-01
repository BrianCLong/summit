# Architecture Decision Records (ADR) Index

This index tracks key architectural decisions for Summit.

| ID                                                              | Title                                           | Status   | Date       |
| :-------------------------------------------------------------- | :---------------------------------------------- | :------- | :--------- |
| [ADR-001](./ADR-001.md)                                         | Use Monorepo Structure                          | Accepted | 2024-01-01 |
| [ADR-002](./ADR-002.md)                                         | Adopt OpenTelemetry                             | Accepted | 2024-02-15 |
| [ADR-003](./ADR-003.md)                                         | Secret Management via Vault                     | Accepted | 2024-03-10 |
| [ADR-004](./ADR-004.md)                                         | Strict Decoupling of Orchestrator and Inference | Accepted | 2024-05-20 |
| [ADR-005](./ADR-005_ontology_and_temporal_model.md)             | IntelGraph Ontology and Temporal / Source Model | Proposed | 2025-12-05 |
| [ADR-006](./ADR-006_lbac_security_proxy.md)                     | LBAC via API-Level Security Proxy for Neo4j     | Proposed | 2025-12-05 |
| [ADR-007](./ADR-007_ingest_airgap_gateway.md)                   | Ingest Staging and Air-Gap Gateway              | Proposed | 2025-12-05 |
| [ADR-008](./ADR-008_simulation_overlay_and_synthetic_policy.md) | Simulation Overlay and Synthetic Data Policy    | Proposed | 2025-12-05 |
| [ADR-009](./ADR-009_context_provenance_graph.md)                | Context Provenance Graph (CPG) for MCP          | Proposed | 2026-01-01 |
| [ADR-010](./ADR-010_invariant_carrying_context_capsules.md)     | Invariant-Carrying Context Capsules (IC³)       | Proposed | 2026-01-01 |

<!-- Add new ADRs above this line -->

## How to add an ADR

1.  Copy the template `docs/adr/template.md` (create if missing).
2.  Assign the next sequential number.
3.  Write the decision, context, and consequences.
4.  Submit a PR.
