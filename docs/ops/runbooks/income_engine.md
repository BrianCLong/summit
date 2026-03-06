# Income Engine Operational Runbook

## Feature Gate

- Flag: `SUMMIT_ENABLE_INCOME_ENGINE`
- Default: OFF
- Rollback: Set flag to `0` and redeploy.

## Failure Scenarios

1. Missing evidence links -> schema/validation failure.
2. Prohibited hype claims -> claim-policy failure.
3. Determinism drift -> snapshot mismatch in CI tests.

## Drift Detection

Use `scripts/monitoring/income-engine-drift.py` weekly.

Alert thresholds:

- Projection variance > 15% (warning)
- Projection variance > 10% (drift flag)
- Simplicity score inflation > 0.10
- Evidence ID format mismatch
