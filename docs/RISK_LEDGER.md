# Jules Risk Ledger

> **Status:** Active
> **Custodian:** Jules (Autonomous Threat Detector & Risk Neutralizer)
> **Last Updated:** 2025-10-XX

This ledger tracks systemic risks, architectural anomalies, and potential threats to the stability and integrity of the IntelGraph platform.

## 🔴 Critical Risks (Immediate Action Required)

### 1. Feature Flag Fragmentation & Security Vulnerability
*   **Type:** Security / Architectural / Dependency
*   **Status:** Closed (legacy implementations removed)
*   **Description:** The system previously contained **four** competing ways to handle feature flags, including an insecure in-memory store and a stale Flagsmith shim.
*   **Details:**
    1.  `server/src/feature-flags/`: The intended modern standard (using `@intelgraph/feature-flags`). Dependency validated.
    2.  `server/src/flags/store.ts`: **Removed** along with `middleware/flagGate.ts` due to code injection risk.
    3.  `server/src/featureFlags/flagsmith.ts`: **Removed**; routes now rely solely on the modern provider.
    4.  `server/src/services/FeatureFlagService.ts`: **Removed**; migrations point to `feature-flags/setup.ts`.
*   **Neutralization Strategy:**
    *   **Secure:** Delete legacy modules and mocks; route documentation to the shared provider.
    *   **Prevent:** ESLint `no-restricted-imports` guardrails block reintroducing removed modules.
    *   **Consolidate:** Migration guides updated to initialize and read from `feature-flags/setup.ts`.

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
| 2025-10-XX | Critical-1 | Removed legacy feature flag stack (`flags/`, `featureFlags/flagsmith.ts`, `services/FeatureFlagService.ts`) | **SECURED**: Single supported provider enforced with lint guardrails. |
