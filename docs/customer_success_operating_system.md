# Customer Success Operating System: Post-Sale Stick & Growth

## Purpose

This playbook translates the nine customer-success epics into an executable, telemetry-driven operating system for the first 30 days through renewal and advocacy. It is optimized for measurable outcomes, fast time-to-value, and predictable expansion.

## Operating Principles

- **Outcome-first:** Every motion is tied to explicit Day-7/14/30 goals and health signals.
- **Evidence-based:** Dashboards, timelines, and artifacts are generated automatically from product telemetry, billing, and support data.
- **Playbook-driven:** Standardize onboarding, adoption, support, and expansion motions with minimal bespoke work.
- **Closed-loop:** Friction logs flow into weekly fixes; health scores trigger playbooks and exec escalations.
- **Governed & secure:** Admin-grade controls, auditability, and trust reviews are default.

## Architecture Overview

- **Data plane:** Product telemetry (usage, errors, feature flags), billing, and support tickets stream into the **Customer Health Lake** (warehouse + event bus). Kafka/Redpanda for events; Postgres for contracts and metadata; object storage for artifacts.
- **Processing layer:**
  - **Health Scoring Service:** Transparent component weights for adoption, stickiness, errors, support load, sentiment, sponsor strength, invoices.
  - **Onboarding Orchestrator:** Drives in-app checklists, guided setup, recovery actions, and hypercare SLAs; writes to timeline.
  - **Adoption Playbook Engine:** Triggers recipes, nudges, and role-based guides per ICP/use case.
  - **Support Copilot:** Timeline + diagnostics + macros; deflection rules for known issues; bug-to-customer mapping.
  - **Advocacy & Expansion Engine:** Tracks expansion triggers, reference programs, and QBR commitments.
- **Experience layer:**
  - **In-app checklist & guided setup:** SSO, integrations, templates, data ingest, validation, first value proof.
  - **Dashboards:** Tenant health (errors, limits, integration health), ROI/usage for admins, cohort health for CSMs, executive weekly rollups.
  - **Communications:** Weekly exec updates, proactive alerts, status indicators, renewal/expansion packs.
- **Observability & governance:** Audit logs, role-based access, approval flows, integration allowlists, change communications, data residency enforcement.

## Epic Implementation Details

### Epic 1 — Post-Sale “Stick in 30 Days”

- **Day-7/14/30 outcomes:**
  - Day 7: SSO live, 1 integration enabled, first dataset ingested, 1 guided recipe completed, ≥5 active users, error budget <2%.
  - Day 14: 2+ integrations, 2 dashboards or reports shipped, champion trained, hypercare responsiveness <30m P1.
  - Day 30: Business review with ROI snapshot, adoption in target roles, backlog of next use cases, support volume downward trend.
- **Launch checklist:** roles/owners, SSO, integrations, data contracts, templates, first-value path, metrics to watch; auto-generated in product.
- **Health dashboard:** usage depth/width, error rate, limits, ROI proxies (time saved, automations executed); customer timeline with deploys/incidents.
- **Automation:** Default templates per segment/use case; prebuilt queries/recipes; recovery actions for failed steps.
- **Hypercare lane:** 30-day SLA (P1 <30m, P2 <2h), escalation ladder, daily standup notes; tracked in timeline.
- **Exec updates:** Weekly evidence-based email with usage deltas, incidents, planned fixes; links to artifacts.
- **Artifacts:** Reports, exports, dashboards stored with versioned links; reusable templates catalog.

### Epic 2 — Customer Health System

- **Signals:** Adoption depth/width, stickiness, error spikes, support load, sentiment/CSAT, sponsor engagement, billing health.
- **Transparent scoring:** Weighted components with thresholds; expose rationale and recent contributing events.
- **Alerts & playbooks:** At-risk drop ≥20% week-over-week, error spike >p95, stalled onboarding >72h, unpaid invoices, sponsor disengagement; prescriptive next actions.
- **Cohorts & dashboards:** Segment, onboarding path, use case; trend GRR/NRR, false-positive tuning monthly.
- **Customer timeline:** Deploys, incidents, config changes, integrations, tickets, expansions.

### Epic 3 — Adoption Playbooks by Use Case

- **Top use cases:** Identify 5 per ICP with success criteria and KPIs.
- **Prescriptive onboarding:** Templates/configs per use case; role-based guides (admin/operator/executive).
- **In-product recipes & nudges:** Triggered by behavior (e.g., unused feature for 7 days, high-value pattern detected).
- **Champion kit:** Emails/decks/FAQs; office hours cadence; expansion-ready checklist.
- **Continuous improvement:** Monthly updates based on churn drivers and ticket themes; deprecate bespoke paths.

### Epic 4 — Support as a Revenue Lever

- **Ticket tagging:** Churn-risk and revenue impact tagging with reporting.
- **Deflection & repair:** Better errors, diagnostics, self-serve repair and retries.
- **Support copilot:** Timeline enrichment, suggested fixes/macros, bug-to-customer mapping.
- **Escalation runbooks & proactive alerts:** Known issues, degraded states; customer-facing status indicators.
- **SLAs & dashboards:** By tier; repeat ticket reduction via top-10 root-cause fixes.

### Epic 5 — Expansion Engine

- **Triggers:** Seats/limits, feature adoption milestones, new teams, advanced modules.
- **Upgrade paths:** In-app upgrades aligned to value moments; transparent pricing.
- **Admin ROI dashboards:** Adoption + business impact; QBR-ready exports.
- **Playbooks & pipeline:** Timing rules, scripts, SCIM/SSO enablement, multi-team collaboration features; CRM pipeline stages/owners.

### Epic 6 — Renewal Defense OS

- **120-day start:** Milestones and owners; renewal health pack (usage, ROI, incidents, support history, roadmap alignment).
- **Save plays:** By churn reason; exec sponsor touches; concession policy with approvals/expirations.
- **Escalations & trust:** Reliability report, trust release cadence; post-renewal expansion plan.
- **Churn taxonomy:** Strict capture into backlog; measure GRR, cycle time, surprise churn.

### Epic 7 — Customer Advocacy Flywheel

- **Future advocates:** Blend health + outcomes + sentiment.
- **Reference program:** Clear asks/benefits; protect advocates with fast lane and roadmap visibility.
- **Assets:** Case studies with proof metrics, community sessions, champions program, peer-sharing templates.
- **Influence tracking:** Reference use → win rate uplift/pipeline acceleration.

### Epic 8 — Customer Governance & Trust

- **Admin must-haves:** Audit logs, roles, approvals, retention controls, integration allowlists/kill switches, change comms.
- **Tenant health:** Errors, limits, integration health dashboards; data residency enforcement.
- **Access/eDiscovery:** Permission introspection, access review exports, chain-of-custody where applicable.
- **Quarterly trust reviews:** Posture updates, incidents, improvements; living trust center and evidence packs.

### Epic 9 — CS Operating Cadence

- **Metrics:** TTV, adoption, health, GRR/NRR, expansion pipeline.
- **Rhythm:** Weekly risks/opportunities/actions; standardized QBRs with evidence and next-use-case commitments.
- **Risk register & capacity:** Tiering rules, coverage model, automation for reporting; incentives tied to retention/expansion.
- **Governance:** Monthly playbook updates; ticket-to-product pipeline with owners and ship dates; monthly CS scorecard.

## Data & Telemetry Model (Suggested)

- **Events:** `user.session`, `feature.used`, `integration.state`, `error.raised`, `job.retry`, `billing.invoice`, `ticket.created/resolved`, `nudge.sent/acted`, `recipe.completed`, `deployment.published`, `config.changed`.
- **Dimensions:** tenant, segment, ICP, use case, role, environment, tier.
- **Metrics:** adoption depth/width, DAU/WAU stickiness, MTTR, SLA attainment, upgrade intent, sentiment, sponsor touches.
- **Storage:** Event stream (Kafka/Redpanda) → warehouse (parquet) + Postgres for contractual data; derived marts for health scoring.

## Governance, Security, and Trust Controls

- Role-based access with approvals for high-risk actions.
- Audit logs for admin and config changes; exportable access reviews.
- Data residency tags enforced at ingest; integration allowlists and scoped tokens.
- Change management comms: what changed, why, impact, recovery steps.

## Operating Routines & SLAs

- **Hypercare (Day 0–30):** P1 <30m, P2 <2h; daily standup; exec weekly update with evidence links.
- **Health tuning:** Monthly model review to reduce false positives; benchmark against churn saves.
- **Ticket-to-product:** Weekly top-10 friction fixes with owners/ship dates; close the loop with customers.
- **Renewal/Expansion:** 120-day renewal runway; QBRs with next-use-case commitments; expansion triggers monitored continuously.

## Metrics & Success Measures

- Time-to-first-value, Day-30 adoption %, GRR/NRR uplift, surprise churn reduction, expansion conversion/time-to-expand, ticket deflection %, CSAT, advocate activation rate, procurement friction reduction.

## Forward-Looking Enhancements

- **Predictive journey graph:** Use sequence modeling on timelines to forecast risk and recommend next best action with explanation.
- **Autonomous playbook agent:** Safe agent executes low-risk mitigations (nudges, retries, comms) under guardrails and auditable approvals.
- **Causal analysis:** Identify which interventions most reduce churn for specific segments.

## Execution Checklist (per new customer)

1. Run launch checklist → verify SSO, integrations, templates, owners, metrics.
2. Enable in-app guided setup and first-value recipe; set hypercare SLAs.
3. Turn on health scoring + at-risk alerts; subscribe CSM + exec to weekly update.
4. Configure adoption playbook for selected ICP/use case; schedule champion training + office hours.
5. Publish tenant health dashboard and admin ROI view; expose status/health indicator in product.
6. Start friction log; route weekly fixes to product backlog; track expansions and advocacy candidates.
7. Schedule Day-30 business review with next expansion plan and artifact bundle.
