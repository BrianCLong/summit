# GDCNet Subsumption

## Overview

Implementation of "GDCNet: Generative Discrepancy Comparison Network for Multimodal Sarcasm Detection" (arXiv:2601.20618).

## Strategy

- **Lane 1 (Foundation)**: Evidence schemas, eval scaffolding, plugin interfaces (Caption Provider, Discrepancy Extractor, Gated Fusion).
- **Lane 2 (Innovation)**: Ensembles, calibration, robustness probes (default OFF).

## Components

1. **Anchor Caption Provider**: Generates objective captions (`summit.mm.anchors`).
2. **Discrepancy Extractor**: Computes semantic/sentiment differences (`summit.mm.discrepancy`).
3. **Gated Fusion**: Combines modalities + discrepancies (`summit.mm.fusion`).

## Feature Flags

- `SUMMIT_MM_ANCHOR_PROVIDER`: Controls the provider (mock/real).
- `SUMMIT_MM_GDCNET`: Enables discrepancy features.

## Lane 2 Activation Sequence

1. Confirm Lane 1 evidence gates are green and Prometheus error budgets are healthy.
2. Enable `SUMMIT_MM_GDCNET` in a non-prod environment and run the MMSD eval suite.
3. Promote to canary with a bounded tenant allowlist and verify drift metrics.
4. Record evidence updates before expanding rollout.

## Lane 2 Safety Checks

- Lane 2 feature flags must default to OFF in `feature-flags/flags.yaml`.
- CI fails if any Lane 2 defaults flip to ON without explicit approval.
