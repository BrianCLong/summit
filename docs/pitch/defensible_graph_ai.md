# Technical Deep Dive: Why Summit is Defensible

**Target Audience:** VC Technical Due Diligence, Enterprise Architects
**Classification:** Confidential

## Executive Summary

Summit has built a structural moat around **Deterministic Graph Interaction**. While competitors optimize vector search (commodity), we optimize the **Query Compiler Layer**.

## The Architecture of the Moat

### 1. The Intent Compiler (The "Brain")
Competitors connect LLMs directly to Vector DBs.
**Summit** inserts a compiler layer:
`User Query` -> `LLM (Intent Extraction)` -> `IntentSpec (JSON)` -> `Cypher Generator` -> `Graph DB`

**Why this wins:**
*   **Testability:** We can unit test the `IntentSpec` generation separately from the graph execution.
*   **Security:** The LLM never touches the DB directly. The `IntentSpec` is validated against a schema (preventing injection).
*   **Portability:** The `IntentSpec` is DB-agnostic. We can swap Neo4j for Memgraph or AWS Neptune without changing the reasoning logic.

### 2. Evidence Budgeting (The "Governor")
We enforce hard limits on graph traversal at the engine level.
*   **Competitor Approach:** Retrieve top-100 chunks, stuff context, hope for the best.
*   **Summit Approach:** Calculate "Reasoning Cost." If a query requires >50 nodes, we require `HighCompute` authorization or reject it.

**Why this wins:**
*   **Predictable Opex:** We can guarantee the cost-per-query.
*   **Anti-Hallucination:** Smaller, highly-structured contexts yield higher accuracy than large, noisy ones.

### 3. Neural Priors (The "Wisdom")
We bake ML insight into the graph *offline*.
*   Node Property: `trust_score` (Computed by GNN)
*   Edge Property: `influence_weight` (Computed by GNN)

**Why this wins:**
*   **Latency:** Runtime query is simple `ORDER BY trust_score`. No expensive model inference during the user request.
*   **Stickiness:** The more data the customer loads, the better our GNN priors get, making the graph asset stickier.

## Competitive Kill-Points

| Feature | LangChain / LlamaIndex | Summit |
| :--- | :--- | :--- |
| **Query Logic** | Black-box prompt | compiled `IntentSpec` |
| **Consistency** | Low (temperature dependent) | High (deterministic sorting) |
| **Audit Trail** | Source Text only | Source + Query Path + Logic |
| **Compliance** | Hard to certify | SOC2 Ready (Control GR-001) |
