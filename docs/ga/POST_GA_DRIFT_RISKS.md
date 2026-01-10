# Post-GA Drift Risk Analysis

**Scope:** Post-MVP-4 GA Stabilization Window
**Owner:** Jules (Drift Prevention Owner)

## 1. Drift Taxonomy

We define "Drift" as any silent divergence between the **GA Promise** (what we said we shipped) and the **GA Reality** (what is actually running/repo state).

### A. Release Notes vs. Reality
*   **Risk:** Features claimed as "Shipped" in `RELEASE_NOTES_v4.0.0.md` are actually behind feature flags or require manual config not documented.
*   **Detection:** "Truth Audit" - Random sampling of 5 claimed features vs. a fresh install.
*   **Owner:** QA / Product Owner
*   **Action:** Immediate "Errata" publication if discrepancy found.

### B. Security Posture Drift
*   **Risk:** `package.json` has floating versions (`^` or `~`) that pull in a new transitive dependency with a vulnerability *after* the GA scan.
*   **Detection:** Daily `npm run security:check` in CI even on stale branches.
*   **Owner:** Security Lead
*   **Action:** Pin dependency exact version; release hotfix patch.

### C. CI Gate Erosion
*   **Risk:** "Temporary" bypasses (`continue-on-error: true`) added for GA rush remain active, allowing regressions to slide in during stabilization.
*   **Detection:** `grep "continue-on-error" .github/workflows/*.yml`
*   **Owner:** DevOps / Release Captain
*   **Action:** Weekly "Gatekeeper Review" to remove bypasses or formalize them as waivers.

### D. Evidence Script Decay
*   **Risk:** Scripts like `scripts/compliance/generate_sbom.ts` rely on external APIs or specific tool versions that change, making it impossible to reproduce the GA evidence bundle later.
*   **Detection:** Weekly automated run of evidence generation scripts.
*   **Owner:** Compliance Lead
*   **Action:** Vendor/freeze the evidence generation toolchain.

### E. Demo/Runbook Reproducibility
*   **Risk:** The "Golden Path" demo script (`docs/demo/MVP4_DEMO_SCRIPT.md`) works today but fails next week due to data expiry or 3rd party API changes.
*   **Detection:** Automated "Golden Path" E2E test running daily.
*   **Owner:** DevRel / QA
*   **Action:** Fix script or mock external dependency.

## 2. Detection Matrix

| Drift Type | Detection Method | Frequency | Owner | Alert Channel |
| :--- | :--- | :--- | :--- | :--- |
| **Doc/Code Mismatch** | Manual Audit | Weekly | PM | #summit-governance |
| **Security/Deps** | Automated Scan | Daily | Security | #summit-sec-alerts |
| **CI Gates** | Scripted Grep | Weekly | DevOps | #summit-ops |
| **Evidence Tools** | Auto-Run | Weekly | Compliance | #summit-compliance |
| **Runbooks** | E2E Test | Daily | QA | #summit-alerts |

## 3. Remediation Protocol

If drift is detected:
1.  **Stop the Line:** No new merges until drift is assessed.
2.  **Classify:** Is it a **Regression** (fix code) or a **Documentation Error** (fix docs)?
3.  **Remediate:** Apply fix.
4.  **Post-Mortem:** Update this document if a new type of drift was discovered.
