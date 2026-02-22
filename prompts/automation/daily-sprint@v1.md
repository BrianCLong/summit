# Prompt: Daily Sprint Orchestrator

Objective
- Produce a daily sprint plan and execution log for the Summit repo.
- Capture evidence-first snapshots of open PRs and labeled issues.
- Update execution status metadata in `docs/roadmap/STATUS.json`.

Requirements
- Write the daily sprint log to `docs/ops/DAILY_SPRINT_<YYYY-MM-DD>.md`.
- Ensure evidence output precedes narrative summaries.
- Record blockers as Governed Exceptions.
- Update `docs/roadmap/STATUS.json` with the current UTC timestamp and a short revision note.

Allowed Paths
- `docs/ops/`
- `docs/roadmap/STATUS.json`
- `prompts/automation/daily-sprint@v1.md`
- `prompts/registry.yaml`

Verification
- Ensure the daily sprint log contains:
  - Evidence bundle
  - Sprint plan
  - Execution log
  - Blockers or Governed Exceptions
  - End-of-day report
