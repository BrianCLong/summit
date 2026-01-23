# PR Conflict Forecasting Guide

This guide explains how to use the **Conflict Forecasting + Auto-Rebase Advisor**, a tool designed to predict merge conflicts and recommend optimal merge orderings for open Pull Requests.

## Overview

The tool analyzes all open PRs to identify:
1.  **Divergence:** How far behind the base branch a PR is.
2.  **Overlap:** Which PRs modify the same files or directories (hotspots).
3.  **Conflict Risk:** A score (0-100) indicating the likelihood of merge conflicts.

It produces two artifacts:
*   `PR_CONFLICT_FORECAST.json`: Machine-readable data.
*   `PR_CONFLICT_FORECAST.md`: A human-readable report with checklists.

## How to Run

### Via GitHub Actions (Recommended)

The workflow runs automatically every day at 08:00 UTC. You can also trigger it manually:

1.  Go to the **Actions** tab in the repository.
2.  Select **PR Conflict Forecast**.
3.  Click **Run workflow**.

The report will be available as a build artifact ("pr-conflict-forecast-md" and "pr-conflict-forecast-json") and summarized in the workflow run summary.

### Locally

To run the analyzer locally, you need a GitHub Personal Access Token (PAT) with `repo` scope.

1.  Ensure dependencies are installed:
    ```bash
    pnpm install
    ```

2.  Run the script:
    ```bash
    export GITHUB_TOKEN=your_token_here
    npx tsx scripts/ops/pr_conflict_forecast.ts
    ```

    The output files will be generated in `docs/ops/pr-forecast/`.

## Interpreting the Report

### Conflict Score

*   **0-20 (Green):** Safe to merge. Low risk.
*   **21-50 (Yellow):** Moderate risk. May need a rebase or has some overlap.
*   **51-100 (Red):** High risk. Likely conflicts, touches critical paths, or significantly behind.

### Recommended Actions

*   **MERGE_FIRST:** High priority, low risk, or critical path blocker.
*   **REBASE_NOW:** The branch is stale. Rebase immediately to verify integration.
*   **HOLD:** Wait for conflicting/overlapping PRs to merge first.
*   **SPLIT:** The PR is too large and increases risk. Break it down.
*   **SAFE_TO_MERGE:** Green light.

### Merge Train

The "Recommended Merge Train" lists PRs in the optimal order to minimize conflicts.
1.  **Critical Path First:** Changes to CI/build tools go first to ensure stability.
2.  **Low Conflict:** Safe changes follow.
3.  **Complex/High Overlap:** These go last, after their dependencies are stable.

## Rebase Procedure

For PRs marked `REBASE_NOW`:

1.  Fetch the latest main:
    ```bash
    git fetch origin main
    ```
2.  Checkout your branch:
    ```bash
    git checkout my-feature-branch
    ```
3.  Rebase:
    ```bash
    git rebase origin/main
    ```
4.  Resolve conflicts (if any).
5.  Force push:
    ```bash
    git push --force-with-lease
    ```
