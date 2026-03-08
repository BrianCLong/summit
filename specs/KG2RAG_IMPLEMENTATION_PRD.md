# KG²RAG Implementation PRD

## 1. Executive Summary & Strategic Alignment
This proposal operationalizes the "Summit Research Implementation Proposals" by prioritizing **KG²RAG (Knowledge Graph Augmented Retrieval Augmented Generation)** as the foundational intelligence upgrade for the Summit platform.

**Core Thesis:**
1.  **RAG is no longer competitive without graph reasoning.**
2.  **Multimodal OSINT is table stakes.**
3.  **Agent platforms without protocol standards will be non-enterprise.**

**Target Metrics:**
*   **+36%** Mean Answer Similarity vs. Baseline.
*   **+21%** Q3 Improvement on Multi-hop Reasoning.
*   **3×** VRAM Reduction (Enabling massive scale).
*   **Graph-Constrained Reasoning:** Higher explainability, lower hallucination.

## 2. Priority Assessment
*   **Impact:** Highest (Core Intelligence Upgrade).
*   **Risk:** Manageable.
*   **Time to Value:** ~2 weeks.
*   **Deployment Strategy:** Treat as a foundational refactor behind a feature flag, becoming the default path upon benchmark parity.

## 3. System Architecture: KG²RAG

### 3.1. Core Components
The system implements a hybrid retrieval strategy:
1.  **Vector Retrieval (Qdrant):** Fast, semantic similarity search.
2.  **Graph Traversal (Neo4j):** Multi-hop reasoning, relationship expansion, and constraint verification.
3.  **Synthesis (LLM):** Context-aware generation grounded in graph evidence.

### 3.2. Evidence Objects (First-Class Citizens)
To ensure auditability and trust, the retrieval process must emit structured evidence objects, not just text chunks.

```typescript
interface EvidencePath {
  entities: Entity[];        // Nodes involved in the reasoning path
  relationships: Relationship[]; // Edges traversed
  hops: number;              // Depth of the path
  confidence: number;        // Calculated score of path validity
  provenance: string[];      // Source document IDs
}

interface RetrievalResult {
    content: string;
    paths: EvidencePath[];
    meta: {
        latency: number;
        model: string;
    };
}
```

### 3.3. Observer Agent (Quantitative Truth Engine)
The Observer Agent is elevated from a passive logger to a quantitative metric emitter for procurement-grade evidence.

**Metrics to Emit:**
*   **Retrieval Delta:** Semantic distance between vector-only and graph-augmented results.
*   **Graph Hop Entropy:** Measure of reasoning path complexity/divergence.
*   **Cross-Agent Task Latency:** End-to-end performance tracking.
*   **Hallucination Suppression Rate:** (Proxy) Rejection rate of ungrounded generated claims.

## 4. Implementation Requirements

### 4.1. Functional Requirements
*   **F1:** `KG2RAGRetriever` must accept a natural language query and return a `RetrievalResult`.
*   **F2:** System must support "Strict Mode" where generation is refused if no valid graph path supports the answer.
*   **F3:** All graph traversals must be logged to the `HashChainLedger` for auditability.
*   **F4:** Integration with existing `nl2cypher` capabilities for query translation.

### 4.2. Non-Functional Requirements
*   **NF1:** Latency < 2000ms for p95 queries.
*   **NF2:** Support for 1M+ nodes in Neo4j without degradation.
*   **NF3:** VRAM usage must remain within 3x reduction target compared to pure LLM context stuffing.

## 5. Next Actions (Immediate)
*   **Week 0:** Green-light Phase 1, Define Feature Flag, Lock Neo4j Schema.
*   **Week 1:** Implement `KG2RAGRetriever`, Integrate Qdrant+Neo4j, Wire Observer Metrics.
*   **Week 2:** Benchmark vs GraphRAG, Tune Weighting, Expose GraphQL Resolver.
