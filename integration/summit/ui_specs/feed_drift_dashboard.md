# UI Spec: Feed Drift Dashboard

## Purpose

Visualize FASC calibration outcomes, drift alarms, and quarantine actions.

## Key Elements

- Feed list with reliability scores, weights, drift indicators, and dwell timers.
- Charts showing divergence metrics over time and outcome alignment rates.
- Action drawer to review justification witness and replay calibration with determinism token.

## States

- **Healthy:** No drift; weight steady.
- **Drifting:** Divergence above threshold; dwell timer active.
- **Quarantined:** Feed down-weighted/excluded; corroboration path indicator; recovery ramp controls.
