# CI Quality OKRs

This document defines the Objective and Key Results (OKRs) for Continuous Integration (CI) reliability and quality. These OKRs are tracked automatically to ensure the stability and speed of our delivery pipeline.

## OKR Catalog

The official OKRs are defined in [CI_OKRS.yml](./CI_OKRS.yml).

### Metric Definitions

*   **failures_total**: The total number of workflow runs with a `failure` conclusion in the last 7 days. Source: `ci_failure_trends`.
*   **p0_failures_total**: The number of failures occurring on the `main` branch. These are considered critical (P0) as they impact the entire team. Source: `ci_failure_trends`.
*   **top_regression_delta**: The largest increase in failure count for a specific error code (or workflow) compared to the previous week. *Note: Currently a placeholder.* Source: `ci_failure_trends`.
*   **ga_verify_minutes_p95**: The 95th percentile duration of the `ga:verify` task (or equivalent release gate). Source: `perf_budget`.
*   **triage_artifact_coverage_percent**: The percentage of failed runs that have associated triage artifacts. Source: `ci_failure_trends`.

## Evaluation Process

1.  **Weekly Trend Generation**: A scheduled workflow runs `scripts/ci/generate_ci_trends.mjs` to fetch recent GitHub Actions run data and aggregate statistics.
2.  **OKR Evaluation**: The `scripts/ci/evaluate_ci_okrs.mjs` script reads the trend report and the performance budget report.
3.  **Comparison**: Each metric is compared against its target (min/max) defined in the YAML catalog.
4.  **Reporting**: A status report (Markdown and JSON) is generated and output to the CI job summary.

## How to Adjust Targets

To modify targets, edit `docs/ci/CI_OKRS.yml`.

Example:
```yaml
  - id: OKR-CI-001
    name: "Reduce weekly CI failures"
    metric: failures_total
    target: { type: "max", value: 40 } # Lowered from 50
```

## Interpreting Results

*   **Pass (✅)**: The metric is within the defined target.
*   **Fail (❌)**: The metric has exceeded the target (for max) or fallen below (for min). Immediate attention is recommended.
*   **Missing Data (⚠️)**: The source data for the metric could not be found. Check if the trend generation workflow is running correctly.

## Roadmap

*   **Phase 1**: Initial implementation with basic trend generation from GitHub API.
*   **Phase 2**: Baseline history and week-over-week deltas.
*   **Phase 3**: Integration with "Release Intent" to differentiate between blocking and non-blocking failures.
