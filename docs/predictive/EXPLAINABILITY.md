# Explainability & Evidence

Every prediction must be explainable, reproducible, and supported by evidence. The requirements below are mandatory for all prediction classes in `PREDICTION_CATALOG.md`.

## Required Artifacts per Prediction

- **Feature contributions:** Top positive/negative contributors (e.g., SHAP-style additive terms) with units and directionality.
- **Historical comparables:** Up to N similar windows with matching drivers (e.g., same day-of-week load pattern, prior incident). Include links to raw telemetry.
- **Trend deltas:** Recent deltas vs baseline (e.g., 1h-over-1h change, 24h seasonal delta) with sparkline-ready data.
- **Provenance hash:** Hash of inputs + model code/config + feature pipeline version.
- **Replay token:** Immutable reference to recompute using archived inputs/snapshots.

## Evidence Links

- **Raw metrics:** Query URLs or PromQL/SQL statements for each feature, with freshness SLAs and coverage percentages.
- **Model/training snapshots:** If applicable, pinned snapshot IDs and storage location.
- **Policy versions:** Policy bundle hash used for gating/feature access.
- **Change history:** Links to deployment/change windows overlapping the prediction window.

## Replayability

- **Replay scripts:** `scripts/predict/replay_*.sh` must accept `--timestamp` and `--horizon` and output the same prediction payload given archived inputs.
- **Snapshots:** Persist input slices, model parameters (if any), and feature pipeline versions; reference them in the replay token.
- **Determinism:** Disable nondeterministic seeds; fail if archived inputs are incomplete.

## Operator View Requirements

- Show the **why**: top contributors, comparable windows, and policy limits invoked.
- Show the **confidence & bounds**: p50/p90 (or relevant) with calibration context.
- Show the **limits**: data gaps, disabled horizons, policy blocks, cost ceilings hit.
- Provide **evidence links** inline for immediate verification.

## Quality Gates

- Predictions missing any required artifact must fail closed.
- Evidence links must resolve and be timestamp-aligned with the prediction window.
- Comparable selection must be documented (e.g., similarity on workload shape, SLO state, policy version).
- Replay must succeed in CI for sampled timestamps per class.
