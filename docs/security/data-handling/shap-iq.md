# SHAP-IQ Data Handling Controls

## Classification
- Model inputs: **Sensitive**.
- SHAP feature attributions: **Derived sensitive**.
- Interaction matrix: **Derived sensitive**.
- Drift summary metrics: **Aggregate safe**.

## Logging Restrictions
Never log:
- Raw feature vectors.
- Decision inputs.
- Raw sample identifiers.

## Retention
- Raw explanation artifacts: 30 days (pending governance confirmation).
- Drift aggregates: 1 year.

## Operational Guardrails
- Feature flag default is OFF (`scripts/explain_run.py` requires `--enable`).
- No external network calls in explainability scripts.
