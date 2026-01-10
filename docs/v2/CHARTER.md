# Summit Version 2 Charter

**Status:** ACTIVE
**Effective Date:** 2025-10-27
**Authority:** V2 Re-Opening Architect

## 1. Mission Statement

Summit Version 2 (V2) is authorized to expand the capabilities of the platform while strictly preserving the certified guarantees of Version 1 (V1). V2 operates under a "Dual-Mandate":

1.  **Preservation:** Maintain V1 operational assurances (Security, Provenance, Governance) without regression.
2.  **Expansion:** Enable targeted innovation in defined "Safe Zones" (Sandbox) and through explicit "Change Classes".

V2 is not a rewrite; it is a controlled evolution.

## 2. Non-Goals & Exclusions

To prevent scope creep and regression, the following are explicitly excluded from V2:

*   **No Silent Weakening:** No changes to V1 guarantees without a Class C "Breaking Review".
*   **No Unbounded Experiments:** All experiments must be contained within the V2 Sandbox or explicitly approved capability modules.
*   **No Production Data in Sandbox:** V2 experimental paths must never access live production data.
*   **No Ad-Hoc Governance:** All V2 decisions must produce audit evidence compatible with the V1 ledger.

## 3. Inherited Guarantees (The "Frozen Core")

V2 inherits and enforces the following V1 contracts as immutable baselines:

*   **Security:** The specific controls defined in `SECURITY.md` (e.g., Supply Chain verification, signing).
*   **Governance:** The Policy-as-Code framework defined in `docs/GOVERNANCE.md` (Schemas, OPA policies).
*   **Provenance:** The requirement that all build and deploy events produce signed provenance records.
*   **Operations:** Existing SLOs and operational runbooks unless explicitly superseded by a Class B/C change.

See `docs/v2/INHERITED_CONTRACTS.md` for the authoritative list.

## 4. New Capability Classes

V2 authorizes changes according to the strict taxonomy defined in `docs/v2/CHANGE_CLASSES.md`:

*   **Class A (Additive):** Low risk, non-breaking.
*   **Class B (Behavioral):** Medium risk, requires evidence.
*   **Class C (Contract-Affecting):** High risk, requires re-attestation.

## 5. Risk Appetite & Guardrails

V2 accepts **Moderate Risk** in the Sandbox and **Low Risk** in the Core.

**Guardrails:**
*   **Isolation:** Sandbox code must be physically or logically isolated from Core execution paths.
*   **Feature Flags:** All V2 features in shared components must be gated by feature flags (default: OFF).
*   **Budgeting:** V2 experiments have separate resource quotas.

## 6. Sunset Criteria for Experiments

Any V2 experiment or sandbox module must be **Retired** or **Promoted** within 90 days.

*   **Retirement:** Code deletion, archive, or move to `disabled/`.
*   **Promotion:** Formal Class B or C review to merge into Core.

An experiment is considered "stale" if it has no activity for 30 days and will be automatically flagged for removal.
