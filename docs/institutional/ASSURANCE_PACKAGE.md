# Institutional Assurance Package

This document defines the assurance controls, evidence artifacts, and certification targets for the platform. It is designed to be handed to auditors (internal or external) to demonstrate compliance and control.

## 1. Governance Summary

The platform operates under a **"Verify, Don't Trust"** governance model.

*   **Identity:** Strong authentication (MFA/OIDC) for all operators.
*   **Authorization:** ABAC (Attribute-Based Access Control) via Open Policy Agent (OPA).
*   **Accountability:** Tamper-evident Provenance Ledger for all mutations.

## 2. Evidence Indices

Auditors should request the following artifacts from the **Evidence API** (`/api/compliance/evidence`):

| Artifact ID | Description | Frequency | Format |
| :--- | :--- | :--- | :--- |
| `EVD-001` | **Ledger Integrity Check** - Merkle tree root hash verification. | Daily | JSON/Sig |
| `EVD-002` | **Policy Configuration** - Snapshot of active OPA policies. | On Change | Rego |
| `EVD-003` | **Access Log** - Anonymized record of who accessed what. | Real-time | JSON-L |
| `EVD-004` | **Model Cards** - Metadata for all active AI models (training data, bias). | Per Version | Markdown |
| `EVD-005` | **Autonomy Decision Log** - Trace of agent reasoning and human approvals. | Real-time | JSON |

## 3. Audit Workflows

### Standard Quarterly Audit
1.  **Scope:** Review last 90 days of Tier 2/3 autonomous actions.
2.  **Procedure:**
    *   Sample 5% of decisions.
    *   Verify human approval was granted where required.
    *   Verify inputs match the ledger record.
3.  **Outcome:** Pass/Fail report with remediation items.

### Incident Audit
*   **Trigger:** Unexpected system behavior or policy violation.
*   **Procedure:**
    *   Freeze ledger state.
    *   Export causal graph for the specific timeframe.
    *   Identify the diverging logic or data input.

---

## 4. Certification Targets

The platform is designed to support the following certifications:

### Internal Certification (Ready for Business)
*   **Criteria:** Deployment is stable, backups are verified, operators are trained.
*   **Authority:** Internal Platform Owner.

### Partner Certification (Ecosystem Trust)
*   **Criteria:** Compliance with API standards, security posture verification.
*   **Authority:** Platform Vendor / Consortium.

### Regulator-Facing Readiness (SOC2 / ISO 27001)
*   **Criteria:** Evidence logs mapping to control objectives (Security, Availability, Integrity).
*   **Status:** The platform generates *raw evidence* to support these audits, but the *operation* of the platform determines compliance.

## 5. Control Mapping

| Control Domain | Platform Feature | Evidence |
| :--- | :--- | :--- |
| **Access Control** | OIDC + OPA Gates | `EVD-002`, `EVD-003` |
| **Change Management** | GitOps + Ledger | `EVD-001` |
| **System Integrity** | Signed Artifacts | `EVD-001` |
| **Audit Trails** | Immutable Provenance | `EVD-005` |
