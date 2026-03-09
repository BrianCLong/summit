# Runbook: Regulatory Drift

## Trigger
A "Regulatory Drift Detected" issue is opened in GitHub.

## Severity
*   **HIGH**: Changes to obligation timelines or mandatory controls (MUST).
*   **MEDIUM**: Changes to guidance or informative text.
*   **LOW**: Formatting changes.

## Response
1.  Review the `diff` in the GitHub Issue.
2.  Verify if the change requires code updates (e.g. new controls).
3.  If yes, create a PR to update `audit/regulatory/sources/` adapters or logic.
4.  If no (just FYI), approve the new baseline by running `pnpm regulatory:build` locally and committing the result.
