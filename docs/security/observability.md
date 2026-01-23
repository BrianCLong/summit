# Security Observability

This document describes the automated security observability stack for Summit.

## Overview

We use a GitHub Actions workflow (`.github/workflows/security-observability.yml`) to periodically collect, trend, and alert on security metrics.

### Metrics Collected

The `scripts/ci/collect_security_metrics.mjs` script gathers the following data using the GitHub API:

*   **Code Scanning Alerts**: Counts of open alerts by severity (Critical, High, Medium, Low).
*   **Dependabot Alerts**: Counts of open dependency vulnerabilities by severity.

### Artifacts

Each run produces a JSON artifact named `security-metrics.json` containing the snapshot:

```json
{
  "timestamp": "2023-10-27T10:00:00Z",
  "repo": "owner/repo",
  "codeScanning": {
    "critical": 0,
    "high": 5,
    "medium": 2,
    "low": 1,
    "total": 8
  },
  "dependabot": {
    "critical": 0,
    "high": 1,
    "medium": 0,
    "low": 0,
    "total": 1
  }
}
```

### Dashboarding and Trending

*   **Job Summary**: Every run outputs a Markdown summary table comparing the current metrics with the previous successful run (if available).
*   **Artifact History**: Metrics are retained for 90 days as build artifacts, allowing for historical analysis or ingestion by external tools.

### Alerting

The workflow will **fail** (triggering GitHub notifications) if:
1.  The count of **Critical** alerts exceeds the threshold (default: 0).
2.  The count of Critical alerts has **increased** since the last successful run.

To adjust thresholds, modify the `ALERT_THRESHOLD_CRITICAL` environment variable in the workflow file.

### How to Run Manually

1.  Go to the **Actions** tab in the repository.
2.  Select **Security Observability**.
3.  Click **Run workflow**.

### Troubleshooting

*   **Missing Metrics**: Ensure the `GITHUB_TOKEN` has `security-events: read` and `dependabot-alerts: read` permissions.
*   **"Previous metrics not found"**: This is normal for the first run or if artifacts have expired.
