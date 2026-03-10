# Behavior Forecasting Evidence Gate
This CI workflow ensures that the agent's simulated trajectory over N steps does not exceed the allowed risk budget and calibration bounds.

Artifacts are produced deterministically into `artifacts/behavior-forecasting/` and consumed by the OPA policy check at `.opa/policy/behavior_forecasting.rego`.
