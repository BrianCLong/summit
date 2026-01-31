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
