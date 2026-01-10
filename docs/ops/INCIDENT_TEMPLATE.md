# Incident Report Template

Copy/paste this template into the incident channel or tracker issue. Keep timestamps in UTC.

## Header

- **Incident Title:**
- **Severity:** (SEV0/SEV1/SEV2/SEV3)
- **Status:** (Investigating / Mitigating / Monitoring / Resolved)
- **Start Time (UTC):**
- **Detected By:** (alert/system/person)
- **Owners:** Incident Commander, Comms Lead, Domain Lead
- **Channels:** (Slack/Email/Ticket links)

## Impact Summary

- **Customer Impact:** Who/what is affected? Include tenant/region scope.
- **Symptoms:** Errors, latency, data issues observed.
- **Business/Safety Impact:** SLAs, compliance exposure, or safety considerations.

## Timeline

- **t0:** Detection details
- **t+5m:** Initial triage actions
- **t+30m:** Mitigation attempt(s)
- **t+60m:** Stabilization updates
- **Latest Update:** Current state and next steps

## Diagnosis

- **Primary Suspect(s):** Components, services, or changes in blast radius.
- **Recent Changes:** Deploys, migrations, feature flags.
- **Logs/Metrics/Traces:** Key evidence and links to dashboards.

## Mitigation & Recovery

- **Actions Taken:** Step-by-step with timestamps.
- **Workarounds:** Customer-visible or internal mitigations.
- **Rollback/Hotfix Plan:** Criteria, owner, and execution steps.
- **Data Integrity:** Validation performed and results.

## Communications

- **Internal Updates:** Cadence and recipients.
- **Customer Updates:** What was sent/needs to be sent, channels, and owners.
- **Next Update ETA:**

## Resolution

- **Resolved Time (UTC):**
- **Residual Risk:** Remaining impact or monitoring period required.
- **Validation:** Checks performed to confirm recovery.

## Post-Incident

- **Root Cause:** Concise statement once confirmed.
- **Follow-Up Actions:** Tickets with owners and due dates.
- **Lessons Learned:** What to change (process, tooling, tests, alerts).
- **Attachments:** Dashboards, log exports, or other evidence.
