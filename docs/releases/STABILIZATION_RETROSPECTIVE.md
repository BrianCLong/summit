# Stabilization Retrospective Pack

This document describes the automated process for generating a monthly Stabilization Retrospective Pack. This report provides a quantitative summary of the project's stability and operational cadence over the preceding four weeks.

## Purpose

The primary goal of the retrospective pack is to ground our monthly stabilization planning in objective data. By analyzing trends and identifying recurring blockers from the previous month, we can make informed, evidence-based decisions about where to focus our engineering efforts to improve project health.

This process replaces subjective or anecdotal planning with a deterministic, rule-based approach.

## How It Works

A GitHub Actions workflow, located at `.github/workflows/stabilization-retrospective.yml`, runs on the first day of each month. It can also be triggered manually. This workflow executes the `scripts/releases/generate_stabilization_retrospective.mjs` script to perform the following steps:

1.  **Data Collection**: The script fetches the last four successful workflow runs for the `weekly-ops-evidence.yml` workflow.
2.  **Artifact Processing**: It downloads the `weekly-evidence` artifact from each run, which contains `scorecard.json`, `escalation.json`, and `diff.json`.
3.  **Aggregation**: The data from these artifacts is aggregated to compute week-over-week trends for key stability metrics.
4.  **Analysis**: The script identifies recurring blockers (items that have been overdue in multiple weeks) and applies a set of rules to generate recommendations.
5.  **Report Generation**: Two artifacts are generated:
    *   `RETRO_<YYYY-MM-DD>_WINDOW_<start>_TO_<end>.md`: A human-readable Markdown summary.
    *   `retro_<...>.json`: A JSON file containing the raw aggregated data and recommendations.

### Window Selection

The report analyzes data from the last four available weekly closeouts by default. If fewer than four weeks of data are available, the report will be generated using the data that is present, but a "Reduced Confidence" notice will be included in the summary.

### How Recommendations Are Derived

Recommendations are generated based on a predefined, deterministic set of rules applied to the aggregated data:

*   **Issuance Hygiene**: Triggered if any P0 items were recorded as `blocked_unissued` in any of the analyzed weeks. This points to a critical bottleneck in our process for getting high-priority work released.
*   **Evidence Capture Enforcement**: Triggered if the `evidence_compliance` metric for the most recent week falls below 95%.
*   **SLA Adherence and Scope Control**: Triggered if the `overdue_load` metric is higher in the last week of the window than it was in the first week, indicating a negative trend.
*   **Target Date Realism and Prioritization**: Triggered if the average `on_time_rate` across the four-week window is below 90%.

### GitHub Token Permissions

The workflow uses the standard `GITHUB_TOKEN` provided by GitHub Actions. The token requires `read` permissions for both `contents` and `actions` to fetch workflow run history and download artifacts. These are the default permissions and do not require any special secrets to be configured.
