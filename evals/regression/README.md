# Regression Evals Suite

This directory contains standalone, deterministic regression tests for previously identified and fixed issues, focusing on GraphRAG retrieval, Knowledge Graph construction, and API Gateway paths.

Each test is labeled with the corresponding issue or commit that originally fixed the bug.

## Requirements
* Tests must be runnable standalone and deterministic.
* They belong to the `evals/regression/` surface.
* They ensure known bugs are not reintroduced into the codebase.

## Running Tests
Tests can be executed using `pytest`:

```bash
pytest evals/regression/
```
