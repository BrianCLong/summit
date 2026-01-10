# Attribution Approximation

SASA estimates Shapley-style marginal contributions under a bounded sampling budget.

## Approximation Strategy

- Sample permutations of sources according to a budget.
- Compute marginal deltas for each sampled coalition.
- Average deltas to estimate contributions.

## Accuracy Controls

- Minimum number of samples per source.
- Variance estimates reported alongside scores.
- Early stopping when variance falls below threshold.
