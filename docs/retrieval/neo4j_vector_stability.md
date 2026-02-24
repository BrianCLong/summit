# Neo4j Vector Search Stability & Optimization

## 1. Overview
Vector search results in Neo4j (powered by Lucene) can be non-deterministic due to:
- Approximate Nearest Neighbor (ANN) shortcuts.
- Index updates (segment merges).
- Use of `k` limits (retrieving different sets of candidates).

Summit employs a "Hybrid + Pivot" strategy to mitigate this and ensure reliable, secure retrieval.

## 2. Stability Contract
We enforce a **Retrieval Contract** (`retrieval/neo4j/contract.py`) that:
- **Mandates Filters:** Every query must include `tenant_id` or `access_scope`.
- **Deterministic Sort:** Ties in score are broken by node ID ascending.
- **Drift Monitoring:** We measure Jaccard@k overlap and RBO (Rank-Biased Overlap) to detect index drift.

## 3. Hybrid Retrieval
Enabled via `SUMMIT_HYBRID_RETRIEVAL=1`.
Combines:
- **Vector Search:** Semantic similarity.
- **Keyword/Exact Search:** Precision for identifiers and rare tokens.

## 4. Pivot Search
Enabled via `SUMMIT_PIVOT_EXPAND=1`.
Steps:
1. Retrieve "Pivot Nodes" via vector search.
2. Traverse edges (e.g., `RELATED`, `LINKS_TO`) to gather context.
3. Return `pivots` + `context_triplets`.

## 5. Debugging Drift
If retrieval results seem unstable:
1. Check `k`. Small `k` in HNSW indexes can be unstable.
2. Check ingestion. Frequent updates cause index churn.
3. Use `scripts/check_drift.py` (simulated in `tests/retrieval/test_drift.py`).

## 6. Schema Readiness
Run `python3 retrieval/neo4j/schema_lint.py` to verify:
- Tenancy facets exist on nodes.
- Embedding provenance (model/version) is tracked.
