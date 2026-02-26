# Sharpness-Aware Minimization (SAM) Integration Standard

## Overview
Sharpness-Aware Minimization (SAM) is an optimization technique that minimizes both the loss and the sharpness of the loss landscape. This leads to better generalization and robustness under distribution shift.

## Implementation Details
- **Optimizer:** `summit.optim.sam.SAM`
- **Training Loop Hook:** The training loop must support a two-step gradient update.
- **Evaluation:** `summit.evaluation.sharpness.SharpnessEvaluator` computes the sharpness metric.

## Configuration
SAM is controlled by the following feature flag in `summit/config/flags.py`:
- `SUMMIT_SAM_ENABLE`: Set to `True` to enable SAM in supported training pipelines.

## Evidence Requirements
- Training runs using SAM must produce:
    - `metrics.json` (loss history)
    - `sharpness_report.json` (sharpness metric)
    - `compute.json` (compute overhead analysis)
    - `stamp.json` (governance metadata)

## Performance Targets
- **Step Time:** ≤ 2.1× baseline (due to two forward/backward passes).
- **Memory Overhead:** ≤ 1.3× baseline.
- **Sharpness Reduction:** Target ≥ 3% improvement in sharpness metric vs baseline.
