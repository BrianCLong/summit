# GraphRAG Controls Mapping

This document maps GraphRAG specific risks and mitigations to the broader Summit Governance Framework controls.

## Control Matrix

| Control ID | Name | GraphRAG Implementation | Evidence Artifact |
| :--- | :--- | :--- | :--- |
| **SEC-INJECT-001** | Input Validation & Sanitization | `RetrievalSanitizer` class filters injection patterns from retrieved node text. | Unit tests for `RetrievalSanitizer` |
| **SEC-TENANT-001** | Multi-Tenant Isolation | Cypher queries enforce `tenant_id` label constraints on all traversals. | Query builder tests verifying `tenant_id` injection |
| **GOV-PROV-001** | Data Provenance | Provenance JSON generated for every run including inputs, context, and output. | `graph_rag_provenance.schema.json` compliant JSON logs |
| **GOV-REPLAY-001** | Deterministic Execution | Strict sorting by ID for all list results; tie-breaking for vector search. | `verify_graph_rag_provenance.mjs` CI pass |
| **SC-DEPS-001** | Supply Chain Integrity | All dependencies pinned; SBOM generated. | `sbom.json` |
| **AUDIT-TRACE-001** | Auditability | Provenance records linked to Request ID and User ID. | Trace logs with correlation IDs |

## Policy Gates

The following gates are enforced in the CI/CD pipeline and runtime:

1.  **Provenance Gate**: Fails if a GraphRAG run completes without generating a valid provenance schema artifact.
2.  **Replay Gate**: Fails if re-running a retrieval task with identical inputs yields a different context hash.
3.  **Policy Gate**: Fails if retrieved nodes contain `trust_level="untrusted"` without explicit override.
