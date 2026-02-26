# Runbook: Sharpness-Aware Minimization (SAM) Monitoring and Operations

## Introduction
This runbook provides guidance for monitoring SAM training jobs and troubleshooting regressions in sharpness metrics.

## Monitoring
- **Sharpness Regression:** Monitor `sharpness_report.json`. Alert if sharpness increases by > 5% vs baseline.
- **Compute Budget:** Monitor step time. Alert if compute multiplier exceeds 2.2× baseline.
- **Stability:** Monitor `metrics.json` for convergence. SAM should maintain training stability within ± 2% of baseline.

## Troubleshooting
- **Memory Errors:** If SAM training fails with Out-of-Memory (OOM), reduce the batch size or disable adaptive SAM (`adaptive=False`).
- **Divergence:** If training loss diverges, reduce `rho` (neighborhood parameter). The default `rho=0.05` is suitable for most models.
- **Performance Drift:** Run `scripts/monitoring/sam-drift.py` to analyze sharpness trends over time.

## Rollback
- If SAM-enabled training shows poor performance or instability, set `SUMMIT_SAM_ENABLE = False` in `summit/config/flags.py` to revert to standard optimization.
