# Executive Risk Snapshot

> **Date:** 2025-12-31
> **Trust Status:** ⚠️ **AT RISK**

## Summary
The Summit Platform carries **High Trust Debt**. While 18 Critical security vulnerabilities are identified, they are currently active and blocking GA. Two major policy exceptions are nearing or past their sunset.

**Trust is justified ONLY if** the Critical Vulnerability Backlog is cleared by **2026-01-07**.

## Active Risks by Category

*   **Security:** 5 High/Critical Risks (Identity, Vulns, Supply Chain, Tenant Isolation).
*   **Governance:** 2 Risks (Data Sprawl, Tech Debt).
*   **Reliability:** 1 Risk (DR Maturity).

## Upcoming Sunsets (Next 30 Days)

| Risk ID | Description | Sunset Date | Status |
| :--- | :--- | :--- | :--- |
| **R-DEF-002** | **Debug Log Redaction** | **2025-11-15** | 🚨 **EXPIRED** |
| **R-DEF-001** | **Legacy Admin MFA** | **2025-12-31** | 🚨 **DUE TODAY** |
| **R-SEC-001** | **Identity/Access** | **2025-12-31** | 🚨 **DUE TODAY** |
| **R-SEC-002** | **Critical Vulns** | **2026-01-07** | ⚠️ Due in 7 Days |
| **R-AUTH-03** | **Tenant ID Bypass** | **2026-01-07** | ⚠️ Due in 7 Days |

## Decisions Required Immediately

1.  **Disable Legacy Admin Portal:** Risk R-DEF-001 expires today. Must confirm decommissioning or sign CEO-level extension.
2.  **Revoke Debug Logs:** Risk R-DEF-002 expired in Nov. **Must disable full query logging immediately.**
3.  **GA Blocker Acknowledgement:** Confirm that GA is blocked until R-SEC-002 (18 Criticals) is resolved.
