# Reference Fidelity Standards

## Overview
This standard defines how to benchmark reference-guided diffusion models for fidelity preservation across domains.

## Metrics
1. High-frequency similarity (Detail preservation via Laplacian map)
2. Attention coverage (Reference influence)
3. Mask containment (Changes restricted to designated areas)

## Outputs
- `reports/ref_fid_eval/metrics.json`
- `reports/ref_fid_eval/report.json`
- `reports/ref_fid_eval/stamp.json`
- `evidence/attention_maps/`
