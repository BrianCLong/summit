# Metric Contracts

Metric contracts define tasks, scoring methods, and acceptance thresholds to align reporting with DARPA performance goals.

## Contract structure

- Tasks: detection, attribution, prioritization, forecasting, or coordination scoring.
- Scoring: explicit functions with confidence interval methods (bootstrap or Bayesian).
- Thresholds: acceptance bands with quarterly checkpoints aligned to program goals.

## Benchmark binders

- Include metric results, confidence intervals, backtest summaries, and drift notes.
- Bind to data snapshots and scoring code versions via replay tokens.

## Drift and counterfactuals

- Detect feed or data distribution drift and emit contract violation alerts.
- Generate counterfactual binders excluding feeds or changing policy to quantify deltas.
