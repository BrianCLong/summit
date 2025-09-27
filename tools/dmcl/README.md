# Data Mutation Chaos Lab (DMCL)

DMCL is a hybrid Python/Go harness that stress-tests data pipelines by injecting deterministic, structured corruptions. It focuses on resilience behaviors such as blocks, redactions, and fallbacks.

## Features

- Deterministic mutation engine implemented in Go (`dmcl_mutator`).
- Pipeline orchestrator written in Python (`dmcl.py`).
- Supports multiple mutation modes: type drift, null bursts, schema shifts, duplicate storms, and timestamp skew.
- Produces JSON and Markdown resilience scorecards plus a PR gate report.
- Deterministic artifacts when run with the same seed.

## Quick Start

1. Create a DMCL configuration (JSON) describing the base dataset, scenarios, and pipeline commands. A sample configuration is provided in `sample_config.json`.
2. Ensure your pipeline command accepts the mutated dataset path via `{input}` placeholder or reads it from the `DMCL_MUTATED_INPUT` environment variable.
3. Run the orchestrator:

```bash
python tools/dmcl/dmcl.py tools/dmcl/sample_config.json
```

Artifacts are written to `reports/dmcl/` by default. The same seed guarantees byte-identical reports.

## Mutation Behaviors

| Mutation          | Description                                                                  |
| ----------------- | ---------------------------------------------------------------------------- |
| `type_drift`      | Converts numeric fields to strings (and vice versa) to test type validation. |
| `null_bursts`     | Injects nulls across records to test null-handling.                          |
| `schema_shift`    | Removes existing fields and introduces shadow fields.                        |
| `duplicate_storm` | Duplicates records to test idempotency/deduplication.                        |
| `timestamp_skew`  | Skews timestamp fields forward/backward to test ordering/expiry logic.       |

## Governance Scoring

Each scenario defines acceptable behaviors (e.g., `blocked`, `redaction`, `fallback`, `alert`). DMCL compares observed behavior from pipeline execution to expectations and computes a resilience ratio. The PR gate passes when the ratio meets the configured threshold.
