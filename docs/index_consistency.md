# Index Consistency

## Readiness Gates
To ensure that retrieval systems do not serve stale or inconsistent data, we use a readiness gating mechanism.

## Receipts
Each delta batch produces a receipt:
1.  `delta_emitted`
2.  `graph_applied`
3.  `index_applied` (Semantic/Vector index updated)
4.  `ready=true`

## Policy
*   If `ready=false` (or `index_applied` is missing for a recent graph update), the semantic index is considered "lagging".
*   Retrieval requests should fallback to graph-only methods or warn the user.
*   Divergence checkers monitor the lag between `graph_applied` and `index_applied`.
