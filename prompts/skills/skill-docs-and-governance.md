# skill-docs-and-governance

## Purpose

Update governance documentation and evidence maps deterministically.

## Inputs

- Documentation change request.
- Governance index files to update.
- Evidence references and required citations.

## Determinism Requirements

- Append-only updates unless explicitly authorized.
- Stable ordering of references and indices.
- No timestamps in deterministic outputs.

## Steps

1. Identify required governance docs and indexes.
2. Apply updates with stable ordering and consistent terminology.
3. Emit evidence bundle artifacts.

## Output Artifacts

- `artifacts/agentic/<task>/<run-id>/stamp.json`
- `artifacts/agentic/<task>/<run-id>/report.json`
- `artifacts/agentic/<task>/<run-id>/report.md`
- `artifacts/agentic/<task>/<run-id>/provenance.json`
- Optional `diffs.patch`
