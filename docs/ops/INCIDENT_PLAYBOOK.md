# Incident Response Playbook

## 1. Severity Model

| Severity | Definition | Response Target | Examples |
| :--- | :--- | :--- | :--- |
| **SEV0** | **Catastrophic Outage**. Critical user journeys (Login, Ingest, Query) completely unavailable. Data loss imminent or occurring. | **Immediate** (Page All) | DB Cluster down, Security Breach, Global API 500s. |
| **SEV1** | **Major Degradation**. Critical functionality impaired but not totally down. Performance unusable for >25% of users. | **15 Minutes** (Page On-Call) | High latency > 2s, Ingest backlog > 1h. |
| **SEV2** | **Minor Issue**. Non-critical features broken. Workarounds exist. | **1 Hour** (Business Hours) | Admin panel slow, Reporting delayed. |
| **SEV3** | **Trivial / Cosmetic**. Glitches, minor bugs. | **Next Sprint** | Typo in UI, confusing error message. |

## 2. Roles & Responsibilities

| Role | Responsibility |
| :--- | :--- |
| **Incident Commander (IC)** | Leads the response. Single source of truth. Decides on escalation. |
| **Operations Lead** | Executes technical fixes (SSH, restarts, config changes). |
| **Comms Lead** | Updates status page, internal stakeholders, and customers. |
| **Scribe** | Records timeline of events, commands run, and decisions made for Post-Mortem. |

## 3. Communication Templates

### Initial Acknowledgment (Slack/Status Page)
> **[SEV-X] Investigating: [Short Description]**
> We are investigating reports of [symptom].
> **Impact**: [Who is affected]
> **Next Update**: [Time, e.g., 30 mins]
> **IC**: @user

### Update
> **[SEV-X] Update: [Short Description]**
> We have identified the root cause as [Cause].
> **Remediation**: We are currently [Action].
> **ETA for Recovery**: [Time]

### Resolution
> **[SEV-X] Resolved: [Short Description]**
> Systems have returned to normal.
> **Root Cause**: [Brief Cause]
> **Next Steps**: Post-mortem to follow.

## 4. Escalation Rules ("Stop the Line")
*   If a **SEV0** is not resolved within **1 hour**, escalate to VP of Engineering.
*   If a **SEV1** is not resolved within **4 hours**, escalate to Director.
*   If the incident involves **Data Privacy/Security**, Legal/Compliance **MUST** be notified immediately.
