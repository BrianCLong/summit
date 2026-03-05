# Income Engine Runbook

## Feature Flag
- `income_engine_enabled` defaults to `false`.
- Rollback: set flag to `false` and stop artifact publication.

## Failure Scenarios
1. Schema validation failure -> reject spec and return validation error.
2. Missing evidence links -> reject projection output.
3. Drift violation (`scripts/monitoring/income-engine-drift.py`) -> fail weekly monitor.

## Drift Detection
- Projection drift threshold: `>10%` week-over-week.
- Alert when `simplicity_score - recurrence_score > 0.15`.
- Alert when evidence ID format breaks regex.
