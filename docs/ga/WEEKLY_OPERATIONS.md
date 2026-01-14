# Weekly Operations Guide for Summit GA

This guide describes how to operate the Summit platform's governance and release machinery week-to-week.

## 1. Daily Hygiene (10 mins)

*   **Check the Daily Ops Report**:
    *   Look at `artifacts/ops/daily/` (or the Dashboard if published).
    *   **Drift?** If `drift` is detected, check `pnpm security:drift-check` locally and fix or whitelist.
    *   **Blocked PRs?** Use `pnpm pr:triage` to unstick the queue.
    *   **Golden Path Red?** Fix the broken `ga-gate` immediately.

## 2. Weekly Deep Dive (Monday)

*   **Evidence Freshness**:
    *   The `ops-weekly` workflow runs `pnpm verify:evidence-bundle`.
    *   If it fails, the evidence bundle is stale or tampered with.
    *   **Action**: Run `pnpm compliance:evidence` to regenerate (if authorized) or investigate the mismatch.
*   **Debt Check**:
    *   Review `check:debt` output. If regressions occur, file cleanup tickets.

## 3. Release Candidate (On Demand)

*   **Preparation**:
    *   Ensure `ops:weekly` is green.
    *   Ensure `ga:verify` passes locally.
*   **Execution**:
    *   Dispatch `ops-release-candidate.yml` with the target version tag.
    *   Wait for the "Release Evidence Pack" artifact.
*   **Approval**:
    *   Review the generated Evidence Pack against the [Assurance Contract](docs/assurance/ASSURANCE_CONTRACT.md).

## 4. Handling Incidents

*   **Bypassing Gates**:
    *   If a critical fix is blocked by ops tooling (e.g., link checker), use `[skip ci]` in the commit message or the `release-override` workflow.
    *   **Must** file a follow-up issue to fix the root cause.

## 5. Maintenance

*   **Updating Tooling**:
    *   Modify `scripts/ops/daily_ops_report.mjs` to add new "lightweight" checks.
    *   Modify `ops-weekly.yml` for heavy, expensive checks.
