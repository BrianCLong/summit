# Online Calibration (FASC)

## Inputs

- Normalized feed signals with timestamps.
- Outcome data (incident confirmations, exploit validation).
- Policy configuration for minimum weight, decay rates, and corroboration requirements.

## Algorithm

1. Compute reliability score per feed using online learning.
2. Apply freshness decay and provenance weighting.
3. Update feed weights and store calibration artifact.
4. Emit compliance decision logs when weights cross thresholds.

## Outputs

- Updated feed weights.
- Calibration artifact with determinism token.
- Metrics for feed reliability trends.
