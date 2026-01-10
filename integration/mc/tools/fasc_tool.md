# MC Tool: FASC

## Purpose

Retrieve feed calibration status, drift alerts, and quarantine decisions.

## Inputs

- `feed_ids`: list of feeds.
- `time_window`: calibration window.

## Outputs

- Feed weights and reliability scores.
- Drift indicators and quarantine actions.
- Calibration artifact references.

## Guardrails

- Verify policy decision references for quarantine outputs.
