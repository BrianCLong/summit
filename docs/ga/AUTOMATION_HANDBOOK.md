# Automation Handbook

This guide details the operational scripts and workflows used to maintain the Summit Golden Path.

## Ops Cadence

We operate on a strict cadence to ensure system health without burnout.

### Daily (Automated 9 AM UTC)
*   **Goal**: Triage PRs, check for drift, and update dashboards.
*   **Command**: `pnpm ops:daily`
*   **Workflow**: `ops-daily.yml`
*   **Artifacts**: `artifacts/ops/daily/` (Report + JSON)

### Weekly (Mondays)
*   **Goal**: Deep verification of evidence and debt.
*   **Command**: `pnpm ops:weekly`
*   **Workflow**: `ops-weekly.yml`
*   **Artifacts**: `artifacts/ops/weekly/` (Summary)

### Release Candidate (On Demand)
*   **Goal**: Full validation before a release.
*   **Command**: `pnpm ops:rc`
*   **Workflow**: `ops-release-candidate.yml`
*   **Artifacts**: `artifacts/release/<tag>/` (Evidence Pack)

## Manual Operations

### Running Reports Locally
You can run the daily report generator locally to check the status of your branch or the repo.

```bash
pnpm ops:daily
```

This will generate a Markdown report in `artifacts/ops/daily/<date>/`.

### Troubleshooting
*   **Merge Train Stuck?** Run `pnpm pr:triage` to see blockers.
*   **Drift Detected?** Run `pnpm security:drift-check` to identify changed files.
*   **Evidence Invalid?** Run `pnpm verify:evidence-bundle` to check signatures.

## Maintenance
*   **New Checks**: Add lightweight checks to `scripts/ops/daily_ops_report.mjs`.
*   **Deep Checks**: Add heavy validation to `ops-weekly.yml`.
