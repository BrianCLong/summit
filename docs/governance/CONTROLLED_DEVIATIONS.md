Owner: Governance
Last-Reviewed: 2026-01-14
Evidence-IDs: none
Status: active

# CONTROLLED DEVIATIONS LEDGER

**Status:** ACTIVE
**Enforcement:** AUDIT LOG
**Policy:** "Turn Exceptions Into Assets"

## PURPOSE

This ledger records all **Governed Exceptions**—technical decisions that deviate from the ideal architecture or strict governance but are risk-accepted to maintain velocity.

Every item here is an **Asset**, not a liability, because it is:

1.  **Named** (It has an ID).
2.  **Owned** (It has a DRI).
3.  **Time-Bounded** (It has a Kill Date).
4.  **Monitored** (It is not a silent failure).

## ACTIVE EXCEPTIONS

| ID          | Description                      | Owner    | Status        | Kill Date  | Monitoring                                               |
| :---------- | :------------------------------- | :------- | :------------ | :--------- | :------------------------------------------------------- |
| **EXC-001** | **Mock Privacy Service**         | `jules`  | **APPROVED**  | 2026-01-01 | DSAR request logs are flagged with `WARN` level.         |
| **EXC-002** | **Simulated Geopolitics Oracle** | `jules`  | **APPROVED**  | 2025-12-31 | Output metadata `is_simulated: true`.                    |
| **EXC-003** | **Legacy Client Tests**          | `amp`    | **CONTAINED** | 2026-06-01 | Tests run in `legacy` CI stage, non-blocking for V2.     |
| **EXC-004** | **In-Memory Budget Tracker**     | `jules`  | **APPROVED**  | 2025-11-30 | Server restart clears budget state; acceptable for Beta. |
| **EXC-005** | **Mixed ESM/CJS Config**         | `devops` | **CONTAINED** | 2026-03-01 | Build scripts handle interop; no runtime impact.         |

## PROTOCOL FOR NEW EXCEPTIONS

1.  **Define:** Create a new entry in this ledger.
2.  **Assess:** Assign a Risk Level (Low/Medium/High).
3.  **Approve:** Requires sign-off from `security-council` (for High) or Domain DRI.
4.  **Monitor:** Implement telemetry or logging to track the deviation's impact.

## ARCHIVED EXCEPTIONS (RESOLVED)

- _(None yet. We are just starting.)_
