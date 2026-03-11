# Operational Runbook: On-Call Escalation Procedures

## Trigger Conditions
- PagerDuty Alert: "High Severity Incident" with no response from primary on-call.
- Incident unresolved by primary on-call within the target time-to-resolve (TTR).
- Incident requires specialized knowledge or cross-functional coordination.

## Step-by-Step Procedures

1. Open the #inc-summit-ops channel and acknowledge the alert.
2. Determine the severity of the incident and escalate to the appropriate tier (e.g., L2 or L3) based on `docs/runbooks/GA_ESCALATION_MATRIX.md`.
3. Escalate the incident to the secondary on-call engineer using PagerDuty.
4. Provide a clear and concise summary of the issue, current status, and any actions taken so far.
5. If the incident involves security or compliance concerns, escalate to the `@intelgraph-security` team immediately.
6. For significant customer impact, coordinate with the Support team (L1) to send customer communications using templates in `docs/runbooks/communication-templates.md`.
7. Once the incident is resolved, schedule a blameless postmortem using `docs/runbooks/postmortem_template.md`.

## Verification Steps
- Confirm the secondary on-call or escalated team acknowledges the incident and takes ownership.
- Ensure the incident status is updated in PagerDuty and the #inc-summit-ops channel.
- Monitor the incident resolution progress to ensure the issue is resolved within the agreed TTR.

## Rollback Instructions
- De-escalate the incident if the issue is resolved quickly or determined to be a false alarm.
- Document all actions taken and the final resolution in the incident report.
