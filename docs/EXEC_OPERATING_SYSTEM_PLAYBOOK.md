# Executive Operating System Playbook

This playbook operationalizes the requested nine-epic program as a single operating system. It defines the canonical KPIs, governance, and delivery motions needed to ship a durable executive scoreboard, enforce risk accountability, and align change management, incidents, contracts, compliance, costs, and board communications.

## 1. Canonical KPI Set (12) and Metric Layer

| KPI | Definition | Owner | Data Source | Notes |
| --- | --- | --- | --- | --- |
| New ARR | Net new annual recurring revenue booked in-period. | VP Sales Ops | CRM bookings table | Excludes renewals and expansions. |
| Net Dollar Retention (NDR) | (Starting ARR + expansions − churn − downgrades) / Starting ARR. | VP Sales Ops | CRM, billing, product usage | Cohort-based, 12-month trailing. |
| Gross Revenue Retention (GRR) | (Starting ARR − churn − downgrades) / Starting ARR. | VP Sales Ops | CRM, billing | 12-month trailing. |
| Weekly Active Accounts (WAA) | Count of distinct paying customer accounts with ≥1 key action/week. | VP Product | Product events warehouse | Segmented by ICP/SMB/region. |
| Onboarding Time to First Value | Median days from contract start to first success milestone. | VP CS | CS system, product telemetry | Track p90; break out by segment. |
| Uptime (SLO) | 100% − error budget burn for Tier0/1 services (per SLO). | SRE Lead | Observability/SLI exporter | Publish per service/team. |
| Change Failure Rate | Failed changes / total changes for Tier0/1 (weekly). | Eng Director | CI/CD events + incident links | Failure = rollback, hotfix, or Sev1/2 triggered. |
| MTTR | Median time from incident start to full resolution for Sev1/2. | SRE Lead | Incident system | Include planned maintenance separately. |
| Security Findings SLA Hit Rate | % findings closed within SLA by severity. | Security Lead | Vuln scanner + ticketing | Sev1: 7d, Sev2: 30d, Sev3: 90d. |
| Cloud Unit Cost | Infra cost per active account (or per 1k WAUs). | FinOps Lead | Billing + usage | Normalize by region/tenant. |
| Telemetry Efficiency | Logging/metrics/traces spend per 1k requests. | FinOps Lead | Billing + ingestion counts | Enforce sampling and retention tiers. |
| Velocity (DORA: Lead Time) | Median time from first commit to production deployment. | Eng Productivity | VCS + CI/CD | Report by team/service; exclude paused work. |

**Metric layer**: Define all formulas and segmentation logic in a governed metrics catalog (dbt semantic layer or LookML). No spreadsheet math. Required metadata: owner, SLA, freshness, source lineage, security classification, change history. Add release markers and incident markers as first-class dimensions.

## 2. Executive Dashboard (single source of truth)
- One canonical dashboard named `Executive Scoreboard` with drilldowns: company → domain → service/team.
- Every chart supports overlays for release markers (deployed version) and incident markers (Sev, owner, RCAs).
- Required weekly targets and variance commentary fields (cannot mark complete without commentary for any red metric).
- Segment filters: ICP vs non-ICP, enterprise vs SMB, region. Persisted view URLs for each persona.
- Data freshness banner (green ≤24h, yellow 24–48h, red >48h) with alerts to #ops-sev2 when red.
- Access via SSO + least-privilege roles; audit all view/export actions.

## 3. KPI Ownership and Change Control
- Each KPI has a single named owner (Director+); backups named for vacations.
- Changes to definitions require: RFC ticket, impact analysis, data-quality validation, and approval from Governance Council; effective date and migration plan must be logged in the metric catalog.
- Duplicate or shadow dashboards are deprecated via catalog policy; canonical dashboard link is pinned in the wiki and tooling. Non-canonical dashboards get a “deprecated” watermark and removal SLA of 30 days.

## 4. Risk Register (top-10, portfolio-managed)
- Categories: legal, security, reliability, financial, vendor, people, compliance.
- Each risk stores: probability, impact (dollar + customer impact), owner, mitigations with SLAs, evidence links (incidents/tickets/controls), leading indicators, and next review date.
- Red risks require monthly shipped actions; missed mitigation dates auto-escalate to exec sponsor.
- Risk acceptance workflow: expiration date required; auto-notify 14/7/1 days before expiry.
- Weekly 20-minute review: decisions logged (accept, escalate, fund, close). Unknown owner ⇒ CEO by default.

## 5. Governance of Change (Tiered)
- Tiering: 0 (customer/data safety critical) → 3 (low blast). Tier 0/1 need release envelopes with scope, rollback, metrics, and owner.
- Progressive delivery + auto-rollback for Tier0/1 via feature flags and health KPIs; change failure rate reported per service/team on the scoreboard.
- Migration safety: enforce idempotent jobs, lock-time budgets, rollback paths; quarterly rollback drills for critical systems.
- “Break glass” with audit logging, post-event review, and temporary privilege expiry.

## 6. Incident Command & Comms
- Severity rubric tied to customer impact and contracts; roles: IC, Ops, Comms, Legal liaison with rotations.
- Pre-approved customer comms templates (status page, email, in-app); update cadence per severity.
- Automated incident timeline capture (deploys, alerts, config changes); exec briefing template with impact, mitigation, next update time.
- Postmortems require one systemic prevention item; recurring root causes tracked on a repeat-offender list and routed to hardening backlog.
- Publish monthly incident trend report (MTTR, recurrence, customer impact) and maintain a trust ledger of improvements shipped.

## 7. Compliance Evidence Ops
- Control catalog with owners and evidence artifacts; automated evidence collection (access reviews, logs, configs, releases) stored with immutable timestamps and restricted access.
- Control-health checks with drift/staleness alerts; exception registry with compensating controls and expiry.
- Vendor/subprocessor register (region, data-touch classification). Quarterly internal audit dry runs with ticketed findings; one-click audit export pack for deals/auditors.

## 8. Contract-to-System Alignment
- Inventory promises (SLA/SLO, retention, residency, access, support) and map each to enforcement points; declare gaps.
- Standard contract templates with fallback clauses; “no unscoped commitments” rule for Sales/CS.
- Entitlement enforcement for SLAs/support tiers and features; audit trails for permission and entitlement changes.
- Renewal/obligation tracker with dates, notice periods, penalties; incident notification protocol aligned to contract obligations.

## 9. Financial Controls & Runway Governance
- Tag cloud/vendor spend by service/team/tenant; publish weekly spend report with top movers and required explanations.
- Budgets per domain with alert thresholds; environment TTLs and auto-shutdown for non-prod.
- Telemetry efficiency: sampling, retention tiers, cardinality caps; compute/DB rightsizing with savings tracking.
- Cost anomaly detection opens tickets with suspected root causes; link major spend changes to change management with approval + rollback plan.
- Monthly “savings dividend” rule (reinvest vs runway) and board-ready cost narrative.

## 10. Org Accountability System
- Domain ownership map (systems, data, KPIs, on-call); enforce code owners/service ownership in repos and pipelines.
- Internal dependency SLAs (platform, data, security reviews); escalation ladder for blockers >48h.
- Decision log with owners and revisit dates; definition of done includes docs, observability, rollback, support notes.
- Track operational load per team (toil, incidents, tickets) and rebalance; ADRs for one-way-door decisions stored in-repo.
- Quarterly ownership audit to eliminate orphan services/zombie systems; reward deletion/hardening as shipments.

## 11. Board Packet & Narrative Control
- Standard monthly board packet: KPIs (with deltas), risks (top-5 + mitigations), incidents, roadmap, finances, GTM health, product outcomes, competitive update.
- “What changed since last month” and “what we’re doing about it” summaries; decision asks called out with owners and needed dates.
- Single narrative thread per quarter; pre-brief execs for message discipline and Q&A.
- Appendix with evidence links, definitions, and audit artifacts for diligence.

## 12. Operating Rhythm & Automation
- Weekly: KPI refresh (with freshness alerts), variance commentary, risk review, change calendar for one-way doors, savings movers report.
- Monthly: KPI narrative, incident trends, risk memo, board packet draft, trust ledger update.
- Quarterly: rollback drills for Tier0/1, ownership audit, contract vs reality audit, internal audit dry run.
- Automation hooks: data freshness Sev-2 alerting; ticket auto-creation for stale risks, expired acceptances, missing variance commentary, or missing KPI owners.

## 13. Future Expansion: Hardcore Infrastructure Resilience (preview)
- Themes: DR (tiered RTO/RPO with automated tests), chaos engineering by dependency class, capacity planning with predictive models, dependency isolation (bulkheads, circuit breakers), and zero-regret failover.
- Deliverables: resilience scorecard per Tier0/1 service, game-day catalog with exec participation, automated DR drills, and regression SLIs integrated into the executive scoreboard.
- Next steps: codify service criticality map, build synthetic canaries for top customer journeys, and wire DR/chaos results into the risk register and hardening backlog.

## 14. Implementation Starter Checklist
- Stand up governed metric layer (semantic definitions + ownership) and lock 12 KPIs.
- Build canonical Executive Scoreboard with drilldowns, markers, segments, and variance commentary enforcement.
- Launch risk register with acceptance workflow, evidence links, and escalation ladder; schedule weekly reviews.
- Enforce Tier0/1 change envelopes with progressive delivery, auto-rollback, and change failure rate reporting.
- Activate incident command playbook with automated timelines, comms templates, and trust ledger updates.
- Automate evidence ops (control catalog, health checks, audit pack) and contract enforcement mapping.
- Implement FinOps controls (tagging, budgets, telemetry efficiency) and publish weekly spend movers.
- Ship board packet template tied to the canonical KPI and risk sources.
