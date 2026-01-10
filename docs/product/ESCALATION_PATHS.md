# Escalation Paths & Decision Authority (GA 1.0)

> **Status**: Active
> **Version**: 1.0
> **Owner**: Product Council

## 1. Purpose

This document defines the formal escalation paths and key decision-making authorities for managing critical support issues related to the Summit General Availability (GA) product. Its purpose is to ensure that incidents are escalated to the appropriate level swiftly and that decisions are made by the correct stakeholders, consistent with our established governance and incident response protocols.

---

## 2. Escalation Triggers

An issue should be escalated from a standard support ticket to a formal incident management process when it meets the criteria for **P0 (Critical)** as defined in the `SUPPORT_MODEL.md`.

**Key Triggers for Escalation:**

-   **Data Integrity Loss**: Evidence of data loss or corruption for any tenant.
-   **Security Breach**: A confirmed or suspected breach of system security or tenant isolation.
-   **Platform-Wide Outage**: A majority of tenants are unable to access core GA features.
-   **Regulatory or Compliance Failure**: An event that places the platform in breach of its legal or compliance obligations.

---

## 3. Decision Authority

Clear lines of authority are critical for effective incident management. The following roles and responsibilities are defined to align with our operational and governance structure.

### 3.1. Declaring a P0 Incident

-   **Who can declare?**
    -   Any member of the on-call SRE team.
    -   The designated Support Lead for the current shift.
    -   Any member of the Security Council.
-   **Process**: The declaration of a P0 incident immediately triggers the formal incident response process as documented in `docs/ops/INCIDENT_RESPONSE.md`, including the assignment of an Incident Commander (IC).

### 3.2. Approving a Hotfix Deployment

A hotfix is an emergency, out-of-band release to address a critical (P0) issue.

-   **Approval Authority**:
    -   A hotfix requires sign-off from **both** of the following:
        1.  The **Incident Commander** for the active P0 incident.
        2.  The designated **Release Captain** or their delegate.
-   **Criteria for Approval**:
    -   The issue is a confirmed P0 incident with no viable workaround.
    -   The proposed fix has been tested in a staging environment.
    -   The potential blast radius of the fix is understood and deemed acceptable.
    -   A rollback plan has been documented and is ready for execution.
-   **Process**: The approval is formally logged in the incident timeline. The deployment follows the emergency release runbook.

### 3.3. Downgrading a GA Claim

In rare cases, a P0 incident may reveal that a core GA claim (as defined in `docs/ga/GA_DEFINITION.md`) is no longer valid.

-   **Authority to Propose**: The Incident Commander, in consultation with the Security Lead or SRE Lead, can propose that a GA claim be temporarily or permanently downgraded.
-   **Final Approval Authority**:
    -   Downgrading a GA claim requires approval from the **Product Council**, with final sign-off from the **VP of Engineering**.
-   **Process**:
    1.  The IC presents evidence that the claim is unmet.
    2.  The Product Council convenes an emergency session to review the evidence.
    3.  If approved, all relevant public-facing documentation and status pages are updated to reflect the new reality.
    4.  A high-priority remediation plan is established to reinstate the claim.

### 3.4. Leadership Notification

Leadership must be kept informed of critical incidents to manage business-level risk and communication.

-   **Immediate Notification (Automated Page)**:
    -   The declaration of a **P0 incident** automatically pages the **Executive On-Call**, which includes the VP of Engineering and the CISO.
-   **Notification within 60 Minutes (Direct Communication)**:
    -   The Incident Commander is responsible for providing a direct briefing to the Executive On-Call within 60 minutes of a P0 declaration.
-   **Triggers for Broader Leadership Notification**:
    -   Any incident involving confirmed data loss.
    -   Any incident requiring a public security disclosure.
    -   Any incident projected to exceed 4 hours to mitigation.

---

## 4. The Principle of Subsidiarity

Decisions should be made at the lowest possible level of authority. The framework above defines the *minimum* required approvals for critical decisions. The Incident Commander is empowered to make all other operational decisions required to mitigate an incident, in line with the procedures in `docs/ops/INCIDENT_RESPONSE.md`.
