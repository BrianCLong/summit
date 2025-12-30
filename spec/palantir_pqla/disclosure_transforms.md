# Disclosure Transforms

## Transform Library

- Aggregation and grouping with minimum group sizes.
- Redaction and tokenization of sensitive fields.
- k-anonymity enforcement for quasi-identifiers.
- Differential privacy noise addition with calibrated epsilon/delta.
- Suppression of outliers or unique identifiers.

## Info-Loss Metrics

- Delta between raw and sanitized counts.
- Utility scoring for graph metrics (e.g., change in centrality ranking).
- Privacy budget consumption when differential privacy is applied.

## Policy Binding

- Each transform is executed only after policy approval and is logged with policy decision identifier and determinism token.
