# Temporal Reasoning Evaluation Harness

This harness evaluates Summit's ability to reason correctly about time in generated answers.

## Features

The evaluator checks for:
- **Date and time period accuracy**: Ensures dates mentioned in the answer match the source documents.
- **Historical vs. Current state**: Distinguishes between old (historical) information and the current state of affairs.
- **Temporal ordering**: Verifies that events are mentioned in the correct chronological order.
- **Recency bias**: Detects if the system over-weights recent sources over more authoritative older ones.
- **Relative time references**: Checks if relative terms like "last year" or "recently" are correctly resolved based on the document timestamps.
- **Stale source flagging**: Checks if the system warns when the information is based on old/stale sources.

## How to Run

From the root directory, run:

```bash
cd evals/temporal-reasoning
python run_eval.py
```

The evaluation results will be saved as evidence in `evidence/runs/temporal-reasoning/`, including:
- `report.json`: Detailed findings for each fixture.
- `metrics.json`: Summary scores (`temporal_accuracy_score`, `recency_bias_rate`).
- `stamp.json`: Metadata about the evaluation run.

## Fixtures

Test fixtures are located in `evals/fixtures/temporal-reasoning/fixtures.jsonl`. Each line is a JSON object representing a test case.
