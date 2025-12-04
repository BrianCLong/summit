# SRE v0.1 Evaluation Card

## 1. Overview
This benchmark evaluates the initial version of the Summit Reasoning Evaluator (SRE) against a mock math reasoning dataset. The goal is to validate the pipeline: Trace Ingestion -> Graph Normalization -> Metric Computation.

## 2. Methodology
*   **Dataset**: `mock_math.jsonl` (3 synthetic math problems).
*   **Model**: Simulated traces (not live inference).
*   **Metrics**:
    *   `exact_match`: Correctness of final answer.
    *   `trace_length`: Number of graph nodes (proxy for reasoning effort).
    *   `tool_efficiency`: Ratio of unique tools to call nodes.

## 3. Results Summary

| Episode ID | Exact Match | Trace Length | Tool Efficiency |
| :--- | :--- | :--- | :--- |
| math-1 | 1.0 | 4.0 | 1.0 |
| math-2 | 1.0 | 5.0 | 1.0 |
| math-3 | 1.0 | 4.0 | 1.0 |

*Note: All test cases passed exact match, confirming the adapter correctly parses the "Answer:" line.*

## 4. Observations
*   **Graph Representation**: Successfully mapped linear text logs into DAGs (Node Types: Thought, Call, Observation).
*   **Metric Pluggability**: The `Metric` interface successfully handled both graph-structural metrics (`trace_length`) and outcome metrics (`exact_match`).
*   **Efficiency**: Parsing and evaluation overhead is negligible (<10ms per episode).

## 5. Caveats
*   **Adapter Fragility**: The regex-based adapter in `experiments/adapter.py` is brittle and assumes a strict "Thought/Call/Observation" format.
*   **Mock Data**: Results are synthetic. Real-world traces will have more noise.
