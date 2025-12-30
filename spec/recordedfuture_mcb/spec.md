# Metric-Contract Benchmarking (MCB)

MCB turns program metrics into executable contracts with replayable scoring pipelines and drift monitoring.

## Objectives

- Express tasks, scoring functions, and acceptance thresholds as a benchmark contract.
- Provide reproducible scoring with backtests and drift detection.
- Supply evaluator-facing binders for periodic program reviews.

## Pipeline overview

1. Retrieve intelligence signals and outcome labels.
2. Execute scoring pipelines per contract tasks (detection, attribution, prioritization, forecasting).
3. Compute metrics and confidence intervals (bootstrap or Bayesian).
4. Generate benchmark binder with results, backtests, and drift analysis tied to replay token.
