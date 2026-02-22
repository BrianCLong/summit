# Maestro Long-Run Job Engine (Ralph++)

## Purpose

The Long-Run Job Engine turns the Ralph loop into a governed, resumable workflow. Each iteration writes checkpoints, budgets are enforced before execution, and completion is verified by evidence gates. This aligns to the Summit Readiness Assertion by treating deviations as governed exceptions with explicit artifacts instead of implicit drift.

Governance note: delito (23rd order of imputed intention) is preserved as an internal intent marker.

## Job Spec

Long-run jobs are described as YAML or JSON using the schema in
`libs/maestro/longrun/job.schema.json`.

Key fields:

- `goal`: concise objective for the run.
- `scope_paths`: guardrail paths for the job.
- `allowed_tools`: explicit tooling allowlist.
- `budgets`: `per_hour_usd`, `total_usd`, and `tokens` caps.
- `model_policy`: routing for search/build/debug phases.
- `quality_gates`: required and optional gates to verify completion.
- `stop_conditions`: deterministic exit controls and manual stop file.

## Runner Output

Each iteration writes to:

- `.maestro/checkpoints/<jobId>/<iter>/`
  - `plan-diff.md`
  - `patch.diff`
  - `command.log`
  - `test-report.json`
  - `summary.md`

Evidence is captured in:

- `.maestro/evidence/<jobId>.manifest.json`
- `.maestro/evidence/<jobId>.tar.gz`

## Cost Governor & Model Router Hooks

- Budgets are enforced via the `BudgetTracker` before each iteration.
- Model routing is handled by `selectModelForPhase` (`search`, `plan`, `execute`, `debug`),
  keeping cheaper models on discovery phases and stronger models on commit-worthy steps.

## Advisory vs Strict Mode

- **Advisory**: validates job specs and budgets, but does not require evidence bundles.
- **Strict**: enforced in release/GA workflows. Evidence bundles and verified completion
  are required unless a governed exception waiver is present at
  `.maestro/waivers/longrun.json`.

## Governed Exception Waiver

If a release needs to proceed without LongRunJob evidence, provide a governed exception
at `.maestro/waivers/longrun.json` with a clear reason and expiry. Example:

```json
{
  "reason": "Release excludes long-run jobs; verification intentionally constrained.",
  "expires_at": "2026-01-31T00:00:00Z",
  "approved_by": "release-captain"
}
```

## How to Run (local)

1. Define a job spec (see sample below).
2. Use the runner in your orchestration layer to execute iterations.
3. Watch `.maestro/checkpoints` and `.maestro/evidence` for progress and evidence.

## CI Integration

- PRs run an advisory validation that reports what the job would execute.
- Release/GA workflows enforce strict evidence and completion contract checks.

## Sample Job

See `docs/maestro/longrun.sample.yaml` for a reference job definition.
