# Runbook: Expectation Baselines

## Failure modes

- Verifier fails due to missing evidence files
- Evidence index mismatch
- Drift detector triggers unexpectedly

## Alerts (spec)

- Signal: drift_metric > threshold
- Action: require baseline audit PR + reviewer sign-off

## SLO assumptions

- Verifier completes under 2s in CI (configurable)
