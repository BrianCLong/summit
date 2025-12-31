# Operator Certification & Roles

Operational discipline is the primary defense against failure. The platform defines specific human roles with distinct responsibilities, privileges, and certification requirements.

## 1. Role Definitions

### 👑 Platform Owner
*   **Responsibility:** Ultimate accountability for the platform's strategic alignment and budget.
*   **Privileges:** System initialization, budget approval, disaster recovery invocation.
*   **Anti-Pattern:** Should not be approving daily tactical runs.

### 🎮 Operator (The Pilot)
*   **Responsibility:** Day-to-day execution of intelligence and autonomy workflows. Monitoring active agents.
*   **Privileges:** Launch runs, modify standard configs, triage alerts.
*   **Certification:** `Certified Operator (Level 1)`

### 🛡️ Security Officer
*   **Responsibility:** Policy definition, key management, and audit log review.
*   **Privileges:** Update OPA policies, rotate keys, view security audits.
*   **Restriction:** Cannot *execute* runs (Separation of Duties).

### 🤖 Autonomy Approver
*   **Responsibility:** Human-in-the-loop authorization for high-stakes autonomous actions (Tier 2/3).
*   **Privileges:** Approve/Deny pending agent actions.
*   **Certification:** `Certified Autonomy Supervisor (Level 2)`

### 🔍 Auditor
*   **Responsibility:** Post-hoc verification of compliance and integrity.
*   **Privileges:** Read-only access to all ledgers and logs. No execution rights.

---

## 2. Separation of Duties (SoD) Matrix

| Action | Operator | Security Officer | Autonomy Approver | Auditor |
| :--- | :---: | :---: | :---: | :---: |
| **Launch Run** | ✅ | ❌ | ❌ | ❌ |
| **Approve Action** | ❌ | ❌ | ✅ | ❌ |
| **Edit Policy** | ❌ | ✅ | ❌ | ❌ |
| **Rotate Keys** | ❌ | ✅ | ❌ | ❌ |
| **View Ledger** | ✅ | ✅ | ✅ | ✅ |
| **Delete Data** | ❌ | ❌ | ❌ | ❌ |

*(Note: Data deletion is only possible via specific retention policies or "Right to be Forgotten" workflows, never manual ad-hoc deletion.)*

---

## 3. Certification Paths

To ensure competence, personnel must pass certification thresholds before being granted elevated privileges.

### Level 1: Certified Operator
*   **Prerequisite:** Operations Onboarding Course.
*   **Exam:**
    *   System Architecture Basics.
    *   Interpreting the Dashboard.
    *   Handling Alerts & Incidents.
*   **Renewal:** Annual.

### Level 2: Certified Autonomy Supervisor
*   **Prerequisite:** Level 1 + 3 months operational experience.
*   **Exam:**
    *   Advanced Agent Logic.
    *   Risk Assessment & Failure Modes.
    *   Intervention Protocols (Kill Switches).
*   **Renewal:** Every 6 months.

### Level 3: Platform Architect (Admin)
*   **Prerequisite:** Deep technical understanding of deployment and infra.
*   **Focus:** Disaster Recovery, scaling, and configuration management.
