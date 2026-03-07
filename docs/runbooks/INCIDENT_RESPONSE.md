# Incident Response Runbook (GA)

## Severity Levels

- **SEV-1 (Critical)**: Service Down, Data Loss, Security Breach.
  - **Response**: Immediate PagerDuty to On-Call + Eng Manager. War Room required.
  - **SLO**: Ack < 15m, Resolve < 4h.
- **SEV-2 (High)**: Core feature broken, high friction, no workaround.
  - **Response**: Page On-Call. Fix within 24h.
- **SEV-3 (Medium)**: Non-critical, workaround exists.
  - **Response**: Business hours.
- **SEV-4 (Low)**: Minor cosmetic.

## Response Process (IMOC - Incident Manager On Call)

1.  **Acknowledge**: Ack the page within 15 mins.
2.  **Assess**: Is it Sev-1? If yes, declare "Major Incident" in Slack `#incidents`.
3.  **Contain**:
    - If caused by recent deploy -> **ROLLBACK**.
    - If caused by load -> **Scale Up** or **Enable Rate Limits**.
    - If security -> **Isolate** affected nodes.
4.  **Communicate**:
    - Update Status Page: "Investigating issues with..."
    - Update Internal Stakeholders every 30 mins.
5.  **Resolve**: Restore service.
6.  **Post-Mortem**: Within 48 hours. Root cause analysis (5 Whys).

## Communication Templates

### Status Page - Investigating

> "We are currently investigating reports of [Issue Description]. Users may experience [Impact]. Updates will be provided shortly."

### Status Page - Identified

> "The issue has been identified as [Cause]. A fix is being [implemented/verified]."

### Status Page - Resolved

> "The issue has been resolved and systems are operating normally."
