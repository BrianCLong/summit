# Summit Eval Harness

This module provides tools for evaluating LLM models against standardized datasets.

## Dataset Format

Datasets are JSONL files where each line is a JSON object matching `dataset.schema.json`.

Fields:
* `id`: Unique identifier.
* `case_type`: `accuracy`, `out_of_scope`, or `guardrails`.
* `question`: The input prompt/question.
* `reference_answer`: The expected answer (optional for refusal cases).
* `expected_behavior`: `answer` or `refuse`.

## Fixtures

* `fixtures/policy_rag_small.jsonl`: Small dataset for testing and verification.
