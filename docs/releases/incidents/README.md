# Runbook: Incident Response

## 1. Purpose

This runbook outlines the process for responding to incidents that occur during a release deployment or shortly after. The primary goals are to quickly assess the impact, mitigate the issue (which may involve a rollback), and capture the necessary information for a post-mortem.

## 2. Prerequisites

*   An active incident has been declared in the `#releases` Slack channel.
*   The on-call engineer has been paged and is assuming the role of Incident Commander (IC).

---

## 3. Step-by-Step Instructions

### Step 3.1: Triage and Assess Impact

1.  **Declare the Incident:** The first person to notice the issue should post in the `#releases` channel with the message: `🚨 INCIDENT DECLARED: [Brief summary of the issue] 🚨`
2.  **Establish Incident Commander (IC):** The on-call engineer is the default IC.
3.  **Assess Impact:** The IC, with the help of the team, must quickly determine the impact of the incident:
    *   Is it affecting all users or a subset?
    *   Is it causing data loss or corruption?
    *   Is it a critical service degradation or a minor issue?

### Step 3.2: Mitigate the Issue

Based on the impact assessment, the IC will make a decision on how to mitigate.

1.  **Decision: Roll Back or Fix Forward?**
    *   **Roll Back:** This is the default and preferred response for most incidents. It is the fastest way to restore service. If a rollback is decided, proceed to the [Rollback Runbook](../ROLLBACK.md).
    *   **Fix Forward:** Only consider this option if the issue is minor, the fix is well-understood, and a hotfix can be deployed *faster* than a rollback. This is a rare and high-risk option.

2.  **Execute the Plan:** The IC directs the team to execute either the rollback or the hotfix deployment.

### Step 3.3: Communicate and Document

1.  **Create Incident Ticket:** The IC creates a new incident ticket using the [INCIDENT_TEMPLATE.md](INCIDENT_TEMPLATE.md). This will be the single source of truth for the incident.
2.  **Provide Status Updates:** The IC is responsible for providing regular status updates in the `#releases` channel.
3.  **Resolve the Incident:** Once the system is stable (either via rollback or hotfix), the IC declares the incident resolved.

---

## 4. Expected Artifacts

*   A dedicated Slack thread for the incident.
*   A completed incident ticket (from `INCIDENT_TEMPLATE.md`) containing a timeline, impact analysis, and resolution details.

---

## 5. Failure Modes

| Failure Mode                        | Action                                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Cannot determine impact**         | When in doubt, err on the side of caution. **Roll back.** It is better to roll back unnecessarily than to allow a critical incident to continue. |
| **Rollback fails**                  | This is a major incident. The IC should escalate immediately to the Head of Engineering.                             |
| **Incident Commander is unavailable** | The first engineer to respond to the incident assumes the role of IC.                                              |
