# Daily Sprint Automation Loop

Use `scripts/ops/daily-sprint-loop.sh` to generate a daily sprint sensing report and an evidence bundle.

## Command

```bash
scripts/ops/daily-sprint-loop.sh 2026-02-11
```

If no date is provided, the script uses the current UTC date (`YYYY-MM-DD`).

## Outputs

For a run date `YYYY-MM-DD`, the script writes:

- Report: `docs/ops/DAILY_SPRINT_YYYY-MM-DD.md`
- Evidence bundle directory: `docs/ops/evidence/daily-sprint-YYYY-MM-DD/`
  - `pr_list.txt`
  - `pr_list.err`
  - `issue_list.txt`
  - `issue_list.err`
  - `report.json`
  - `metrics.json`
  - `stamp.json`

## Determinism Contract

- `report.json` and `metrics.json` are generated from raw evidence files.
- `report.json` includes tooling posture (`gh_available`, `gh_authenticated`) to make runtime constraints explicit.
- `stamp.json` is a SHA-256 digest over `report.json`, `metrics.json`, and raw logs (`pr/issue` `.txt` + `.err`).
- Failures to execute GitHub triage are captured as evidence; runs remain complete with explicit blockers.

## Runtime Guardrails

- Run date input is validated against `YYYY-MM-DD` and calendar validity.
- If `gh` is installed but not authenticated, triage remains non-blocking and evidence records the auth constraint.

## Validation

```bash
node scripts/check-boundaries.cjs
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/report.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/metrics.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/stamp.json >/dev/null
```
