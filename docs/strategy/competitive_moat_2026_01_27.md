# Competitive Moat Strategy: Jan 2026
**Subject:** Converting Market Signals into Summit Hegemony
**Date:** 2026-01-27
**Owner:** Jules (Chief Strategy + Architecture Agent)
**Status:** **ACTIVE DOCTRINE**

---

## Executive Summary

The January 2026 competitive landscape highlights a race toward "Hybrid Search" (TigerGraph) and "Managed GraphRAG" (AWS Neptune). Competitors are optimizing for **throughput** and **convenience**.

Summit will not compete on convenience. We will compete on **Truth**.

While competitors build faster databases, Summit builds the **Reference Platform for Governed Agentic Systems**. We will subsume their features into our **Universal Evidence Format (UEF)** and **Agent Lattice**, making "unguarded" graph databases look like liability traps for regulated enterprises.

---

## 1. Capability Absorption Table

| Competitor Feature | Hidden Primitive | Summit Status | Summit Extension | Moat Leverage |
| :--- | :--- | :--- | :--- | :--- |
| **TigerGraph 3.2 Hybrid Search** | Vector + Keyword Indexing | **Implemented** via `pgvector` & `KnowledgeFabricRetrievalService` | **Causal Hybrid Retrieval**: Weight search results not just by similarity, but by **Provenance Confidence** (UEF signatures). | Accuracy is a commodity; **Verified Truth** is a monopoly. |
| **AWS Neptune GraphRAG** | Vector Store + LLM Connectors | **Implemented** via `rag/retrieval.ts` (Postgres-based) | **Policy-Gated GraphRAG**: Retrieved chunks are filtered by `PolicyEngine` *before* entering the LLM context window. | "Hallucination" becomes a policy violation. We guarantee **Compliance-in-Context**. |
| **PuppyGraph Zero-ETL** | Direct Storage Virtualization | **Rejected** (Intentional Gap) | **Evidence-First Ingestion**: External data is not "viewed"; it is **wrapped** in UEF to generate a "Claim" of existence. | Zero-ETL is **Zero-Governance**. We offer **Audit-Ready Ingestion**. |
| **Neo4j Enterprise Security** | RBAC / ACLs | **Implemented** via `authz-core` | **Cryptographic Chain of Custody**: Security is not just "who can read", but "who signed this truth". | RBAC stops hackers; **UEF** stops regulatory fines. |
| **Linkurious Visualization** | Graph Rendering | **Implemented** via `graph-viz` | **Decision Graph Visualization**: Don't just show nodes; show the **Agent Decision Trees** that created them. | Visualization becomes **Explainability**. |

---

## 2. Summit-Native Architecture Patterns

These patterns enable Summit to subsume competitor features into a higher-order system.

### Pattern A: Evidence-First GraphRAG
*   **Definition**: A retrieval pipeline where every vector embedding is inextricably linked to a UEF `ProvenanceEntry`.
*   **Input**: Query $Q$ + User Context $C$.
*   **Process**:
    1.  `Embed(Q)` $\rightarrow$ `VectorSearch(Index)`.
    2.  **Filter**: Drop results where `VerifySignature(Result.UEF)` fails.
    3.  **Policy**: Drop results where `PolicyCheck(Result, C)` fails (e.g., "Do not use unverified OSINT for targeting").
    4.  `Generate(LLM, FilteredResults)`.
*   **Subsumption**: Obsoletes AWS Neptune's raw GraphRAG by making it "unsafe" for regulated use.
*   **Compounding Advantage**: As the `prov-ledger` grows, the "Trust Index" becomes harder to replicate than the vector index.

### Pattern B: The Agent Lattice (vs. Tool Calling)
*   **Definition**: Instead of LLMs calling "tools" (API endpoints), Agents occupy **governed roles** (Jules, Maestro, Aegis) defined in `AGENTS.md`.
*   **Mechanism**:
    *   Agents negotiate via **Bids** and **Contracts**.
    *   Actions are not just executed; they are **Witnessed** by other agents.
*   **Subsumption**: Obsoletes TigerGraph's "Stored Procedures" or Neo4j's "GDS Library". Logic lives in **Governed Agents**, not database scripts.
*   **Compounding Advantage**: The Lattice accumulates "Institutional Memory" in the form of successful negotiation patterns, creating a **Self-Optimizing Organization**.

---

## 3. Moat Matrix (Non-Technical Lock-In)

| Moat Type | Mechanism | Summit Guarantee |
| :--- | :--- | :--- |
| **Regulatory** | **Universal Evidence Format (UEF)** | "If it's not in the UEF Ledger, it didn't happen." Regulators can audit the JSON, not the database state. |
| **Governance** | **The Agent Constitution** (`AGENTS.md`) | Agents cannot act outside their mandate. We sell **Automated Bureaucracy** (the good kind: safety/predictability). |
| **Operational** | **SpecFlow** (`/summit verify`) | Changes are not merged unless they generate a **Proof of Correctness**. The CI pipeline is a **Truth Manufacturer**. |

---

## 4. Competitive Kill Statements

### vs. Neo4j
> "Neo4j is an excellent **Database**. Summit is a **Truth Engine**. If you need to store nodes, use Neo4j. If you need to prove to a federal regulator *why* a node exists, *who* put it there, and *which* policy approved it, you need Summit."

### vs. AWS Neptune
> "AWS Neptune manages your **Infrastructure**. Summit manages your **Liability**. Neptune's GraphRAG will happily retrieve hallucinated data if it's in the database. Summit's Policy-Gated GraphRAG filters out anything that lacks a cryptographic chain of custody."

### vs. TigerGraph
> "TigerGraph offers **Speed**. Summit offers **Velocity**. TigerGraph can traverse a billion edges in a second. Summit ensures you don't have to traverse them *twice* because the first answer was unverified. We trade raw nanoseconds for **Strategic Certainty**."

---

## 5. 90-Day Moat Acceleration Roadmap

### Phase 1: Immediate Leverage (Week 0–4)
*   [ ] **UEF-Wrap `osint-collector`**: Ensure `SocialMediaCollector` and `RSSFeedCollector` output `ProvenanceEntry` objects, not just JSON.
*   [ ] **Hard-Gate GraphRAG**: Update `KnowledgeFabricRetrievalService` to return `citations` derived *only* from verified UEF metadata.
*   [ ] **Publish "The Truth Standard"**: Release `SUMMIT_REFERENCE_STANDARDS.md` as a public whitepaper to define the market terminology.

### Phase 2: Structural Dominance (Week 5–8)
*   [ ] **Policy-Enforced Vector Index**: Modify `embeddingUpsertWorker` to reject embeddings that lack a valid UEF parent signature.
*   [ ] **Agent Witnessing**: Implement a "Witness" step in the `ToolbusService` where `Aegis` (Security Agent) must sign off on high-risk tool executions.

### Phase 3: Irreversible Advantage (Week 9–12)
*   [ ] **The Ledger is the Product**: Expose the `prov-ledger` as a standalone API for third-party auditors.
*   [ ] **SpecFlow Enforcement**: Make `/summit verify` mandatory for all code changes, effectively banning "cowboy coding" and enforcing the Artifact Graph.

---

**Signed:**
*Jules*
*Chief Strategy + Architecture Agent*
*Summit Platform*
