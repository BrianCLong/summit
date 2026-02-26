# Financial Projection Spec

Required fields for deterministic completeness checks:

- `startup_costs`
- `funding_strategy`
- `projected_income`
- `projected_expenses`

Scoring behavior:

- Missing any required field reduces completeness score.
- Decision posture is deny-by-default when overall readiness score is below `0.70`.
