# Governance Signal Inventory

| Signal Name | Source Concept | Type | Regulatory Drivers | Summit Relevance |
| :--- | :--- | :--- | :--- | :--- |
| **Constitutional Primacy** | Meta-Governance | Compliance | Internal | Root of Authority; overrides all other instructions. |
| **Human Primacy** | Human-in-the-Loop | Compliance | EU AI Act (Art 14) | Mandates human authorization for consequential actions. |
| **Provenance Requirement** | Data Lineage | Differentiation | EU AI Act (Art 12), SLSA | Ensures all outputs are attributable and contestable. |
| **Release Abort Gate** | Release Safety | Compliance | NIST AI RMF (Measure 2.2) | Enforced by `scripts/ci/verify_release_constraints.ts`. |
| **Explainability Gate** | AI Transparency | Differentiation | EU AI Act (Art 13) | Requires traceable path from Collection to Claim. |
| **MCP Zero-Trust** | Zero Trust | Compliance | SOC 2 (CC6.1) | Enforces strict validation for all MCP tool executions. |
| **Ethical Defensive Use** | Ethical Constraint | Compliance | Internal, Legal | Restricts platform to defensive/passive operations only. |
| **Agent Mandates** | Operational Discipline | Compliance | Internal | Defines role-specific powers and limitations for agents. |
| **Path-Native Prompting** | Determinism | Differentiation | NIST AI RMF (Map 1.5) | Enforces structured traversal for reproducible reasoning. |
| **Provenance Revocation** | Retroactive Correction | Differentiation | GDPR | Supports Merkle DAG-based invalidation of bad intelligence. |
| **Contradiction Detection** | Claim-Centric Validation | Compliance | Automation Turn #5 | Enforced by `scripts/ci/verify_contradiction_exposure.mjs`. |
