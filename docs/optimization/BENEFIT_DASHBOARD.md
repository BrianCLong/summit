# Measurement & Benefit Aggregation

## Loop-Level Metrics

- **Savings (L-A1):** tokens saved, dollar cost avoided per 1k requests, semantic parity score.
- **Reliability (L-B1):** retry success yield, error rate delta, P95 latency delta, cost per successful retry.
- **Performance (L-C1):** throughput delta, queue wait time delta, P99 latency delta, resource utilization impact.
- **Policy Hygiene (L-D1):** count of over-broad scopes detected, remediation accepted rate, time-to-remediation.
- **Budget utilization:** per-loop spend vs. ceiling, global spend vs. ceiling, action counts per interval.

## Portfolio View

- **Combined benefit:** aggregated dollar savings + throughput gains translated to capacity hours saved.
- **Risk exposure:** active incident flags, SLO burn rates, and any policy violations per loop.
- **Confidence score:** weighted by sample size, variance, and recency of validation tests.

## Reporting Cadence

- Weekly dashboard snapshot with per-loop drill-down.
- Monthly governance review to adjust budgets, caps, and scopes.
- Auto-generated alerts if combined benefit turns negative or confidence drops below threshold.

## Data Sources

- Metrics pipeline (Prometheus/OTel) for latency, throughput, error rates.
- Token analytics for L-A1 cost savings.
- Policy graph analyzer for L-D1 findings.
- Provenance ledger for receipts and action histories.

## Visualization Notes

- Favor sparklines showing delta vs. baseline per loop.
- Highlight actions with receipts that exceeded expected variance.
- Portfolio scorecards should map benefit vs. risk for executive review.
