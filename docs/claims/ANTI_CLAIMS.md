# Summit Anti-Claims (Boundaries)

To maintain credibility, we must be as precise about what Summit is **NOT** as what it is. These boundaries are intentional architectural decisions, not missing features.

---

## 1. No "God Mode"
**Claim:** "Summit allows admins to see everything."
**Anti-Claim:** **Summit strictly forbids implicit administrative access to tenant data.**
*   **Rationale:** "Super-admin" accounts are the single biggest vector for insider threats and catastrophic breaches.
*   **Enforcement:**
    *   `TenantSafePostgres` requires a `tenantId` in the context for *all* queries.
    *   Admin access requires a "Break Glass" procedure that generates a distinct audit trail event (`BREAK_GLASS_ACCESS`).

## 2. No "Infinite Scale" Magic
**Claim:** "Summit scales infinitely and instantly."
**Anti-Claim:** **Summit enforces strict, predictable resource quotas.**
*   **Rationale:** "Infinite scale" usually means "infinite bill" or "noisy neighbor" problems. We prioritize stability and predictability over raw, unchecked throughput.
*   **Enforcement:**
    *   `QuotaManager` rejects requests exceeding tiered limits.
    *   `AdmissionControl` middleware sheds load deterministically under stress.

## 3. No Unexplained AI
**Claim:** "Summit's AI figures it out for you."
**Anti-Claim:** **Summit does not support "black box" decision making for high-stakes actions.**
*   **Rationale:** In high-stakes intelligence, an answer without provenance is a liability.
*   **Enforcement:**
    *   All LLM outputs must be accompanied by citations or source nodes.
    *   `ProvenanceLedger` links the prompt, model version, and source data to the output.

## 4. No Ad-Hoc Deployments
**Claim:** "You can SSH in and patch it live."
**Anti-Claim:** **Summit infrastructure is immutable.**
*   **Rationale:** Configuration drift is the enemy of reliability.
*   **Enforcement:**
    *   CI/CD pipelines are the only path to production.
    *   `RuntimeDriftDetector` alerts on environment changes that don't match the manifest.

## 5. No "Soft" Deletes for Compliance Data
**Claim:** "You can undo a deletion."
**Anti-Claim:** **Compliance records are WORM (Write Once, Read Many).**
*   **Rationale:** You cannot un-ring a bell in a legal context. History must be preserved.
*   **Enforcement:**
    *   `audit_events` table has database-level triggers preventing `UPDATE` or `DELETE`.
