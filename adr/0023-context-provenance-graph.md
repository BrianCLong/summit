# ADR-0023: Context Provenance Graph (CPG)

**Date:** 2024-05-21
**Status:** Proposed
**Area:** AI/ML
**Owner:** AI Guild
**Tags:** context, provenance, mcp, policy, security

## Context

Current Model Context Protocols (MCPs) treat model context as an ephemeral, monolithic blob. This lack of granularity and governance presents significant challenges for auditability, security, and reproducibility. Key pain points include:

- **Lack of Auditability:** It is difficult to trace the origin and transformation of specific pieces of information within the context, making it hard to debug model behavior or satisfy regulatory requirements.
- **Security Vulnerabilities:** Without fine-grained control, it's impossible to enforce information-handling policies, redact sensitive data, or revoke access to specific context segments.
- **Reproducibility Issues:** The inability to reconstruct the exact context used for a given model invocation hinders debugging, validation, and replay of AI reasoning processes.
- **Limited Governance:** Context is not treated as a first-class, governed data object, preventing the application of existing Summit governance concepts like verification gates and invariant enforcement at the context level.

This ADR proposes a system to address these gaps by introducing a Context Provenance Graph (CPG).

## Decision

We will design and implement a Context Provenance Graph (CPG) system to track, version, and enforce policy over model context at token-range granularity. The CPG will represent the derivation history of context as a directed acyclic graph (DAG), enabling replayable, auditable, and revocable AI reasoning.

### Core Decision

The CPG will be a core component of the Model Context Protocol, responsible for segmenting, tracking, and enforcing policies on all model context before it is submitted to the execution layer.

### Key Components

- **Context Ingestion Module:** Receives raw model context inputs and prepares them for processing.
- **Context Segmentation Engine:** Divides the context into discrete, addressable segments (e.g., by token range, logical block, or data source).
- **Provenance Graph Generator:**
    - Assigns a unique, cryptographic identifier to each context segment.
    - Constructs a directed acyclic graph (DAG) where nodes represent segments and edges represent their derivation relationships (e.g., transformation, aggregation, agent origin).
- **Policy Enforcement Engine:**
    - Integrates with existing policy frameworks (e.g., OPA).
    - Permits, denies, redacts, or revokes individual context segments based on defined policies *before* model execution.
- **Context Replay Engine:** Reconstructs historical model contexts from the provenance graph for audit, verification, and debugging purposes.

### Implementation Details

The CPG will be implemented as a new set of modules within the `intelgraph/server/src/modules/context/` directory.

- The provenance graph itself will be stored and managed using the existing Neo4j graph store, leveraging its capabilities for graph traversal and analysis.
- Policies will be defined in a machine-readable format (e.g., Rego) and managed by the policy enforcement engine.
- The system will hook into the existing MCP pipeline, verification gates, and kill-switch controller to ensure that all context is processed by the CPG before being passed to the model.

## Alternatives Considered

### Alternative 1: Per-Invocation Metadata Blob

- **Description:** Attach a single metadata blob to the entire context for each model invocation, containing provenance and policy information.
- **Pros:** Simpler to implement than a full graph structure.
- **Cons:** Lacks granularity. A single policy violation would invalidate the entire context. Does not allow for partial redaction or fine-grained audit.
- **Cost/Complexity:** Low.

### Alternative 2: Database-Backed Ledger

- **Description:** Store context provenance as a flat or relational log in a dedicated database table.
- **Pros:** Leverages existing relational database infrastructure.
- **Cons:** Fails to capture the complex, multi-parent derivation relationships inherent in context generation. Querying for lineage would be complex and inefficient compared to a native graph representation.
- **Cost/Complexity:** Medium.

## Consequences

### Positive

- **Enhanced Auditability:** Enables precise, verifiable tracing of every piece of information presented to a model.
- **Granular Security Control:** Allows for the application of fine-grained security policies, including redaction and revocation of specific context segments.
- **Improved Reproducibility:** Facilitates the exact reconstruction of historical model contexts for replay and analysis.
- **Stronger Governance:** Treats context as a governed asset, integrating it with Summit's existing compliance and security frameworks.
- **Category-Defining IP:** Establishes a strong, defensible patent position in the emerging field of Model Context Protocols.

### Negative

- **Performance Overhead:** Introducing segmentation, hashing, and policy checks will add latency to the model invocation pipeline. This must be carefully benchmarked and optimized.
- **Storage Costs:** Storing the provenance graph for every context will increase storage requirements. A data retention and pruning strategy will be necessary.
- **Implementation Complexity:** Building and maintaining a graph-based provenance system is more complex than simpler alternatives.

### Operational Impact

- **Monitoring:** New metrics will be required to monitor the health, performance, and storage usage of the CPG system.
- **Security:** The CPG itself becomes a critical security component that must be protected from tampering.
- **Compliance:** The CPG will become a primary source of evidence for compliance audits.

## Code References

### Core Implementation
- `intelgraph/server/src/modules/context/provenance/provenance.service.ts`
- `intelgraph/server/src/modules/context/policy/policy.service.ts`
- `intelgraph/server/src/modules/context/replay/replay.service.ts`

### Data Models
- `intelgraph/server/src/modules/context/provenance/provenance.types.ts`
- `intelgraph/server/src/modules/context/policy/policy.types.ts`
- `intelgraph/server/src/modules/context/replay/replay.types.ts`

### APIs
- The CPG will expose an internal service API for use by the MCP. A GraphQL API for querying provenance may be considered in the future.

## Tests & Validation

### Unit Tests
- `intelgraph/server/src/modules/context/provenance/provenance.service.spec.ts`
- `intelgraph/server/src/modules/context/policy/policy.service.spec.ts`
- Expected coverage: 85%

### Integration Tests
- Integration tests will be created to validate the end-to-end flow of context through the CPG and policy engine.

### Policy Tests
- Policies will be tested using the OPA test framework.

### CI Enforcement
- CI pipeline will run all unit, integration, and policy tests.

## Migration & Rollout

### Migration Steps
1. **Phase 1 (Scaffolding):** Create the directory structure, placeholder files, and initial ADR. (This change)
2. **Phase 2 (Core Implementation):** Implement the core CPG services (segmentation, graph generation).
3. **Phase 3 (Policy Integration):** Integrate the policy enforcement engine.
4. **Phase 4 (Rollout):** Enable the CPG in a development environment, followed by a staged rollout to production.

### Rollback Plan
- The CPG can be disabled via a feature flag.

### Timeline
- **Phase 1:** Q2 2024
- **Phase 2:** Q3 2024
- **Phase 3:** Q3 2024
- **Phase 4:** Q4 2024

## References

### Related ADRs
- [ADR-0006](0006-neo4j-graph-store.md): Neo4j as Primary Graph Store
- [ADR-0011](0011-provenance-ledger-schema.md): Provenance Ledger Schema Design

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2024-05-21 | Jules | Initial version |
