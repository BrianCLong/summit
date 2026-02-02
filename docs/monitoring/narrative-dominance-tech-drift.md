# Narrative Dominance Technologies Drift Monitoring

## Purpose
Monitor narrative cluster stability, embedding drift, and alert volume anomalies for the defensive Narrative Intelligence pipeline.

## Signals
- Cluster stability (Adjusted Rand Index) vs baseline sample.
- Embedding model/version mismatch.
- Alert volume anomalies (rate-based).
- Novel narrative false-positive rate from analyst feedback.

## Cadence
- Nightly evaluation in scheduled job.
- On-demand execution for incident review.

## Actions on Drift
1. Freeze model upgrades.
2. Recompute baseline sample with pinned version.
3. Require analyst validation before exports.

## Evidence
- Emit `drift_report.json` with deterministic inputs hash list.
- Store drift metrics in the observability index.
