# Exception Register Runbook

## Overview
The **Exception Register** (`docs/ga/EXCEPTIONS.yml`) is the single source of truth for all governance waivers, temporary bypasses, and risk acceptances in the Summit monorepo. It ensures that every exception is documented, time-bounded, and owner-assigned.

## When to Use an Exception
Exceptions are a **last resort**. Always prefer fixing the root cause.
Use an exception only when:
- A blocker prevents a critical release (GA).
- A false positive in tooling cannot be tuned out quickly.
- A temporary compatibility shim is needed for migration.

## Required Fields
Every exception requires:
1.  **id**: Unique ID `EX-####` (increment sequentially).
2.  **title**: Short summary.
3.  **category**: One of `secrets`, `licenses`, `vulns`, `governance`, `ci`, `compat`.
4.  **severity**: `low`, `med`, or `high`.
5.  **owner**: Team or individual responsible for remediation.
6.  **created**: Date of creation (YYYY-MM-DD).
7.  **expires**: Date of expiry (YYYY-MM-DD). **Mandatory.**
8.  **rationale**: Why this is needed and why it is safe short-term.
9.  **follow_up_issue**: Link to the GitHub issue tracking the fix. **Mandatory.**
10. **signoff**:
    - **security**: Required for `high` severity.
    - **release_captain**: Required for any exception promoted to GA.

## How to Add an Exception
1.  Open `docs/ga/EXCEPTIONS.yml`.
2.  Find the next available `EX-####` ID.
3.  Add a new entry under `exceptions`.
4.  Commit and open a PR.

## How to Renew an Exception
Renewals should be rare. If an exception is expiring:
1.  Update the `expires` date.
2.  Update the `rationale` to explain why the original deadline was missed.
3.  Update the `signoff` date.
4.  Get re-approval from the Release Captain or Security.

## CI Enforcement
The `pnpm ci:exceptions:verify` script runs in CI (part of GA Gate).
- **Fails** if any exception is expired.
- **Fails** if metadata is missing or invalid.
- **Warns** if an exception expires within 14 days.

## Auditing
Auditors can review the history of exceptions by:
- Inspecting `docs/ga/EXCEPTIONS.yml` history (git blame).
- Reviewing the `artifacts/governance/exceptions/<sha>/stamp.json` generated in every CI run.
