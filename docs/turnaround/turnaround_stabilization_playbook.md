# Turnaround Stabilization Playbook

This playbook consolidates the immediate stabilization program across finance, revenue, operations, product, and risk. It is organized as nine epics with execution checkpoints and success metrics.

## Operating Cadence
- **Timeline:** 13-week horizon with weekly variance reviews and dashboard updates.
- **Governance:** CFO+GC approval for new recurring spend; single-threaded owners per epic.
- **Reporting:** Weekly burn/cash dashboard with top movers; monthly org health review; board packet updated monthly.
- **Tracking KPIs:** runway weeks gained, spend cut vs plan, collections speed, NRR/GRR, cycle time, ASP stabilization, incident recurrence, sentiment trends.

## Epic 1 — Stabilize the Cash Engine (runway is the objective function)
- Build a 13-week cash forecast with weekly variance reviews and publish a kill list for non-essential spend (tools, travel, contractors).
- Enforce procurement gate: no new recurring spend without CFO/GC signoff.
- Accelerate collections: automate invoicing/dunning and escalate top accounts; renegotiate top 10 vendor contracts for cuts/seat reductions/terms.
- Remove shelfware via SSO/SCIM enforcement; rightsize cloud spend (environment TTLs, autoscaling caps, kill runaway jobs).
- Publish weekly cash/burn dashboard with movers and owners; define savings dividend rule; implement cost anomaly detection with auto-ticketing.

## Epic 2 — Ruthless Focus on ICP Revenue (stop serving the wrong customers)
- Analyze retention/LTV/churn by segment to define ICP v1 with no-go disqualifiers enforced in pipeline routing.
- Rebuild pricing/packaging around ICP value moments; standardize discount approvals with expirations.
- Kill unprofitable channels/campaigns and redeploy to highest LTV sources; stand up renewal war room for top accounts.
- Deploy churn defense and expansion playbooks; fix top churn drivers (reliability/onboarding first).
- Instrument and report NRR/GRR weekly with driver decomposition.

## Epic 3 — Org Restructure with Operating Clarity (stop diffused ownership)
- Publish domain ownership map (systems, KPIs, on-call) and consolidate teams around outcomes with single-threaded owners.
- Cut cross-team dependencies by consolidating critical flows; standardize decision rights and escalation ladder (48-hour rule).
- Implement WIP limits and definition-of-done gates (runbook, metrics, rollback, support notes); reduce meeting load via async updates.
- Establish exception registry with expiry; create leadership scorecards and run monthly org health reviews (toil, burnout, attrition risk).

## Epic 4 — Product Surface Diet (maintenance cost is killing you)
- Rank features by revenue influence × usage × support load × incident risk; declare deprecation slate with dates and comms.
- Freeze net-new features outside the core 20% window; consolidate duplicate workflows and reduce configuration permutations to presets.
- Retire low-value integrations/customizations; delete legacy endpoints/flags/UI routes tied to retired features.
- Update docs/support macros; measure ticket/incident reduction and publish deletion releases.

## Epic 5 — Reliability & Incident Discipline (downtime kills renewals)
- Define SLOs for 3–5 revenue-critical journeys with burn alerts; reduce noisy paging.
- Add progressive delivery with auto-rollback for Tier 0/1 services; fix top customer-visible error classes.
- Build dependency fallbacks/degrade modes; implement idempotency on retried writes (billing/provisioning first).
- Run monthly GameDays with mitigation deadlines; enforce incident comms templates and repeat-incident prevention.
- Reduce on-call toil via admin console fixes; track MTTR and recurrence alongside renewal risk.

## Epic 6 — Sales & Procurement Acceleration (close faster, get paid faster)
- Create enterprise trust packet and versioned questionnaire library; build procurement fast/slow lanes with SLAs.
- Standardize contracts with fallback clauses and redline playbook; implement deal desk with discount guardrails and approval ladder.
- Require mutual action plans above threshold; automate quote-to-cash checks (billing dates, proration, taxes).
- Add churn/renewal metadata in CRM; train Sales/CS on compliant claims and escalation triggers.
- Track cycle time by stage and eliminate top blockers; measure time-to-sign/time-to-cash/win-rate improvements.

## Epic 7 — Monetization Hygiene (stop leaking revenue)
- Centralize entitlements and enforce plan → features/limits; audit over-grants/under-billing/orphan access for recovery.
- Implement metering accuracy checks and anomaly alerts; improve dunning/retries with payment health dashboards.
- Add self-serve upgrades with proration and clean refund rules; reduce invoice disputes with clearer invoices/usage dashboards.
- Implement cancellation flow with reason codes and intervention offers; enforce no free-forever policy with expirations on concessions.
- Track revenue leakage recovery weekly and align pricing page/quotes; monitor leakage, AR, collections speed.

## Epic 8 — Legal & Risk Containment (survive scrutiny while shrinking)
- Build top-10 risk register and implement litigation hold/evidence preservation processes.
- Tighten claims governance (proof required); review/reduce high-risk contract obligations; maintain exceptions registry with expiry and exec signoff.
- Build incident/breach legal playbooks with comms templates; automate offboarding/access revocation; perform vendor risk reviews.
- Maintain DSAR/retention compliance during cuts; run quarterly tabletop combining regulator inquiry, outage, and cash crunch.
- Track risk posture trends, exceptions count, and disputes avoided.

## Epic 9 — Turnaround Comms & Trust (control the story internally and externally)
- Create a clear turnaround narrative (why/what/how long/success criteria) and internal comms cadence (weekly operating update + monthly all-hands).
- Draft customer comms templates for changes and enforce no-surprises rule for top customers with exec outreach schedule.
- Build investor/board packet covering cash, KPIs, risks, shipped actions; set policy for layoffs/reorg comms.
- Create rumor-control channel and publish trust releases showing reliability/cost wins; build Q&A bank for Sales/CS.
- Track sentiment via employee pulse and customer health signals; measure churn containment, morale stabilization, and narrative consistency.
