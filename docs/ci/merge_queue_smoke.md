# Merge Queue Smoke Check (rq-smoke)

The `rq-smoke` workflow is a merge-queue-safe health check that runs on both
`pull_request` and `merge_group` events. It emits a deterministic artifact keyed
to the commit SHA so merge-preview runs cannot drift from required checks.

## Behavior

- **Stable check name**: workflow `rq-smoke` with job `rq-smoke`.
- **Triggers**: `pull_request`, `merge_group`.
- **Artifact**: `rq-smoke-${{ github.sha }}` containing `rq-smoke-report.json`.

## Required check guidance

Branch protection should require the check name:

```
rq-smoke / rq-smoke
```

This preserves a literal display name for merge-queue compatibility.
