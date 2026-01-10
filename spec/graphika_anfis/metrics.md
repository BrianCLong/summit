# ANFIS Metrics

## Coordination Features

- **Burstiness**: ratio of peak posting rate to baseline over a sliding window.
- **Near-duplicate similarity**: locality-sensitive hashing over canonicalized
  text and media hashes.
- **Hub concentration**: Gini coefficient over actor in-degree.
- **Link laundering score**: repeated redirection chain reuse across actors.

## Spread Metrics (simulation)

- **Reach**: estimated distinct audience size.
- **Cascade depth**: maximum reshare depth after intervention.
- **Reproduction factor (R0)**: expected reshares per post.
- **Intervention ROI**: spread reduction per unit intervention cost.

## Validation

- Compare baseline vs. modified graph metrics.
- Record deltas and include in attribution artifact.
