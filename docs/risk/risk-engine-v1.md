# Risk Engine v1

## Feature Definitions

- `alerts_24h`, `vt_hits_7d`, `case_links_30d`, `temporal_anomaly_24h`, `centrality_30d`, `first_seen_recent`.

## Calibration

- Logistic regression with bias and feature weights.
- Three windows: 24h, 7d, 30d.

## Bands

- Low <0.33, Medium <0.66, High <0.85, Critical ≥0.85.

## Explainability

- Per-feature contribution = weight × value.
- Explanations returned with DLP masking by default.
