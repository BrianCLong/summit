# Multi-Resolution Spectral Sketches

## Purpose

Multi-resolution spectral sketches provide compact, streaming-friendly representations of graph spectra. They enable anomaly detection and temporal comparison without requiring full graph materialization.

## Components

- **Resolution tiers**: Configurable binning over eigenvalues/singular values to capture coarse and fine-grained structure.
- **Normalization**: Use normalized adjacency or Laplacian to ensure comparability across varying graph sizes and densities.
- **Streaming updates**: Incremental maintenance via sketch-friendly matrix sketches (e.g., frequent directions) bounded by memory targets.
- **Distance metrics**: Cosine, Wasserstein, or KL divergence on binned spectra; choose per alert policy.

## Operational guidance

- Maintain a **baseline library** keyed by topic, language, platform, and region to select appropriate comparators.
- Emit **determinism tokens** containing snapshot identifiers and seed values to make sketch recomputation replayable.
- Enforce **budgets**: maximum edges per window, memory, and runtime; alert when thresholds are crossed.
- Capture **explanation hooks**: store top-k nodes/edges influencing the anomaly score for downstream localized explanations.
