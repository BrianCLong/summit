# Repository Health Monitoring

This document describes the scheduled GitHub Actions workflows used to automate repository health monitoring for Summit.

## Hourly Monitoring

**Workflow File:** `.github/workflows/monitoring.yml`
**Schedule:** Every hour (`0 * * * *`)

The hourly monitoring workflow runs several distinct scripts to compute key repository signals, generating deterministic JSON artifacts that enable stable tracking over time. The following signals are generated into `artifacts/monitoring/*.json`:

1.  **CI Health (`scripts/monitoring/ci_health.ts`)**:
    *   Reads recent workflow runs via the GitHub REST API.
    *   Computes the failure rate for each workflow.
    *   Outputs results to `artifacts/monitoring/ci-health.json`.

2.  **Determinism Drift (`scripts/monitoring/determinism_drift.ts`)**:
    *   Compares the latest benchmark outputs against the last known baseline in `artifacts/ai-evals`.
    *   Detects non-deterministic fields (such as changing timestamps or random UUIDs) that would break canonical verification.
    *   Outputs results to `artifacts/monitoring/determinism-drift.json`.

3.  **Repository Entropy (`scripts/monitoring/repo_entropy.ts`)**:
    *   Queries the GitHub REST API to compute open PR counts, open issue counts, and average CI execution runtimes.
    *   Outputs results to `artifacts/monitoring/repo-health.json`.

4.  **Security Drift (`scripts/monitoring/security_drift.ts`)**:
    *   Runs the local SBOM/security checks (`pnpm audit --json`) to detect regressions and security drift.
    *   Outputs results to `artifacts/monitoring/security-health.json`.

## Daily Monitoring

**Workflow File:** `.github/workflows/daily-benchmarks.yml`
**Schedule:** Daily (`0 0 * * *`)

The daily monitoring workflow runs intensive benchmarks that are too slow or expensive to execute hourly.

*   **GraphRAG Benchmarks (`scripts/benchmarks/run-graphrag.ts`)**:
    *   Executes the GraphRAG benchmarking suite.
    *   Produces output metrics and reports at `artifacts/benchmarks/graphrag/metrics.json` and `artifacts/benchmarks/graphrag/report.json`.
    *   Generates a timestamped `stamp.json` in the artifact directory.

## Design Principles

All monitoring scripts and workflows adhere to the following principles:

*   **Deterministic Outputs**: Resulting JSON artifacts must be canonically sorted and structured to prevent unnecessary churn.
*   **Minimal Permissions**: Workflows use only the necessary permissions (e.g., `contents: read`, `actions: read`, `issues: write`).
*   **Low Blast Radius**: Automated monitoring operates primarily as a read-only observer to prevent unintended modifications to the primary repository branch.
