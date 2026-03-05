# SHAP-IQ Explainability Standard (Deterministic Profile)

## Scope
This standard defines Summit's deterministic SHAP-IQ-style artifact contract for feature importance,
pairwise interactions, and per-instance decision breakdown.

## Inputs
- Trained model metadata (`model_id`, static coefficients for deterministic fixture path).
- Feature schema (`feature_names`).
- Batch rows (`rows`) without direct logging of raw values.

## Outputs
- `report.json`: evidence ID, feature importance, interaction matrix, decision breakdown.
- `metrics.json`: mean attribution strength, interaction strength, runtime metrics.
- `stamp.json`: deterministic SHA256 over canonical artifacts.

## Non-goals
- UI visualization.
- Higher-order (>2) interaction decomposition.
- Streaming explainability.
