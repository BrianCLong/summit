# skill-triage-to-spec

## Purpose

Convert a GitHub issue into a deterministic spec, task breakdown, and acceptance tests.

## Inputs

- Issue URL or issue JSON payload.
- Target scope paths.
- Required policy references (prompt registry + governance docs).

## Determinism Requirements

- Sort referenced files and tasks in stable order.
- Do not include timestamps or run IDs in deterministic outputs.
- All outputs must be reproducible from inputs and repo state.

## Steps

1. Normalize issue text into a structured summary.
2. Extract requirements, risks, and constraints.
3. Produce a spec with acceptance criteria and task breakdown.
4. Emit evidence bundle artifacts for the run.

## Output Artifacts

- `artifacts/agentic/<task>/<run-id>/stamp.json`
- `artifacts/agentic/<task>/<run-id>/report.json`
- `artifacts/agentic/<task>/<run-id>/report.md`
- `artifacts/agentic/<task>/<run-id>/provenance.json`
- Optional `diffs.patch`
