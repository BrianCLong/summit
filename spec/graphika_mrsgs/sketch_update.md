# Sketch Update Strategy (MRSGS)

## Streaming maintenance

- Maintain frequent-directions or randomized SVD summaries for normalized adjacency matrices.
- Update sketches per window incrementally; avoid full recompute unless drift exceeds tolerance.
- Track memory and runtime budgets; degrade to lower-resolution tiers when exceeded.

## Baseline management

- Store reference sketches per topic/language/platform/region.
- Version baselines and include identifiers in determinism tokens.
- Warm-start new baselines using exponential moving averages to reduce cold-start noise.

## Localization

- Compute node/edge influence on anomaly score via gradient or leave-one-out approximations.
- Enforce explanation budgets (node/edge count) and store Merkle commitments for audit.
