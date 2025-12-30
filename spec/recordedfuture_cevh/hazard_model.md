# Hazard Model (CEVH)

## Modeling approach

- Use survival or intensity models with time decay to compute hazard values for assets.
- Produce confidence intervals and time-to-event estimates; log calibration metrics for QA.
- Support counterfactual evaluation by removing or down-weighting individual exposure signals.

## Signal handling

- Normalize exposure signals by category and freshness; cap influence per policy budget.
- Cache results per asset + replay token; invalidate on signal version changes.
- Enforce egress redaction for signals subject to sharing limits.
