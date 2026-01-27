# GraphRAG Evaluation & Benchmarks

## Objectives
To measure the effectiveness, accuracy, and reliability of the GraphRAG system compared to standard vector-based RAG baselines.

## Metrics

### 1. Accuracy & Faithfulness
*   **Retrieval Recall**: % of relevant ground-truth nodes retrieved.
*   **Faithfulness**: Does the answer strictly follow the retrieved context? (Measured via LLM-as-a-Judge).
*   **Citation Accuracy**: Are the provided citations correct and relevant?

### 2. Determinism & Stability
*   **Replay Consistency**: % of runs producing byte-identical context for identical inputs (Target: 100%).
*   **Ordering Stability**: Consistency of retrieval ranking order.

### 3. Performance
*   **Latency**: End-to-end response time (P95, P99).
*   **Token Efficiency**: Number of tokens used to achieve a correct answer (GraphRAG can be more concise).

## Benchmark Harness

### Dataset
*   **Internal Governance Corpus**: A set of 50 complex governance questions requiring multi-hop reasoning (e.g., "Which policies apply to data export in the EU region?").

### Comparison
*   **Baseline**: Standard RAG (Top-K vector search on chunks).
*   **Experiment**: GraphRAG (Vector entry + 2-hop traversal).

### Methodology
1.  **Ingest**: Load corpus into both systems.
2.  **Query**: Run the 50-question set against both.
3.  **Evaluate**:
    *   Automated: Check determinism and recall.
    *   Human/LLM: Grade answer quality and citation correctness.

## CI Integration
A lightweight version of this benchmark (3-5 smoke test queries) runs in CI to enforce the **Replay Gate**.
