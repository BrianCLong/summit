# Incident Management Runbook

This runbook defines how Summit coordinates incidents from detection through postmortem. Keep it lightweight and actionable; adjust as tooling matures.

## Severity levels

- **SEV1 – Critical outage:** Broad customer impact, core user journeys unavailable, or security incidents requiring immediate response. Target: page instantly; public status updates every 15 minutes.
- **SEV2 – Major degradation:** Partial impact, key features degraded, or error budget burn >25% in a day. Target: page within minutes; stakeholder updates every 30 minutes.
- **SEV3 – Minor impact:** Limited or single-tenant impact, reliable workarounds exist. Notify via Slack/ticket; updates hourly.
- **SEV4 – Observed anomaly:** Low-impact issues, early warnings, or follow-up tasks. Track in backlog; async updates.

## Roles

- **Incident Commander (IC):** Owns process, sets cadence, decides severity, and delegates. Remains IC until relieved.
- **Scribe:** Captures timeline, decisions, and action items in the incident doc.
- **Subject-Matter Lead (SML):** Technical lead for the impacted subsystem; owns diagnosis/mitigation plan.
- **Communications Liaison (optional):** Handles stakeholder comms and status page updates.

## Communications

- **Slack:** `#incidents` for real-time command channel; `#status` for stakeholder updates. Create temporary huddle/bridge if Slack call is unavailable.
- **Video/Bridge:** `meet/incident-bridge` (placeholder) spun up for SEV1/SEV2.
- **Status cadence:**
  - SEV1: every 15 minutes with current impact, actions, ETA.
  - SEV2: every 30 minutes.
  - SEV3: hourly.
  - SEV4: as-needed.
- **Handoff:** At shift change, IC documents next steps, owners, and current status in the incident doc and pins it in `#incidents`.

## Lifecycle

1. **Detection:** Alert (monitoring/observability) or report (customer/support) is received.
2. **Declare:** IC runs `scripts/ops/new-incident.sh "<short title>"` to create the incident doc and posts the ID in `#incidents`.
3. **Stabilize:** SML drives triage, mitigation, and validation. IC updates severity if needed.
4. **Communicate:** Scribe/IC posts updates at the defined cadence and notifies stakeholders when mitigations are deployed.
5. **Close:** IC confirms recovery criteria met, documents remaining risks, and schedules postmortem for SEV1/SEV2 (within 5 business days).
6. **Postmortem:** Use the template in `docs/incidents/template.md`. Capture contributing factors, SLO burn, fixes, and follow-ups with owners and due dates.

## Incident timeline template

Use this structure inside each incident doc:

```
- T0 (UTC): Detection (by alert/reporter)
- T+5m: IC assigned, severity set
- T+10m: Mitigation attempt #1 (owner)
- T+20m: Mitigation validated/not validated
- T+30m: Customer comms sent
- T+45m: Root cause isolated
- T+60m: Permanent fix started
- Resolution time: <timestamp>
```

## Postmortem template (summary)

Include these sections in the incident doc:

- What happened (1–3 sentences)
- Customer impact and duration
- SLOs/Error budgets affected (estimate burn)
- Detection: how it was found; how to detect sooner
- Root cause and contributing factors
- Mitigation and recovery steps
- Follow-up actions (owner, priority, due date)
- Validation plan for fixes (tests/alerts)

## Readiness checklist

- IC/rotation roster is published and up to date.
- `scripts/ops/new-incident.sh` executable on on-call laptops/Jump boxes.
- `docs/incidents/` is writable and discoverable from Slack playbook pins.
- Grafana/CloudWatch links to SLO dashboards are bookmarked in `#incidents` channel topic.
