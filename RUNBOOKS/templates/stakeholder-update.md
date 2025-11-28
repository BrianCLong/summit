# Stakeholder Update Templates

## Template 1: Initial Notification (SEV1/SEV2)

**When to use**: Within 5 minutes of SEV1, 15 minutes of SEV2

**Subject**: [SEV#] Incident: [Brief Description]

**Body**:
```
INCIDENT ALERT

Severity: SEV[1/2]
Status: Investigating
Started: [HH:MM UTC]

IMPACT:
[1-2 sentence description of user impact]
- Affected users: [All / Majority / Subset]
- Affected features: [List key features]

CURRENT STATUS:
We are currently investigating the root cause. Our incident response team has been activated and is working to resolve this issue.

NEXT UPDATE:
We will provide an update in [15/30] minutes, or sooner if we have significant progress.

Incident Commander: [Name]
Slack Channel: #incident-YYYYMMDD-brief

---
This is an automated notification from the Summit/IntelGraph incident response system.
```

---

## Template 2: Progress Update

**When to use**: Every 15-30 minutes during active SEV1/SEV2

**Subject**: [SEV#] Update: [Brief Description]

**Body**:
```
INCIDENT UPDATE

Severity: SEV[1/2]
Status: [Investigating / Mitigating / Monitoring]
Duration: [X hours Y minutes]

PROGRESS:
[2-3 sentences on what we've learned and what we're doing]

CURRENT THEORY:
[Brief explanation of suspected root cause]

MITIGATION IN PROGRESS:
- [Action 1]
- [Action 2]

IMPACT (Updated):
- User impact: [Better / Same / Worse]
- Estimated restoration: [HH:MM UTC or "Assessing"]

NEXT UPDATE:
[Time] or when we have significant progress

Incident Commander: [Name]
---
This is an update from the Summit/IntelGraph incident response system.
```

---

## Template 3: Mitigation Complete

**When to use**: When immediate fix is applied but monitoring for stability

**Subject**: [SEV#] Mitigation Applied: [Brief Description]

**Body**:
```
INCIDENT MITIGATION

Severity: SEV[1/2]
Status: Monitoring
Duration: [X hours Y minutes]

MITIGATION APPLIED:
[2-3 sentences describing what was done to restore service]

CURRENT STATUS:
Service has been restored. We are monitoring metrics to ensure stability before declaring full resolution.

VERIFICATION:
- Latency: Back to normal (p95 = [___ms])
- Error rate: Below [__%]
- User reports: [Decreasing / Stopped]

MONITORING PERIOD:
We will monitor for [30-60] minutes to ensure stability before closing this incident.

ROOT CAUSE:
[Brief 1-2 sentence preliminary assessment]

NEXT STEPS:
- Continue monitoring
- Schedule postmortem within 72 hours
- Implement preventive measures

Incident Commander: [Name]
---
This is an update from the Summit/IntelGraph incident response system.
```

---

## Template 4: Resolution Notification

**When to use**: After sustained stability (30+ minutes for SEV1/2)

**Subject**: [SEV#] Resolved: [Brief Description]

**Body**:
```
INCIDENT RESOLVED

Severity: SEV[1/2]
Status: Resolved
Started: [HH:MM UTC]
Resolved: [HH:MM UTC]
Total Duration: [X hours Y minutes]

FINAL STATUS:
This incident has been fully resolved. All services are operating normally and have been stable for [30+] minutes.

IMPACT SUMMARY:
- Users affected: [Number or percentage]
- Features affected: [List]
- Data loss: [None / Details if any]

RESOLUTION:
[2-3 sentences describing how the issue was resolved]

ROOT CAUSE (Preliminary):
[Brief explanation - full details in postmortem]

POSTMORTEM:
A full postmortem will be published within 72 hours and will include:
- Detailed timeline
- Root cause analysis
- Action items to prevent recurrence
- Lessons learned

VERIFICATION:
✓ Metrics returned to normal
✓ Smoke tests passing
✓ No new errors observed

Thank you for your patience during this incident.

Incident Commander: [Name]
Postmortem: [Link when available]
---
This is the final notification for this incident.
```

---

## Template 5: SEV3/SEV4 Summary (Email)

**When to use**: For lower-severity incidents (send after resolution)

**Subject**: [SEV#] Incident Summary: [Brief Description]

**Body**:
```
INCIDENT SUMMARY

Severity: SEV[3/4]
Duration: [HH:MM - HH:MM UTC] ([X hours])

ISSUE:
[1-2 sentences describing the issue]

IMPACT:
[Brief description of user impact, if any]

RESOLUTION:
[What was done to fix it]

ACTION ITEMS:
- [Action 1 to prevent recurrence]
- [Action 2]

This incident did not require a full postmortem but has been documented for trend analysis.

---
Summit/IntelGraph Engineering Team
```

---

## Template 6: Customer-Facing Status Page Update

**When to use**: For SEV1/SEV2 with external customer impact

**Format**: Plain text for status page

```
[INVESTIGATING] We are currently investigating reports of [brief issue description].
Our team is actively working to identify the root cause and will provide updates
as we have more information.

Last updated: [HH:MM UTC]
```

```
[IDENTIFIED] We have identified the issue causing [brief description].
Our team is working to implement a fix. Estimated restoration: [HH:MM UTC or "assessing"].

Last updated: [HH:MM UTC]
```

```
[MONITORING] A fix has been implemented and service is being restored.
We are monitoring the situation to ensure stability.

Last updated: [HH:MM UTC]
```

```
[RESOLVED] This incident has been resolved. All services are operating normally.
We apologize for the inconvenience. A postmortem will be published at [link].

Last updated: [HH:MM UTC]
```

---

## Distribution Guidelines

### SEV1
- **Immediate**: #incident-channel, #engineering, on-call via PagerDuty
- **5 min**: Leadership (#leadership), stakeholders (#stakeholders)
- **10 min**: Status page (if customer-facing), customer notifications
- **Updates**: Every 15 minutes until resolved

### SEV2
- **15 min**: #incident-channel, #engineering
- **30 min**: Leadership, stakeholders
- **1 hour**: Status page (if customer-facing and not resolved)
- **Updates**: Every 30 minutes until resolved

### SEV3/SEV4
- **1 hour**: #engineering, #incident-log
- **Post-resolution**: Summary email to stakeholders
- **Status page**: Not required unless specifically customer-facing

---

## Communication Channels

| Audience | Primary Channel | Backup Channel |
|----------|----------------|----------------|
| Engineering Team | #incident-YYYYMMDD | #engineering |
| SRE/Ops | #sre-oncall | PagerDuty |
| Leadership | #leadership | Direct message |
| Customers | Status page | Email notification |
| All Employees | #general | Email |

---

## Best Practices

1. **Be Honest**: Don't speculate or promise timelines you can't meet
2. **Be Specific**: Provide concrete metrics and impacts
3. **Be Frequent**: Communicate even if "no update" - silence creates anxiety
4. **Be Clear**: Use plain language, avoid jargon for non-technical audiences
5. **Be Accountable**: Own the issue and commit to transparency

---

## Example Timeline

```
10:00 UTC - Alert fires
10:02 UTC - Incident acknowledged
10:05 UTC - Initial notification sent (Template 1)
10:20 UTC - Progress update (Template 2)
10:35 UTC - Progress update (Template 2)
10:50 UTC - Mitigation complete (Template 3)
11:20 UTC - Monitoring period complete
11:25 UTC - Resolution notification (Template 4)
Within 72h - Postmortem published
```
