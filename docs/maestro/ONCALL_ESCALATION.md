# Maestro On-call & Escalation Documentation

## Overview

This document outlines the on-call rotation, severity matrix, communication templates, and drill procedures for the Maestro platform. Effective on-call and escalation are crucial for maintaining service reliability and responding to incidents promptly.

## On-call Rotation

- **Primary On-call:** Brian Long (brianclong@gmail.com, +1-202-285-7822)
- **Secondary On-call:** @guy-ig

(Details of PagerDuty rotation schedule, handoff procedures, and coverage will be maintained directly in PagerDuty.)

## Severity Matrix

Incidents are categorized by severity to determine response urgency and escalation paths.

| Severity | Impact                                                | Response Time (SLA) | Escalation Path                                                                            |
| :------- | :---------------------------------------------------- | :------------------ | :----------------------------------------------------------------------------------------- |
| **SEV0** | Critical system outage, data loss, security breach    | Immediate           | Primary On-call -> Secondary On-call -> Platform Lead -> Security/Ops Lead -> Exec Sponsor |
| **SEV1** | Major functionality impaired, significant user impact | 15 minutes          | Primary On-call -> Secondary On-call -> Platform Lead                                      |
| **SEV2** | Minor functionality impaired, moderate user impact    | 1 hour              | Primary On-call -> Secondary On-call                                                       |
| **SEV3** | Minor issue, no immediate user impact                 | 4 hours             | Primary On-call                                                                            |
| **SEV4** | Cosmetic, low priority                                | Next business day   | Ticketing system, non-urgent                                                               |

## Communication Templates

Standardized communication templates ensure clear and consistent messaging during incidents.

### Incident Start (Internal)

```
Subject: [SEV<Level>] Incident: <Brief Description> - <Service/Component>

Severity: SEV<Level>
Impact: <Detailed impact on users/systems>
Affected Component(s): <List affected components>
Current Status: <Brief update on what's happening>
Initial Actions: <Actions taken so far>
On-call: <Primary On-call Name>
```

### Incident Update (Internal/External)

```
Subject: [SEV<Level>] Update: <Brief Description> - <Service/Component>

Status: <e.g., Investigating, Identified, Mitigating, Monitoring, Resolved>
Update: <Detailed update on progress, findings, next steps>
Impact: <Current impact>
Next Update: <Time for next update>
```

### Incident Resolution (Internal/External)

```
Subject: [SEV<Level>] Resolved: <Brief Description> - <Service/Component>

Status: Resolved
Resolution: <Actions taken to resolve the incident>
Root Cause (Preliminary): <Initial assessment of root cause>
Impact: <Final impact summary>
Next Steps: <Follow-up actions, e.g., Post-mortem, permanent fix>
```

## Quarterly Drills

Regular mock SEV drills are conducted quarterly to test on-call readiness, escalation paths, and runbook effectiveness.

(Details of drill schedules, scenarios, and post-drill reviews will be maintained in a separate document or system.)

## AlertCenter Integration

AlertCenter routes are configured to automatically trigger incidents based on defined thresholds and anomalies. These incidents are linked to relevant runbooks for quick resolution.

- **AlertCenter:** [Link to Maestro AlertCenter]
- **Runbooks:** [Link to Maestro Runbook Library]
