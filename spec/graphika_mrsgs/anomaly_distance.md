# MRSGS Anomaly Distance

## Distance computation

- Compute per-tier distances between the current sketch and baseline sketches.
- Aggregate distances using weighted sums with tier-specific weights.
- Calibrate thresholds using historical distributions.

## Supported metrics

- Cosine distance for normalized sketch vectors.
- Wasserstein distance for binned spectral distributions.
- KL divergence with smoothing to avoid zero bins.

## Localization

- Attribute per-tier distance contributions to nodes/edges via influence scores.
- Persist top-k contributors for explanation rendering.
