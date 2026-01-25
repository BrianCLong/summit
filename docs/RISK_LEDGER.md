# Jules Risk Ledger

> **Status:** Active
> **Custodian:** Jules (Release Captain)
> **Last Updated:** 2025-10-27

## Risk Burn-Down Table

| Risk ID | Risk Name | Status | Owner | Trigger Condition | Review Date |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CRITICAL-1** | Feature Flag Fragmentation | **OPEN** | @intelgraph-core | Security incident or new flag system PR | 2025-11-03 |
| **MODERATE-1** | server/src Structural Sprawl | **ACCEPTED** | @intelgraph-core | root items > 120 | 2025-11-10 |
| **MODERATE-2** | Monorepo Dependency Instability | **OPEN** | @team-ops | CI install failure | 2025-11-03 |
| **LOW-1** | Ambiguous Naming (Flags) | **MITIGATED** | @intelgraph-core | Dev confusion report | 2025-12-01 |

---

## 🔴 Critical Risks

### CRITICAL-1: Feature Flag Fragmentation & Security Vulnerability
*   **Owner:** @intelgraph-core
*   **Trigger Condition:** Security incident or new flag system PR.
*   **Review Date:** 2025-11-03
*   **Details:** System has 4 competing flag implementations. `server/src/flags/store.ts` contains a Code Injection vulnerability (`eval`).
*   **Strategy:** Secure `store.ts`, add missing deps, deprecate legacy.

## 🟠 Moderate Risks

### MODERATE-1: `server/src` Structural Sprawl
*   **Owner:** @intelgraph-core
*   **Trigger Condition:** Root items count > 120.
*   **Review Date:** 2025-11-10
*   **Details:** >100 items in `server/src`.
*   **Strategy:** Move to `modules/` structure.

### MODERATE-2: Missing/Broken Dependencies in Monorepo
*   **Owner:** @team-ops
*   **Trigger Condition:** CI install failure.
*   **Review Date:** 2025-11-03
*   **Details:** `pnpm install` unreliable.
*   **Strategy:** Audit `package.json` workspace links.

## 🟡 Low Risks

### LOW-1: Ambiguous Naming
*   **Owner:** @intelgraph-core
*   **Trigger Condition:** Developer confusion report.
*   **Review Date:** 2025-12-01
*   **Details:** Name collision for `FeatureFlagService`.
*   **Strategy:** Rename legacy service.
