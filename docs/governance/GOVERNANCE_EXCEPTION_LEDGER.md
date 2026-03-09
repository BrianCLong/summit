# Governance Exception Ledger

**Status:** Active
**Owner:** Release Operations
**Review Cycle:** Weekly (Monday 09:00 UTC)

This ledger tracks temporary deviations from the [Governance Gate Policies](./GA_RISK_GATE.md) and [Green CI Contract](./GREEN_CI_CONTRACT.md). All exceptions must be explicitly approved, time-bound, and tracked to closure.

## Exception Protocol

1.  **Allowed Exceptions**:
    *   **Emergency Fixes**: P0 fixes for production incidents (requires Post-Mortem link).
    *   **False Positives**: Security scanner findings confirmed as false positives (requires vendor confirmation or rationale).
    *   **Transitional Drift**: Infrastructure drift during approved migration windows.
    *   **Legacy Debt**: Known pre-GA issues with a fix scheduled in the current sprint.

2.  **Maximum Duration**:
    *   Critical/Security: 24 hours.
    *   Infrastructure/Drift: 7 days.
    *   Non-blocking Debt: 30 days.

3.  **Review Cadence**:
    *   All active exceptions are reviewed weekly by the Release Captain.
    *   Expired exceptions automatically block the release train.

## Active Exceptions

| Date | Scope | Description | Approver | Expiry | Follow-up Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
|      |       |             |          |        |                  |

<!--
Example:
| 2026-01-25 | drift | Temporary IAM drift during AWS migration (Ticket-123) | @jules | 2026-02-01 | Re-run terraform apply after migration |
-->

## Historical Ledger (Closed)

| Date | Scope | Description | Approver | Resolution Date |
| :--- | :--- | :--- | :--- | :--- |
|      |       |             |          |                 |
