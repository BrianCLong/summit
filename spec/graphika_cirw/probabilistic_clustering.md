# Probabilistic Clustering Model

## Feature Set

- Temporal co-occurrence windows with decay weighting.
- Shared resource linkage: cookies, IP blocks, hosting ASN, or shared image hashes.
- String similarity: n-gram Jaccard, edit distance, email prefix overlap.
- Network proximity: graph-based closeness over interaction graphs.
- Behavioral similarity: diurnal patterns, device/browser fingerprints.
- Media perceptual hash matching for cross-platform assets.

## Model Choice

- Bayesian mixture with pairwise linkage likelihoods; outputs posterior probabilities for cluster membership.
- Confidence intervals computed via bootstrap or posterior sampling for each membership probability.
- Merge and split decisions use tunable thresholds (e.g., lower/upper bounds) with hysteresis to avoid flapping.

## Operations

1. Ingest identifier pairs with computed features.
2. Run inference to obtain cluster posteriors and uncertainty intervals.
3. Apply policy scopes to disallow unauthorized merges.
4. Emit merge/split events with determinism tokens and witness material.
5. Cache candidate clusters by query signature and artifact version to accelerate downstream lookups.
