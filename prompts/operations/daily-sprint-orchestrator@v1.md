# Daily Sprint Orchestrator (v1)

## Objective
Run the Summit daily sprint loop: capture current PR and issue triage signals, produce a focused sprint plan, execute the plan within the day, and emit deterministic evidence artifacts and a final report.

## Required Outputs
- `docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md` with plan, execution log, MAESTRO alignment, blockers, and end-of-day summary.
- Evidence bundle under `docs/ops/evidence/daily-sprint-<YYYY-MM-DD>/` containing at least `report.json`, `metrics.json`, and `stamp.json`.
- Updated `docs/roadmap/STATUS.json` metadata for the sprint run.

## Operating Rules
- Follow repository AGENTS and governance requirements.
- Capture PR and labeled-issue snapshots using `gh` where available; record failures as evidence.
- Keep changes scoped to docs/ops artifacts unless a specific PR fix is in-scope.
- Do not bypass gates; document blockers instead.
- End with a final status statement and a concise summary of completed/in-progress/blocked items.
