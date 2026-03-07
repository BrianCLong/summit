# Merge Train Plan

## Branch naming (prevents collisions + makes CI readable)

- `ep1-policy/<task-slug>`
- `ep2-provenance/<task-slug>`
- `ep3-pipelines/<task-slug>`
- `ep4-workbench-ui/<task-slug>`
- `ep5-ai-ux/<task-slug>`
- `ep6-maestro/<task-slug>`
- `ep7-observability/<task-slug>`
- `ep8-security-gates/<task-slug>`
- `ep9-perf-reliability/<task-slug>`

## PR title format

`[EP#][TASK#] <verb> <scope> — <outcome>`
Example: `[EP1][T05] Add OPA decision cache — reduce policy latency`

## Merge order (keeps risk low, velocity high)

1. **Docs/maps/tests-only PRs** across all epics (fast merges, no runtime risk)
2. **Client-only epics** (EP4, EP5) — isolated from server
3. **Policy-only** (EP1) — isolated + strong gates (`policy:test`)
4. **Server isolated modules** (EP2, EP6, EP7, EP9) — one epic at a time if they touch shared server harness
5. **CI/workflows** (EP8) — merge when the tree is stable, since it can change required checks

## Mandatory “merge-safe” rule

**No PR may modify more than one epic’s allowed directory scope.**
If it needs cross-scope, split it.
