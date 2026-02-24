# Runbook: SpreadsheetBench Verified

## Purpose

Run SpreadsheetBench Verified-style evaluations with deterministic artifacts and CI-ready scoring.

## Preconditions

* Dataset fetched into the Summit cache (no vendoring).
* Spreadsheet sandbox is available (Linux-first; network disabled).

## Commands

### Smoke (CI)

```
summit run spreadsheetbench_verified_smoke --max-tasks 20 --seed 0
```

Expected outputs:

* `artifacts/<run_id>/report.json`
* `artifacts/<run_id>/metrics.json`
* `artifacts/<run_id>/stamp.json`
* `artifacts/<run_id>/evidence/EV-SSB-000001/`

### Full (local)

```
summit run spreadsheetbench_verified --max-tasks 400 --seed 0
```

## Failure modes

* **Calc engine mismatch**: Results differ due to spreadsheet engine recalculation.
  * Mitigation: keep LibreOffice recalculation behind a feature flag (default OFF).
* **Policy deny**: External link or embedded object blocked.
  * Mitigation: verify deny list and confirm policy outcome in evidence bundle.
* **Timeout**: Per-task execution exceeds budget.
  * Mitigation: reduce task count, verify sandbox resource limits.

## SLO assumptions

* CI smoke target: ≤ 5 minutes, ≤ 2 GB RAM.
* Per-task timeout: 30–60s (configurable).

## Evidence review

* Confirm deterministic artifacts (no timestamps in `metrics.json` or `stamp.json`).
* Validate `metrics.json` reproducibility across reruns on the same runner image.

## Drift monitoring (optional)

* Run a nightly 20-task fixed seed job.
* Alert if pass@1 regresses beyond the configured threshold.

## Rollback

* Disable the SpreadsheetBench runner feature flag.
* Remove or quarantine the dataset cache and rerun the prior benchmark pack.
