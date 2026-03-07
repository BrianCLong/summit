# Case & Escalation Model v0

## Entities

- **Case**: unique record with priority, severity, SLA tier, status, timestamps (opened, first response, resolution), owner, tags, linked incidents, related runbooks, and evidence/attachments.
- **Requester**: user opening the issue (contact info, role, channel). Stores authentication method and permissions to view resources.
- **Tenant**: workspace/org context (plan, segment, entitlements, billing status, region, data residency). Includes support tier and escalation routing defaults.
- **Affected resources**: impacted services/resources (IDs, region, version, config snapshot, health signals). Pull from telemetry graph for blast radius.
- **Linked incidents**: internal incident IDs (SRE/engineering) with status, commander, comms channel, and corrective actions. Many-to-many with cases.
- **Interactions**: timeline of messages, actions taken, customer confirmations, and automation steps run.

## States & Lifecycle

1. **New**: case created; auto-enrich with tenant, health, and past cases; auto-triage priority by severity signals.
2. **Triage**: support reviews telemetry, confirms scope, sets priority/SLA, assigns owner; may link to ongoing incident.
3. **In-progress**: active troubleshooting; diagnostics, runbooks, and updates posted; RCAs/mitigations tracked.
4. **Waiting-on-customer**: awaiting logs, approval, or repro steps; SLA clocks adjust (pause resolution, not first-response).
5. **Resolved**: fix delivered and validated; resolution summary, evidence, and preventive actions captured.
6. **Closed**: customer confirmed or auto-close after X days; satisfaction survey recorded; backlog signals emitted.

State transitions are logged with actor, reason, timestamps, and SLA impact (pause/resume clocks). Reopens move Closed → In-progress (retain history, new SLA window).

## SLA Targets (example)

| Priority                                        | Default First Response | Resolution Target (Standard) | Resolution Target (Premium/Enterprise) |
| ----------------------------------------------- | ---------------------- | ---------------------------- | -------------------------------------- |
| P0/Critical (prod down, major data loss)        | 15 min                 | 4 hrs                        | 2 hrs                                  |
| P1/High (degraded service, limited workaround)  | 1 hr                   | 8 hrs                        | 6 hrs                                  |
| P2/Medium (functional issue, workaround exists) | 4 hrs                  | 2 biz days                   | 1 biz day                              |
| P3/Low (how-to, minor UI)                       | 1 biz day              | 5 biz days                   | 3 biz days                             |

SLA clocks: first response starts at creation; resolution starts at accept in Triage. Waiting-on-customer pauses resolution but not first-response. Breaches trigger alerts and auto-escalations.

## Support Tooling & Integrations

- **Unified tenant console**: show health (SLIs, error budgets, recent alerts), feature flags, config, deployment history, usage trends, active experiments, and entitlement checks.
- **Incident linking**: embed incident timeline, runbook steps executed, current mitigations, and commander contact. Enable creating a new incident from a case with templated severity mapping.
- **Diagnostics automations**: one-click scripts to collect logs, trace IDs, config snapshots; attach artifacts to the case and incident.
- **CRM/ticket sync**: bi-directional sync with external ticketing (e.g., Zendesk/Salesforce) for requester updates while using CompanyOS as system of record. Sync state, comments, priority, and public/private visibility.
- **Product surface hooks**: in-app help panel and CLI command (`companyos support create`) pre-fill tenant context and attach telemetry slices.
- **Templates/macros**: canned responses for auth issues, ingestion delays, billing limits, and UI glitches; each links to runbooks and self-serve docs. Auto-suggest macros based on detected signals/error codes.

## Escalation & Feedback Loops

- **SRE escalation**: P0 or repeated error budget burn → page on-call, open/attach incident, grant temporary elevated access following least privilege. Case owner remains customer conduit.
- **Engineering escalation**: component ownership map routes to feature team; create linked bug with reproduction data and guardrail tests; require update cadence (e.g., every 4 hrs for P0, daily for P1).
- **Product escalation**: when roadmap gaps or repeated usability issues surface; log pattern into product feedback backlog with quantified impact (volume, ARR at risk, NPS hits).
- **Feedback emissions**: every case closure emits events to reliability backlog (defects), product backlog (feature gaps), and docs backlog (missing guides). Weekly ops review consumes these.
- **Reporting**: dashboards for volume by priority/segment, SLA attainment, reopen rate, MTTA/MTTR, sentiment (CSAT/NPS), and top themes via taxonomy tagging.

## Example Workflow (Incoming → Resolved)

1. Customer submits via in-app widget with error IDs and trace links; case enters **New**.
2. Auto-enrichment pulls tenant health (SLIs red on ingest service), links recent incident INC-204.
3. Agent moves to **Triage**, confirms P1; SLA timers start; macro posts first response and requests log bundle.
4. Agent runs ingestion runbook script; traces show throttling. Opens **In-progress** and applies mitigation (increase quota), documents change.
5. Waiting for customer confirmation → state **Waiting-on-customer** (resolution SLA paused). Customer verifies fix.
6. Agent posts resolution summary with evidence (trace IDs, quota change), moves to **Resolved**; customer confirms → **Closed**. Feedback event raised to increase default quotas for segment.

## Production-Readiness Checklist

- SLA policies configured per segment with alerting and auto-escalation paths tested (on-call, incident creation, notifications).
- Tenant console shows health, config, usage, and recent incidents; data contracts validated and refreshed within last 24 hrs.
- Bi-directional CRM/ticket sync enabled with field mapping (priority, status, requester, visibility) and failure alerts.
- Runbook library indexed with macros/templates and one-click diagnostics attaching evidence to cases.
- Security: role-based access enforced for tenant data; audit logs for every case change and data view.
- Reporting dashboards live (SLA attainment, volume, sentiment, themes) with weekly export to product/reliability backlogs.
- Reopen and closure flows tested, including customer survey capture and auto-close timers.
- DR/backups verified for case data and attachments; retention policies documented.
