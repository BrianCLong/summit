# Prompt: Daily Sprint Automation Loop (v1)

## Objective
Generate a deterministic daily sprint sensing bundle using the automation loop and record governance-aligned status updates.

## Required Outputs
- `scripts/ops/daily-sprint-loop.sh`
- `docs/ops/DAILY_SPRINT_AUTOMATION.md`
- `docs/ops/DAILY_SPRINT_YYYY-MM-DD.md`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/`
- `docs/roadmap/STATUS.json`
- `agents/examples/DAILY_SPRINT_AUTOMATION_LOOP_20260211.json`
- `prompts/registry.yaml`

## Constraints
- Evidence-first output only; failures must be captured in `*.err` artifacts.
- Deterministic outputs: write `report.json`, `metrics.json`, and `stamp.json`.
- Keep scope in docs/ops and scripts/ops for this workflow.
- Do not bypass governance checks.

## Verification
- `bash -n scripts/ops/daily-sprint-loop.sh`
- `python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/report.json >/dev/null`
- `python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/metrics.json >/dev/null`
- `python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/stamp.json >/dev/null`
