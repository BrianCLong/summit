# Summit Intelligence Graph Foundry Architecture

## 1. Executive Summary

The **Summit Intelligence Graph Foundry** is a deterministic environment for the collection, enrichment, and reasoning of intelligence at scale. It transcends traditional OSINT platforms (Maltego, i2) by integrating a graph-native architecture with **Policy-as-Code (OPA)** and a **Provenance Ledger**, ensuring that every insight is auditable, reproducible, and compliant.

## 2. Core Components

### 2.1 IntelGraph: The System of Record
- **Native Graph Storage**: Powered by Neo4j, storing entities, relationships, events, and scenes.
- **Bitemporal Dynamics**: Tracking state changes over time (valid time vs. transaction time).
- **Graph-RAG Retrieval**: Deterministic retrieval of subgraphs for LLM context, preventing hallucinations.

### 2.2 Provenance Ledger: The Truth Moat
- **Evidence-ID Propagation**: Every node and edge in the graph is linked to one or more `Evidence-IDs`.
- **Cryptographic Signing**: All mutations and AI inferences are signed by the `ProvenanceGateway`.
- **Chain of Custody**: Metadata capturing the origin, collection method, and transformation history of data.

### 2.3 Policy Gateway (OPA)
- **Pre-flight Tool Validation**: All agent tool calls (e.g., "Search Social Media") are gated by Rego policies.
- **Data Minimization**: Filtering sensitive information at the source based on analyst clearance and mission scope.
- **Approval Loops**: Forcing Human-in-the-loop (HITL) for high-risk actions (e.g., "Publish Intelligence Report").

### 2.4 Multi-Agent Orchestration (Maestro V2)
- **Specialized Agent Swarms**:
    - **Collectors**: Source-specific ingestion agents (Social, Dark Web, Media).
    - **Enrichers**: Entity resolution and cross-domain fusion agents.
    - **Reasoners**: Path-finding and hypothesis generation agents.
    - **Guardians**: Real-time policy and compliance monitoring agents.

## 3. Dataflow: Evidence to Insight

1. **Collection**: `OSINTCollector` agent invokes a governed tool (e.g., `maltego_search`). OPA validates the tool call.
2. **Ingestion**: Raw data is ingested into the `OSINTEnrichmentService`. A new `Evidence-ID` is minted in the `ProvenanceLedger`.
3. **Graph Materialization**: The data is transformed into `IntelGraph` nodes and edges. Each element stores the `Evidence-ID` in its metadata.
4. **Enrichment**: `EnrichmentAgent` performs entity resolution (e.g., linking a social handle to a known identity). This creates a new relationship edge with its own provenance.
5. **Reasoning**: `ReasoningAgent` queries the graph via `GraphRAG`. It generates a hypothesis (e.g., "Influence Campaign Detected").
6. **Attestation**: The hypothesis is packaged as an `IntelligenceReport`. An `EvidenceBundle` is generated, cryptographically binding the report to all upstream evidence and policy decisions.

## 4. Competitive Moat

| Feature | Maltego / i2 | Summit Graph Foundry | Moat Type |
| :--- | :--- | :--- | :--- |
| **Architecture** | Desktop / SaaS Visualization | Native Graph Database + Ledger | Structural |
| **Determinism** | User-driven (Manual) | Agent-driven (Deterministic) | Operational |
| **Auditability** | Action Logs | Cryptographic Provenance DAG | Legal/Audit |
| **Governance** | RBAC | Policy-as-Code (OPA) | Compliance |
| **AI Integration** | Tool-assisted | Agent-Orchestrated | Technological |

---
**Status:** ARCHITECTURE-STABLE
**Owner:** @intelgraph/platform-core
**Version:** 1.0.0
