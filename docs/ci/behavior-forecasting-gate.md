# Behavior Forecasting CI Gate

## Purpose
The behavior forecasting gate evaluates agent scenario trajectories before allowing a PR to merge. It uses deterministic serial trajectory evaluation.

## Artifacts
Produces:
- `report.json`
- `metrics.json`
- `stamp.json`
with prefix `EVID-BF-SCENARIO-`.

## Policies
Enforces policies in `.opa/policy/behavior_forecasting.rego`. If `deny` evaluates to true, the CI job fails.
