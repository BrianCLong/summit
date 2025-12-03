# Jules Risk Ledger

> **Status:** Active
> **Custodian:** Jules (Autonomous Threat Detector & Risk Neutralizer)
> **Last Updated:** 2025-10-XX

This ledger tracks systemic risks, architectural anomalies, and potential threats to the stability and integrity of the IntelGraph platform.

## 🔴 Critical Risks (Immediate Action Required)

### 1. Feature Flag Fragmentation & Security Vulnerability
*   **Type:** Security / Architectural / Dependency
*   **Status:** In Progress
*   **Description:** The system currently contains **four** competing ways to handle feature flags, creating confusion and potential for bugs. More critically, one implementation contains a security vulnerability, and the "modern" implementation is missing dependencies.
*   **Details:**
    1.  `server/src/feature-flags/`: The intended modern standard (using `@intelgraph/feature-flags`). **CRITICAL:** The dependency `@intelgraph/feature-flags` is missing from `server/package.json`, causing this code to crash if executed.
    2.  `server/src/flags/store.ts`: An ad-hoc in-memory store. **CRITICAL:** Uses `eval()` (via `new Function`) to evaluate rules. This is a Code Injection vulnerability. It appears to be effectively dead code (only used by unused middleware), but it is dangerous to keep.
    3.  `server/src/featureFlags/flagsmith.ts`: A legacy Flagsmith implementation. Used in `server/src/routes/recipes.ts`.
    4.  `server/src/services/FeatureFlagService.ts`: A legacy JSON-file based service. Mostly unused (only in its own tests).
*   **Neutralization Strategy:**
    *   **Secure:** Remove `eval()` from `flags/store.ts`.
    *   **Fix:** Add `@intelgraph/feature-flags` to `server/package.json`.
    *   **Deprecate:** Mark legacy modules (`flags/`, `featureFlags/`, `services/FeatureFlagService.ts`) as `@deprecated` with clear migration instructions.
    *   **Consolidate:** Future work should migrate `recipes.ts` to the standard provider.

## 🟠 Moderate Risks (Monitoring)

### 1. `server/src` Structural Sprawl
*   **Type:** Architectural
*   **Status:** Detected
*   **Description:** The `server/src` directory contains over 100 top-level items, mixing standard layers (`controllers`, `services`) with specific features (`abyss`, `aurora`) and utilities. This increases cognitive load and makes boundary enforcement difficult.
*   **Neutralization Strategy:** Propose a `server/src/modules/` or `server/src/domains/` structure to encapsulate these feature-specific folders.

### 2. Missing/Broken Dependencies in Monorepo
*   **Type:** Dependency
*   **Status:** Detected
*   **Description:** `pnpm install` is known to fail (per system memory). `server` relies on workspace packages that may not be correctly linked in `package.json`.
*   **Neutralization Strategy:** Audit `package.json` files against `packages/` directory and ensure workspace links are explicit.

## 🟡 Low Risks (Housekeeping)

### 1. Ambiguous Naming
*   **Type:** Clarity
*   **Description:** `FeatureFlagService` exists in both `server/src/services` and `@intelgraph/feature-flags`, leading to import confusion.
*   **Neutralization Strategy:** Renaming the legacy service is part of the deprecation plan.

---

## Neutralization Log

| Date | Risk ID | Action | Result |
| :--- | :--- | :--- | :--- |
| 2025-10-XX | Critical-1 | Removed `eval()` from `flags/store.ts` | **SECURED**: Vulnerability eliminated. |
| 2025-10-XX | Critical-1 | Added `@intelgraph/feature-flags` to `server/package.json` | **FIXED**: Modern implementation now resolvable. |
| 2025-10-XX | Critical-1 | Added `@deprecated` tags to legacy files | **CONTAINED**: Developers warned against use. |
