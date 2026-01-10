# Risk Sunset Policy

> **Policy ID:** POL-RISK-SUNSET-01
> **Effective Date:** 2025-12-31
> **Enforcement:** Strict

## 1. Core Principle

**No risk is infinite.** Every risk, technical debt item, or policy exception must have a defined end state ("Sunset") and a hard deadline. If the deadline passes, trust is assumed lost, and pre-agreed escalation triggers fire immediately.

## 2. Default Lifetimes

Unless explicitly negotiated with the Trust Steward (Jules), the following maximum lifetimes apply to deferred risks:

| Severity/Category | Max Deferral Duration | Extension Policy |
| :--- | :--- | :--- |
| **Critical / Blocker** | 7 Days | No extensions without CEO sign-off. |
| **High / Strategic** | 30 Days | 1 Extension (max 15 days) with VP sign-off. |
| **Medium / Tactical** | 90 Days | 1 Extension (max 30 days) with Director sign-off. |
| **Low / Debt** | 180 Days | Review every 90 days. Auto-close if stale. |

## 3. Extension Protocol

To extend a Sunset Date, the Owner must produce **Evidence of Progress**:

1.  **Partial Mitigation:** Show that risk has been reduced since original acceptance.
2.  **Resource Allocation:** Link to specific sprint tickets/PRs assigned to fix it.
3.  **Impact Analysis:** Re-verify that extending the risk does not violate higher-level trust guarantees (e.g., SOC2, GDPR).

**Max Extensions:** A risk may be extended **at most once**. If the second deadline is missed, the risk must be either:
*   **Remediated immediately** (Drop everything else).
*   **Functionality disabled** (Turn off the feature causing the risk).

## 4. Forced Scope Reduction

If a "Block GA" risk passes its Latest Acceptable Date:

1.  The affected feature is marked **"Experimental / Unsafe"** in documentation and UI.
2.  All GA claims for that feature are revoked.
3.  Access is restricted to "Sandbox" tenants only.

## 5. Trust Debt Bankruptcy

If the total count of Active + Accepted risks exceeds **20**, the organization enters **Trust Debt Bankruptcy**:
*   **Feature Freeze:** No new feature PRs merged.
*   **All Hands on Debt:** All engineering capacity diverted to burn down the Risk Register.
