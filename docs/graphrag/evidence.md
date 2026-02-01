# GraphRAG Evidence System

Every GraphRAG request generates a set of deterministic evidence artifacts to ensure auditability and reproducibility.

## Artifacts

### `report.json`
Contains the outcome of the request, including the selected explanation, rejected alternatives, and references to the proof subgraph.

### `metrics.json`
Includes performance and quality metrics:
- `robustness`: Components of the robustness score.
- `faithfulness`: Measure of how well the answer is grounded in evidence.
- `refusal_rate`: Frequency of selective answering.
- `latency`: Timing for each phase.

### `stamp.json`
Ensures reproducibility by recording:
- `git_sha`: The version of the code used.
- `timestamp`: When the request was processed.
- `run_id`: Unique identifier for the execution.

## Reproducibility
The offline evaluation harness (`tools/repro/run_offline_eval.sh`) verifies that identical inputs produce bitwise-identical artifacts.
