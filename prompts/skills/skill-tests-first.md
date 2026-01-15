# skill-tests-first

## Purpose

Generate or update tests before implementing code changes, then close the gap until tests pass.

## Inputs

- Target files or modules.
- Desired behavior specification.
- Existing test suite locations.

## Determinism Requirements

- Ensure test lists and file references are sorted.
- Avoid time-based snapshots or random seeds without fixed values.
- Outputs must be derived from repo state and inputs only.

## Steps

1. Identify relevant test suites and add/update tests.
2. Implement or adjust code to satisfy the tests.
3. Record commands and outputs in the evidence bundle.

## Output Artifacts

- `artifacts/agentic/<task>/<run-id>/stamp.json`
- `artifacts/agentic/<task>/<run-id>/report.json`
- `artifacts/agentic/<task>/<run-id>/report.md`
- `artifacts/agentic/<task>/<run-id>/provenance.json`
- Optional `diffs.patch`
