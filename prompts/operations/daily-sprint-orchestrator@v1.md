# Daily Sprint Orchestrator v1

## Objective
Produce a focused daily sprint plan from current repo/PR state, execute the highest-leverage tasks that are safe and feasible, and emit deterministic evidence artifacts.

## Inputs
- Open PRs and high-priority issues (security, GA, governance, performance).
- Local CI / validation signals (when available).
- Repository governance and AGENTS.md constraints.

## Required Outputs
- `docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md` with plan, execution log, blockers, and end-of-day summary.
- Evidence bundle under `docs/ops/evidence/daily-sprint-<YYYY-MM-DD>/` containing `report.json`, `metrics.json`, `stamp.json`, plus raw command outputs.
- `docs/roadmap/STATUS.json` updated with a revision note for the sprint run.

## Constraints
- Evidence-first outputs; no policy bypasses.
- Record blockers as "Deferred pending X".
- Minimize scope, prefer smallest viable changes.
