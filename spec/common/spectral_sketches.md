# Multi-Resolution Spectral Sketches

## Purpose

Multi-resolution spectral sketches provide compact, streaming-friendly
representations of graph spectra. They enable anomaly detection and temporal
comparison without requiring full graph materialization, while preserving
enough structure to localize responsible subgraphs.

## Core definitions

- **Resolution tier**: A binning scheme over eigenvalues/singular values that
  controls the granularity of the sketch (coarse to fine).
- **Sketch vector**: The numeric representation (histogram, quantiles, or
  moments) produced per tier.
- **Reference library**: A curated catalog of baseline sketches keyed by
  domain facets (topic, language, platform, region, time-of-day).

## Components

- **Normalization**: Use normalized adjacency or Laplacian to ensure
  comparability across varying graph sizes and densities.
- **Streaming updates**: Incremental maintenance via sketch-friendly matrix
  updates (e.g., frequent directions) bounded by memory targets.
- **Distance metrics**: Cosine, Wasserstein, or KL divergence on binned spectra;
  select per alert policy and calibration profile.
- **Localization hooks**: Maintain top-k contributing nodes/edges per tier to
  enable later explanation generation.

## Operational guidance

1. Maintain a baseline library indexed by topic, language, platform, and region
   to select appropriate comparators.
2. Emit determinism tokens containing snapshot identifiers and seed values to
   make sketch recomputation replayable.
3. Enforce budgets: maximum edges per window, memory, and runtime; alert when
   thresholds are crossed.
4. Use tier-specific thresholds to avoid over-triggering on noise at fine
   resolutions.

## Failure modes & mitigation

- **Sparse windows**: Fall back to coarser tiers and widen confidence bounds.
- **Concept drift**: Rotate baseline libraries on a cadence, storing prior
  baselines for replay.
- **Adversarial perturbations**: Require corroboration across two tiers and
  log divergence metadata for review.

## Observability

- Emit metrics: sketch compute latency, tier coverage ratio, baseline hit-rate,
  anomaly score distribution, and explanation size.
- Log determinism tokens and baseline IDs for all outputs.
