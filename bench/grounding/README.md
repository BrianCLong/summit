# IntelGraph Grounding & Plan Determinism Benchmark

This micro-benchmark measures claim-grounding precision and plan determinism for the GraphRAG stack.

## Metrics

* **precision@k**: Precision of retrieved entities against gold standard.
* **grounding_accuracy**: % of queries where all gold entities are found within top-k.
* **plan_consistency**: % of runs producing identical Cypher query plans (via `EXPLAIN` hashes).
* **plan_entropy**: Information entropy of query plans (lower is better/more deterministic).
* **latency_ms**: p50/p95 execution time.

## Setup

1.  **Configure Environment**:
    ```bash
    cp bench/grounding/conf.example.env .env
    # Edit .env with your Neo4j credentials
    ```

2.  **Seed the Graph**:
    ```bash
    cypher-shell -f bench/grounding/seeded_graph.cypher
    ```

3.  **Run Benchmark**:
    ```bash
    python3 bench/grounding/run_benchmark.py
    ```

4.  **Baseline**:
    If this is the first run, copy `results.json` to `base.json` to establish a baseline for CI:
    ```bash
    cp bench/grounding/results.json bench/grounding/base.json
    ```

## CI Integration

The `ci_asserts.py` script compares current results against `base.json`. It will fail if:
* `precision@k` drops by more than 0.05.
* `plan_consistency` falls below 95%.
