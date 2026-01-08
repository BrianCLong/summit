# Performance Budgets

This document outlines the approach for monitoring and enforcing performance budgets in our CI/CD pipelines, specifically for release-intent workflows.

## Objectives

1.  **Predictability**: Ensure release gates remain fast and predictable.
2.  **Visibility**: Provide transparency into CI duration and performance regressions.
3.  **Governance**: Enforce strict budgets for release builds to prevent "boil the frog" slow degradation.

## Policy

The performance budget policy is defined in `policy/performance-budgets.yaml`.

### Budget Structure

Budgets are defined per job (e.g., `ga_verify`) and include:

*   **Total Duration**: Maximum allowed time for the entire job.
*   **Step Budgets**: Specific limits for key phases like `install`, `build`, and `test`.

### Enforcement Modes

*   **Normal PRs**: Always **WARN-ONLY**. We want to inform developers but not block their daily work unless explicitly desired.
*   **Release Intent**:
    *   **Calibration Mode**: **WARN-ONLY**. Used to gather baseline data.
    *   **Enforcement Mode**: **FAIL** if budgets are exceeded. This ensures releases meet quality and speed standards.

### Calibration

The policy supports a `calibration` section.
*   `mode`: Can be `warn` or `enforce`.
*   `baseline_runs`: Number of runs to consider for dynamic baselines (future implementation).

Currently, we enforce explicit `max_minutes` defined in the policy file.

## How it Works

1.  **Duration Capture**: The `scripts/ci/capture_step_timings.mjs` script wraps key CI steps (install, build, test) to record precise start/end times and exit codes.
2.  **Report Generation**: At the end of the workflow, `scripts/ci/generate_perf_budget_report.mjs` runs. It:
    *   Reads the captured timings.
    *   Compares against `policy/performance-budgets.yaml`.
    *   Generates `artifacts/perf-budget/report.md` (summary) and `report.json` (details).
3.  **Enforcement**: The script exits with status `1` (failure) only if:
    *   It is a Release Intent run.
    *   Policy is not in `warn` mode.
    *   Budgets are exceeded.

## Interpreting the Report

The "Performance Budget Report" in the CI artifacts (and job summary) will show:

*   **Status**: PASS, WARN, or FAIL.
*   **Total Duration**: Actual vs Budget.
*   **Violations**: Specific steps or totals that exceeded the limit.
*   **Remediation**: Suggestions for fixing performance issues (e.g., checking caches, parallelizing tests).

## Adjusting Budgets

To adjust budgets, modify `policy/performance-budgets.yaml` via a PR. Changes should be justified by either:
*   Accepted increase in scope (e.g., new comprehensive tests).
*   Temporary relaxation while performance improvements are being engineered.
