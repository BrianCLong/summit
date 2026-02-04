# Cloud Authorization Strategy (FedRAMP 20x)
**Status:** Strategic Draft
**Target:** FedRAMP Moderate / High
**Modernization:** FedRAMP Authorization Act (2026)

## 1. Vision: FedRAMP as Code
Summit adopts a "FedRAMP 20x" posture, prioritizing machine-readable evidence (OSCAL) and continuous automated validation over static documentation. This strategy aligns with the 20x goal of reducing authorization timelines.

## 2. FedRAMP Rev5 vs. 20x Decision Tree
We determine our compliance path based on the following logic:

*   **Is the component new or legacy?**
    *   **New:** Adopt **FedRAMP 20x** (OSCAL-native).
    *   **Legacy:** Maintain **Rev5** baseline, migrate to OSCAL incrementally.
*   **Is the control automatable?**
    *   **Yes:** Implement as a CI Gate (Policy-as-Code).
    *   **No:** Document in process policy (Policy-as-Doc).

**Strategic Decision:** Summit Core Platform will target **FedRAMP 20x** readiness to leverage the "Presumption of Adequacy" for rapid agency ATOs.

## 3. Machine-Readable Evidence (OSCAL)
Summit mandates that all governance evidence be exportable in OSCAL (Open Security Controls Assessment Language) format.

### 3.1 Artifact Generation
*   **SSP (System Security Plan):** Generated from `compliance/control-map.yaml` + code annotations.
*   **SAP (Security Assessment Plan):** Auto-generated based on test coverage.
*   **SAR (Security Assessment Report):** CI test reports converted to OSCAL findings.

### 3.2 Evidence Pipeline
1.  **Collection:** `scripts/evidence/collect_evidence.ts` runs during build.
2.  **Normalization:** Evidence is mapped to NIST 800-53 Rev5 controls.
3.  **Serialization:** Output to `artifacts/fedramp/oscal_evidence.json`.

## 4. Continuous Monitoring (ConMon)
Under 20x, ConMon is near real-time.

*   **Vulnerability Scanning:** Container scans (daily), Code scans (per PR).
*   **Configuration Drift:** Terraform/Helm drift detection (hourly).
*   **Reporting:** Automated monthly ConMon feed to JAB/Agency dashboard.

## 5. Control Implementation Strategy
| Control Family | Implementation | Evidence |
| :--- | :--- | :--- |
| **AC (Access Control)** | OPA Policies + Keycloak | Policy evaluation logs |
| **AU (Audit)** | Centralized Logging (Immutable) | Cryptographic proofs |
| **CM (Config Mgmt)** | GitOps (ArgoCD) | Git commit history |
| **SI (System Integrity)** | Image Signing (Cosign) | Signature verification output |

## 6. Action Items
*   [ ] Implement OSCAL exporter for `control_evidence_index.json`.
*   [ ] Validate crypto module FIPS 140-3 status (transition from 140-2).
*   [ ] Update "Significant Change" definition for AI model updates.
