# SHAP-IQ Runbook

## How to enable
Set environment variable `FEATURE_FLAG_SHAP_IQ=ON`.

## Expected runtime
Latency <= 2x model inference time. Memory <= +30%.

## Interpreting interaction spikes
Spikes in interaction strengths may indicate a concept drift or a feature interacting unexpectedly with a target. Consult data scientists for review.

## Rollback
Set `FEATURE_FLAG_SHAP_IQ=OFF` and clear cached artifacts.

## Alerts
- Drift spike > threshold
- Determinism failure
