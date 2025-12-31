# Calibration, Backtesting, and Drift Detection

Calibration ensures predictions are reliable, bounded, and automation-safe. These standards apply to every prediction class.

## Backtesting Requirements

- **Windows:** Run rolling backtests for 1h and 24h horizons (and 7d for cost) over the past 30 days.
- **Metrics:**
  - Point forecasts: MAE, MAPE (when denominator non-zero), RMSE.
  - Probabilistic forecasts: calibration curves, Brier score, coverage of confidence bands (target ≥90% coverage for p90).
  - Classification-style risks: precision/recall at operational thresholds, expected cost of false positives/negatives.
- **Acceptance thresholds:**
  - Capacity/SLA/Backlog: MAE <10% of observed value; p90 coverage ≥90%.
  - Cost: MAPE <10%, p90 coverage ≥90%.
  - Policy Denial: F1 ≥0.7 and p90 coverage ≥90%.
- **Reporting:** Publish backtest reports to `artifacts/predictions/backtesting/<prediction>/<timestamp>.json` with provenance hashes.

## Drift Detection

- **Feature drift:** Population stability index (PSI) or KS-test on key features; alert when PSI >0.2.
- **Outcome drift:** Compare residual distributions week-over-week; alert on significant shifts (p<0.05) or monotonic bias.
- **Model versioning:** Freeze model version when drift detected; require human approval to retrain.
- **Data coverage:** Alert when coverage drops below contract thresholds; halt predictions if unresolved.

## Scheduled Verification

- **Job:** `verify-prediction-calibration` (CI or scheduled) must run backtests and drift checks nightly.
- **Gates:** Block automation eligibility when metrics fall below acceptance thresholds; demote to human-only consumption.
- **Evidence:** Store calibration metrics and drift alerts as CI artifacts; link them in operator views.

## Replay & Audit Coupling

- Backtest runs must include replay tokens for sampled timestamps to prove reproducibility.
- Audit logs must capture calibration metric versions and thresholds applied at decision time.
