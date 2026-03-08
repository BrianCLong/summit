# StructCorr Runbook

## Local execution

1. `export SUMMIT_STRUCTCORR=1`
2. Execute `run_structcorr` with payload fixtures.
3. Review artifacts under `artifacts/structcorr/`.

## Failure interpretation

- `severity=fail` indicates contract violation.
- CI gate should fail when fail findings are present.

## Add a validator

1. Implement validator under `src/summit/structcorr/validators/`.
2. Register validator in `runner.py`.
3. Add targeted `pytest` file under `tests/structcorr/`.
4. Add metric key and drift mapping.

## Threshold adjustments

- Update policy thresholds in the same PR as evidence updates.
- Require governance approval for threshold relaxations.
