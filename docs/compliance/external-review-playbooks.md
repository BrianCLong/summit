# External Review Playbooks

This document defines standard operating procedures for external reviews of Summit's security and compliance posture.

## 1. Customer Security Review

**Objective:** Provide transparency to prospects/customers to unblock sales.

**Trigger:** Customer requests security packet (questionnaire, pen test summary, SOC 2 report).

**Process:**

1.  **Request:** Sales team submits request via internal portal.
2.  **Packet Generation:** Compliance automation generates the standard "Trust Packet".
    - SOC 2 Bridge Letter (if applicable)
    - Pen Test Executive Summary
    - SIG Lite / CAIQ pre-filled responses
3.  **Delivery:** Packet is delivered via secure link (NDA required).

**Standard Artifacts:**

- `docs/compliance/public-compliance-posture.md`
- `evidence/latest-pen-test-summary.pdf` (Simulated)
- `compliance/control-map.yaml` (Sanitized view)

## 2. Partner Technical Review

**Objective:** Validate integration security and data handling for partners.

**Trigger:** New integration or partnership agreement.

**Process:**

1.  **Architecture Review:** Partner reviews `docs/governance/DATA_MODEL.md` and `docs/governance/API_SECURITY.md`.
2.  **Sandbox Access:** Partner is given access to a sandbox environment to test controls.
3.  **Attestation:** Both parties sign a shared responsibility matrix.

## 3. Auditor Readiness Review (Mock Audit)

**Objective:** Prepare for formal certification audit (SOC 2, ISO).

**Trigger:** Quarterly, or 1 month before external audit.

**Process:**

1.  **Scope Definition:** Select controls to audit (based on `compliance/control-map.yaml`).
2.  **Evidence Collection:** Run `scripts/compliance/generate_evidence.ts` for the audit period.
3.  **Gap Analysis:** Compare evidence against control requirements.
4.  **Remediation:** Log findings in Linear and fix before external auditors arrive.

## Q&A Crosswalk

| Question Category  | Typical Question                 | Evidence / Artifact                            |
| :----------------- | :------------------------------- | :--------------------------------------------- |
| **Access Control** | "How do you manage prod access?" | OPA Policies, Access Logs, `CC6.1` Evidence    |
| **Change Mgmt**    | "Do you review all code?"        | GitHub PR settings, `CC7.1` Evidence           |
| **Data Safety**    | "Is data encrypted at rest?"     | Infra config (Terraform/Helm), Database Config |
| **Incident Resp**  | "Do you have an IR plan?"        | `docs/runbooks/incidents/`, IR Drill Logs      |
