# Pilot Decision Scope

## Core Philosophy
Constraint creates clarity. We focus only on high-stakes decisions where Summit can add immediate trust and auditability.

## In-Scope Decisions (Pick 3–5 Only)

These decisions represent the "Beachhead" for Security Incident Governance.

### 1. Containment Action Approval
* **Context:** SOC analyst wants to isolate a host or block a subnet.
* **Summit Role:** Verify evidence (logs, alerts) meets threshold before allowing execution.
* **Why:** Prevents "panic blocking" that causes outages.

### 2. Automated Response Gating
* **Context:** Existing SOAR playbook attempts to execute a remediation.
* **Summit Role:** Gate the execution based on context (e.g., "Is this a critical server?", "Is it business hours?").
* **Why:** Reduces fear of automation running amok.

### 3. Escalation vs. Non-Escalation
* **Context:** Incident triaged as Low vs. High severity.
* **Summit Role:** Validate severity scoring against historical precedents and policy.
* **Why:** Ensures critical incidents aren't missed and teams aren't drowned in false positives.

### 4. Data Exfiltration Response
* **Context:** DLP alert triggers a potential block of user access.
* **Summit Role:** Correlate with user behavior (HR status, recent tickets) to confirm intent.
* **Why:** High false positive rate in DLP destroys user trust; Summit restores it.

### 5. Privileged Access Revocation
* **Context:** Emergency access granted during incident.
* **Summit Role:** Enforce time-bound revocation and check for artifacts created during session.
* **Why:** Prevents "standing privileges" left behind after incidents.

## Explicitly Out of Scope

* **Low-risk alerts:** Noise reduction is not the goal here.
* **Routine automation:** e.g., Password resets, software patching (unless critical).
* **Non-security workflows:** HR, Finance, etc. (Scope Creep).
* **"Nice to have" features:** Dashboards, chat bots, general Q&A.

## Scope Management

Any addition to the "In-Scope" list requires removing an existing item.
**Maximum of 5 active decision types at any time during the pilot.**
