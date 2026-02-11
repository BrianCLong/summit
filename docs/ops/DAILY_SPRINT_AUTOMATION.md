# Daily Sprint Automation Loop

Use `scripts/ops/daily-sprint-loop.sh` to generate a daily sprint evidence bundle.

## Command

```bash
scripts/ops/daily-sprint-loop.sh 2026-02-11
```

Or through the Make task runner:

```bash
make daily-sprint DATE=2026-02-11
```

If no date is provided, the script uses the current UTC date (`YYYY-MM-DD`).

## Outputs

For a run date `YYYY-MM-DD`, the script writes:

- Evidence bundle directory: `docs/ops/evidence/daily-sprint-YYYY-MM-DD/`
  - `pr_list.txt`
  - `issue_list.txt`
  - `daily-sprint.md`
  - `report.json`
  - `metrics.json`
  - `stamp.json`

If runtime commands fail, error details are captured in `report.json.failures` and may also appear in `*.err` files beside tool outputs.

## Determinism Contract

- `report.json` and `metrics.json` are deterministic for identical input files.
- `stamp.json` contains checksums for `report.json` and `metrics.json`, plus generation metadata.
- Runtime tool failures are captured explicitly and do not abort bundle generation.

## Validation

```bash
make daily-sprint-validate DATE=2026-02-11

# direct JSON checks (equivalent)
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/report.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/metrics.json >/dev/null
python3 -m json.tool docs/ops/evidence/daily-sprint-YYYY-MM-DD/stamp.json >/dev/null
```
