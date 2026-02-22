# NHS Data Security and Protection Toolkit (DSP) Mapping

This document maps Summit GA features to NHS DSP standards.

| Standard | Requirement | Summit Feature | Evidence ID |
| :--- | :--- | :--- | :--- |
| **1.6.4** | Cyber Essentials | Supply Chain Trust (SBOM/SLSA) | `provenance.intoto.jsonl` |
| **3.2.1** | Audit Trails | GraphRAG Evidence IDs | `artifacts/graphrag-report.json` |
| **4.1.2** | Data Residency | Shared Agent Memory (On-Prem) | `packages/memory/src/shared.ts` |
| **9.3.1** | IT Protection | Policy Gates (OPA) | `policy/opa/agent_gates.rego` |

## Data Residency & Sovereignty

Summit's Agentic Intelligence layer is designed to run entirely on-premise or in air-gapped environments. The `SharedAgentMemory` ensures that context never leaves the controlled boundary.
