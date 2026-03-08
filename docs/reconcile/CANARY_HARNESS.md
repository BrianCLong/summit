# Canary Replay & Reconciliation Harness

**(A) Determinism** — `final_graph_state_hash` is **identical across 1000 randomized replays** of the same recorded dataset.
**(B) Convergence** — Reconciliation window drift <= **0** within **<= 3** windows (configurable `RECONCILE_MAX_WINDOWS=3`).
**(C) Safety** — **No-op rate >= 99.9%** for out-of-order events (only strictly newer LSNs mutate nodes).
**(D) Perf** — **Median reconciliation latency per window <= X ms** (define **X** off your current baseline on canary hardware; persist baseline in repo).

Connector knobs & semantics cited for behavior you must configure/observe:

* **Debezium PostgreSQL** connector event model (`op`, `before`, `after`, per-table topic).
* **Tombstones** after deletes (`tombstones.on.delete=true` by default; controls compaction/delete propagation).
* **Neo4j `MERGE` semantics** (`ON CREATE` / `ON MATCH`) to ensure idempotent upserts.
