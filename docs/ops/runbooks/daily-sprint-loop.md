# Runbook: Daily Sprint Loop

## Purpose
Generate a daily sprint evidence bundle with deterministic machine-readable artifacts.

## Entrypoints
- Script: `scripts/ops/daily-sprint-loop.sh`
- Make target: `make daily-sprint DATE=YYYY-MM-DD`
- Workflow: `.github/workflows/daily-sprint-loop.yml`

## Artifacts
For run date `YYYY-MM-DD`, outputs are written under:
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/pr_list.txt`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/issue_list.txt`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/daily-sprint.md`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/report.json`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/metrics.json`
- `docs/ops/evidence/daily-sprint-YYYY-MM-DD/stamp.json`

## Failure Behavior
- Tool failures are captured in `report.json.tool_runs` and `report.json.failures`.
- The loop still emits a complete bundle for auditability.

## Validation
```bash
bash -n scripts/ops/daily-sprint-loop.sh
scripts/ops/daily-sprint-loop.sh 2026-02-11
python3 -m json.tool docs/ops/evidence/daily-sprint-2026-02-11/report.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-2026-02-11/metrics.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-2026-02-11/stamp.json >/dev/null
```
