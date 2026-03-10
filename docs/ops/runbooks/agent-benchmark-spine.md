# Agent Benchmark Spine Runbook

## Failed Run Triage
If the benchmark fails:
1. Check if the fixture matches the latest schema version.
2. Ensure the spine runner is executed deterministically without external state.
3. Review `report.json`, `metrics.json`, and `stamp.json` in `artifacts/agent-spine`.

## Artifact Inspection
Artifacts are emitted to `artifacts/agent-spine/`. Ensure timestamps or random IDs have not been introduced to `report.json`, `metrics.json`, or `stamp.json`.

## Regression Protocol
If the score contract unexpectedly changes:
1. Do not merge the PR.
2. Verify if the tool trace has been altered.
3. Only update expected evidence if it accurately reflects a deterministic update to the model trace behavior.
