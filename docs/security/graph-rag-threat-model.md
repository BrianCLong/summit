# GraphRAG Threat Model

## Overview
This document outlines the threat model for the GraphRAG (Graph Retrieval-Augmented Generation) and agent graph memory components. It identifies key risks, attack vectors, and implemented mitigations to ensure the system is GA-auditable and secure.

## Assets
- **Knowledge Graph**: The underlying graph database containing entities and relationships.
- **GraphRAG Index**: Vector indices and graph structures used for retrieval.
- **Agent Memory**: Persistent state and decision logs for agents.
- **Provenance Data**: Records of inputs, retrieval paths, and outputs.

## Threat Landscape

### 1. Data Poisoning & Prompt Injection
*   **Threat**: Adversaries inject malicious nodes or edges into the graph (e.g., via untrusted data sources or compromised ingestion pipelines) that, when retrieved, manipulate the LLM's behavior or output.
*   **Attack Vector**: "Indirect Prompt Injection" via retrieved context.
*   **Impact**: Hallucinations, policy violations, unauthorized actions by agents.
*   **Mitigation**:
    *   **Input Sanitization**: Strict validation of graph inputs.
    *   **Retrieval Sanitization**: Analyzing retrieved context for injection patterns before feeding to LLM.
    *   **Source Trust Levels**: Tagging nodes/edges with trust levels; filtering low-trust data for high-sensitivity queries.

### 2. Cross-Tenant & Cross-Domain Leakage
*   **Threat**: Graph traversal inadvertently crosses tenant boundaries or security domains, exposing sensitive information to unauthorized users or contexts.
*   **Attack Vector**: Malformed Cypher queries, inadequate label-based security, or graph algorithm bleeding (e.g., community detection spanning tenants).
*   **Impact**: Data breach, privacy violation.
*   **Mitigation**:
    *   **Label-Based Access Control (LBAC)**: Enforcing tenant labels on all nodes/edges.
    *   **Query Parameterization**: Preventing Cypher injection.
    *   **Traversal Limits**: Hard boundaries on traversal depth and scope.

### 3. Provenance Forgery
*   **Threat**: Actors falsify or tamper with provenance records to hide the origin of information or the logic behind a decision.
*   **Attack Vector**: Direct modification of provenance logs, spoofing timestamps or IDs.
*   **Impact**: Loss of auditability, inability to trace bad decisions.
*   **Mitigation**:
    *   **Cryptographic Hashing**: Generating deterministic hashes of retrieval and context artifacts.
    *   **Immutable Logs**: Storing provenance in tamper-evident stores (e.g., append-only logs).
    *   **Signature Verification**: Signing artifacts where applicable.

### 4. Supply Chain Risks
*   **Threat**: Compromised dependencies (LLM providers, embedding models, libraries) introduce vulnerabilities or non-deterministic behavior.
*   **Attack Vector**: Malicious package updates, model drift/poisoning at the provider level.
*   **Impact**: System compromise, unreliable outputs.
*   **Mitigation**:
    *   **SBOM Generation**: Comprehensive Software Bill of Materials for GraphRAG components.
    *   **Dependency Pinning**: Exact version pinning for libraries and models.
    *   **Model Versioning**: Explicitly targeting specific model snapshots.

### 5. Nondeterministic Retrieval & Replay Failures
*   **Threat**: The system produces different outputs for the same input due to nondeterministic retrieval ordering, preventing valid audits.
*   **Attack Vector**: Exploiting race conditions or random tie-breaking in vector search.
*   **Impact**: Failed audits, inability to reproduce errors.
*   **Mitigation**:
    *   **Deterministic Sorting**: Enforcing stable sort keys for all traversal results.
    *   **Tie-Breaking**: Explicit tie-break rules for similarity ranking (e.g., by ID).
    *   **Frozen Time**: Decoupling runtime timestamps from content hashes.

## Control Mapping

| Risk ID | Risk Category | Mitigation Control | Governance Primitive |
| :--- | :--- | :--- | :--- |
| T-001 | Poisoning | Retrieval Sanitization Layer | `SEC-INJECT-001` |
| T-002 | Leakage | Tenant Label Enforcement | `SEC-TENANT-001` |
| T-003 | Forgery | Deterministic Context Hashing | `GOV-PROV-001` |
| T-004 | Supply Chain | SBOM & Dependency Pinning | `SC-DEPS-001` |
| T-005 | Determinism | Stable Sort & Replay Contract | `GOV-REPLAY-001` |
