# FedRAMP Moderate Control Mapping

This document maps Summit GA features to FedRAMP Moderate controls.

| Control ID | Control Name | Summit Feature | Evidence Artifact |
| :--- | :--- | :--- | :--- |
| **AC-2** | Account Management | Policy-First Execution (OPA) | `policy/opa/agent_gates.rego` |
| **AU-3** | Content of Audit Records | GraphRAG Evidence IDs | `artifacts/graphrag-report.json` |
| **CM-8** | Information System Component Inventory | SBOM Generation | `sbom.spdx.json` |
| **SI-7** | Software, Firmware, and Information Integrity | SLSA Provenance & Cosign | `provenance.intoto.jsonl` |
| **SC-7** | Boundary Protection | Webhook Ingest Gates | `ingest/webhooks/` |

## Implementation Details

### AC-2: Policy-First Execution
All agent actions are mediated by Open Policy Agent (OPA) gates defined in `policy/opa/`. Default deny policies ensure no unauthorized tools are executed.

### AU-3: Audit Records
GraphRAG generates deterministic `EVID-` identifiers for every retrieval path, ensuring full traceability of AI decisions.
