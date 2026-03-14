# Summit Health Automation & Monitoring

This document details the scheduled repository health automation designed to give Jenkins-like signals (hourly and daily) without manual prompting. These scripts track CI health, determinism drift, repo entropy, and security drift.

All metrics outputs are strictly sorted canonical JSON files to minimize churn and allow structured drift detection in Git.

## Workflows

### 1. Hourly Repo Health Monitoring (`.github/workflows/monitoring.yml`)
- **Trigger**: Hourly (`0 * * * *`) via GitHub Actions `schedule`.
- **Purpose**: Compute deterministic health artifacts on a rapid cadence.

**Scripts Run:**
- `scripts/monitoring/ci_health.ts`: Reads recent workflow runs via GitHub Actions REST API to compute workflow failure rates. Outputs `artifacts/monitoring/ci-health.json`.
- `scripts/monitoring/determinism_drift.ts`: Compares the latest baseline output for AI evals (`artifacts/ai-evals/metrics.json`) to detect suspicious non-deterministic drift fields (like timestamps, UUIDs, long IDs). Outputs `artifacts/monitoring/determinism-drift.json`.
- `scripts/monitoring/repo_entropy.ts`: Fetches open PR count, open issues count, and computes average CI runtime. Outputs `artifacts/monitoring/repo-health.json`.
- `scripts/monitoring/security_drift.ts`: Evaluates general security drift by testing dependency and lockfile sizes. Outputs `artifacts/monitoring/security-health.json`.

### 2. Daily AI Benchmarks (`.github/workflows/daily-benchmarks.yml`)
- **Trigger**: Daily (`0 0 * * *`) via GitHub Actions `schedule`.
- **Purpose**: Execute computationally expensive or extensive benchmarks periodically to guarantee graph retrieval accuracy tracking.
- **Script Run**: `scripts/benchmarks/run_graphrag.ts`: Generates and computes metrics for GraphRAG operations. Outputs `metrics.json`, `report.json`, and `stamp.json` under `artifacts/benchmarks/graphrag/`.

## Thresholds & Best Practices

1. **Deterministic Execution**: All scripts that update JSON output enforce sorting using a standard stable stringifier function. This ensures that order of execution or property retrieval does not inadvertently create Git diffs.
2. **Minimal Permissions**: The scheduled monitoring actions only require read/write contents permissions and use the default GITHUB_TOKEN to execute scripts safely inside an ephemeral Linux container.
3. **Low Blast Radius**: Automated monitoring does not block the standard golden path CI. Outputs simply update the `.json` files inside `/artifacts`, causing no interruptions. Threshold alerts (such as extremely high issue entropy or significant determinism drift) can be tracked separately without stopping releases.