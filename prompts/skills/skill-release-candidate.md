# skill-release-candidate

## Purpose

Prepare a release-candidate checklist, version bump plan, and GA evidence delta.

## Inputs

- Release scope and target version.
- Prior release evidence references.
- Required CI and governance gates.

## Determinism Requirements

- Stable ordering for checklist items.
- No timestamps or run IDs in deterministic outputs.
- Evidence bundle required for every release-candidate update.

## Steps

1. Compile checklist and version bump plan.
2. Map GA evidence deltas to existing artifacts.
3. Emit evidence bundle artifacts.

## Output Artifacts

- `artifacts/agentic/<task>/<run-id>/stamp.json`
- `artifacts/agentic/<task>/<run-id>/report.json`
- `artifacts/agentic/<task>/<run-id>/report.md`
- `artifacts/agentic/<task>/<run-id>/provenance.json`
- Optional `diffs.patch`
