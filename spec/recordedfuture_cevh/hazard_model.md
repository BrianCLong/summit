# CEVH Hazard Model

## Model overview

- Use survival analysis with time-varying covariates.
- Apply exponential decay to stale exposure signals.
- Output hazard curves with confidence intervals.

## Calibration

- Train per asset class and environment segment.
- Recalibrate on a rolling basis to handle drift.
- Persist model version and calibration metadata for replay.

## Decomposition witness

- Maintain a minimal support set of signals contributing to the hazard value.
- Compute counterfactual hazards with signal removal.
