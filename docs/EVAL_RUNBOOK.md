# LLM Evaluation Runbook

This guide explains how to run, interpret, and add evaluations for the Summit LLM features.

## Quick Start

To run the core evaluation suite locally:

```bash
# Install dependencies (first time only)
pip install -r eval/requirements.txt

# Run evals (requires local API running, or use --mock)
python eval/runner.py --suite eval/suites/core_evals.yaml --mock
```

Results are stored in `.evidence/eval_results/`.

## Adding a New Eval Case

1.  **Create/Update Dataset**: Add JSONL entries to `GOLDEN/datasets/`.
    *   Format: `{"context": "...", "expected_output": "...", "keywords": [...]}`
2.  **Update Suite**: Edit `eval/suites/core_evals.yaml` to include the new task.
    ```yaml
    - id: my_new_task
      dataset: GOLDEN/datasets/my_dataset.jsonl
      metric: keyword_match # or exact_match, refusal_check
    ```
3.  **Run & Verify**: Run the runner and check the report.

## Regression Detection

The runner automatically compares the current run against the most recent previous run in `.evidence/eval_results/`.
If the score drops by more than 0.1, it flags a regression.

## Metrics

*   **exact_match**: 1.0 if output matches expected string exactly (trimmed), 0.0 otherwise.
*   **keyword_match**: Fraction of keywords found in the output.
*   **refusal_check**: 1.0 if output contains refusal terms (e.g., "cannot", "policy"), 0.0 otherwise.
