# RevOps Operating Blueprint

This blueprint operationalizes the nine epics into a single, auditable operating system for Revenue Operations. It defines systems of record, stage governance, routing, quote-to-cash alignment, forecasting, productivity instrumentation, lifecycle handoffs, data quality, and governance controls. Each section includes the canonical object definitions, mandatory controls, and automation requirements to eliminate shadow processes.

## 1. Systems of Record & Object Definitions

- **Systems of Record**
  - Leads/Contacts: CRM (single tenant).
  - Accounts: CRM with parent/child hierarchy synchronized to billing and CLM domains.
  - Opportunities: CRM, stage-gated with required evidence fields.
  - Contracts/Order Forms: CLM + CPQ, bidirectionally synced to CRM via unique Contract ID.
  - Product Telemetry & Support: Product analytics + Support platform, piped into CRM customer timeline.
- **Locked Object Definitions** (immutability enforced via governance RFCs)
  - Account: Legal entity or commercial subsidiary with unique domain; linked to billing account.
  - Opportunity: Customer decision process with defined buying committee and budget path; one primary account; stage movement only when exit criteria are met.
  - Closed Won: Signed order form/contract captured in CLM with billing-ready SKU configuration and start date.
  - Closed Lost: Customer explicitly declined or timed out after SLA + auto-close policies.
- **Data Quality Controls**
  - Domain-level dedupe on accounts/contacts with fuzzy match guardrails; parent/child inheritance rules for ownership and coverage.
  - Mandatory lifecycle fields: stage evidence, next step + date, buying role, source, segment, territory.
  - Exceptions registry for off-process deals with owner, expiry, and review workflow.
- **Naming Conventions**
  - Deals: `{Segment}-{Geo}-{PrimaryProduct}-{UseCase}-{FiscalQ}` (e.g., `ENT-NA-Platform-IntelQQL-Q3`).
  - Campaigns: `{Channel}-{Theme}-{Quarter}-{Audience}`.
  - Products/SKUs: `{Family}:{Package}:{Metric}`; Territories: `{Geo}-{Segment}-{Vertical}`.
- **Permissions & Audit**
  - Role-based edit scopes: SDR (Leads/Contacts), AE (Opportunities), Sales Ops (Accounts, Territories), Finance/Legal (Contracts/Concessions). All changes audited.
  - Change-control board for fields/automations with RFC templates and approval SLAs.

## 2. Funnel & Stage Governance

- **Stage Exit Criteria**
  - Documented, evidence-based criteria per segment; stored as validation rules that block advancement without artifacts (e.g., confirmed problem + budget owner for Discovery → Evaluation).
- **Reasons & Hygiene**
  - Standardized advance/stall/loss reasons with picklists tied to dashboards; prohibit free text when coverage exists.
  - Stale deal policies: inactivity thresholds trigger auto-nudge; auto-close after defined grace windows.
- **SLA Clocks & Metrics**
  - Speed-to-lead, speed-to-first-meeting, and stage aging timers with breach alerts to managers.
  - Next step + date required on all active deals (hard validation).
- **Forecast Categories & MEDDICC Light**
  - Commit/Upside/Pipeline/Best Case with explicit evidence gates; lightweight MEDDICC fields for champion, metrics, paper process, and risks.
- **Dashboards & Reviews**
  - Hygiene dashboards by rep/manager showing SLA compliance, next-step freshness, stale flags, and conversion rates by segment/source.
  - Weekly pipeline reviews driven by data exports from the CRM, not anecdote.

## 3. Territory, Routing & Coverage Model

- **Territory Model**
  - Geo + Segment + Vertical with named accounts; parent/child inheritance for ownership; quarterly gap analysis.
- **Routing Rules**
  - Lead routing with deterministic tie-breakers (intent score → ICP fit → recency) and audited round-robin for eligible pools.
  - Routing SLAs in minutes; alerts to queues on breach. Manual Slack routing prohibited.
- **Assignment & Reassignment**
  - Account assignment based on domain matching and subsidiary linkage; vacation/attrition policy with auto-rotation and documented reassignment triggers.
  - Separate coverage for inbound, outbound, and partners; partner deal registration feeds routing logic.
  - SDR queues prioritize intent + ICP; enforce work-in-progress limits to prevent hoarding.

## 4. Quote-to-Cash Alignment

- **SKU & Packaging Governance**
  - Single SKU catalog shared by CRM ↔ CPQ ↔ billing; configuration rules to prevent invalid bundles.
  - Pricing floors/ceilings with approval workflows and give/get matrices.
- **Quote Standards**
  - Segment-specific quote templates with standard terms embedded; free-text minimized.
  - Multi-year and ramp deal templates with rev-rec safe schedules.
- **Order & Contract Integrity**
  - Auto-generated order forms; contract metadata (terms, uplifts, caps, renewal type) captured at signature.
  - Renewal opportunity creation rules (e.g., 180/120/90 days) with clear ownership.
  - Concessions register with expiry tied to renewal events; quote-to-cash failure instrumentation and alerts.

## 5. Forecasting System

- **Models & Cadence**
  - Segment-aligned models (pipeline-based, commit-based, telemetry-augmented). Weekly commits; monthly rollups with correction logs.
- **Controls**
  - Forecast categories with strict rules; audit trails for changes; “no sandbag/no fantasy” compliance reviews.
  - Deal risk scoring incorporating usage signals, exec engagement, legal/security status, multi-threading, and procurement stage.
- **Accuracy & Postmortems**
  - Accuracy dashboards by rep/manager/segment; slip reasons captured on close date moves; quarterly forecast postmortems feed stage criteria updates.

## 6. Sales Productivity & Enablement Instrumentation

- **Activity Model**
  - Track meetings → evaluations → proposals; avoid vanity metrics. Instrument calls/meetings/touches/artifacts in CRM.
- **Coaching & Content**
  - Call library with tagging (objections, competitors, security, pricing). Manager dashboards combining conversion and quality signals.
  - Standardized discovery/MEDDICC templates; enablement certifications for pitch/demo/security talk tracks.
  - Asset usage tracking correlated to win rates; win/loss program with structured evidence.
- **Onboarding & Experimentation**
  - Time-to-productivity metrics for new reps; experiment program for sequences/talk tracks with measurable outcomes.

## 7. Customer Lifecycle & Handoffs

- **Handoff Protocols**
  - Defined handoffs SDR→AE, AE→SE, AE→CS, CS→Renewals with mandatory packets (use case, success criteria, risks, commitments).
  - Commitment registry for security/roadmap/services promises with owner and due date.
- **Onboarding & Success Plans**
  - Automated kickoff workflow and timeline; success plan template tied to adoption telemetry.
  - Expansion signals routed as CRM tasks for AE/CSM; renewal ownership and triggers at 180/120/90 days.
- **Quality & Timeline View**
  - Handoff quality tracked (rework, escalations, churn correlation); customer timeline view spanning sales → onboarding → incidents → renewal.

## 8. Data Quality, Attribution & Marketing Alignment

- **Attribution Model**
  - Lead source hierarchy with rules/windows; enforced UTM discipline and campaign taxonomy with merge-gated fields.
  - MQL/SQL definitions with SLAs and acceptance rules; dedupe on domain/email with fuzzy match safeguards.
  - Account-based attribution for enterprise; partner sourced/influenced alignment with deal registration.
- **Analytics & Audits**
  - Dashboards for CAC, payback, conversion by channel/segment; monthly audits for missing fields, routing errors, attribution drift.
  - Data change RFC workflow for GTM analytics; hygiene incentives tied to compensation where applicable.

## 9. Governance, Compliance & Auditability

- **Oversight**
  - RevOps council (Sales/Marketing/CS/Finance/Legal) with decision SLAs; GTM risk register for mis-selling, claims drift, discount leakage, data privacy.
  - Quarterly role-based access reviews for CRM/CPQ/CLM; audit logs for pricing overrides, term deviations, data exports.
- **Policy Controls**
  - Standard language via templates/clause libraries; customer data handling standards (PII minimization, retention).
  - Deal desk gates for high-risk deals; exception tracking with forced expirations.
  - Monthly RevOps memo and board appendix covering forecast accuracy, pipeline coverage, discount integrity.
- **System Rule**
  - Institutionalize: **if it isn’t in the system, it didn’t happen.**

## Delivery & Change Control

- **Implementation Wave Plan**
  - Wave 1: Systems of record + object definitions + routing enforcement + stage validation.
  - Wave 2: Quote-to-cash alignment + forecast categories + dashboards + SLA alerts.
  - Wave 3: Lifecycle handoffs + enablement instrumentation + data quality/attribution + governance council rituals.
- **Change Management**
  - RFC template for any CRM/CPQ/CLM schema or automation change; impact assessment + rollback plan mandatory.
  - Exception registry reviewed weekly; all exceptions expire automatically.
- **Automation & Observability**
  - Event-driven integrations (routing, SLA breaches, exception expiry); observability via metrics (SLA adherence, hygiene), alerts (routing/quote failures), and audit logs.

## Forward-Looking Enhancements

- Predictive routing using intent + product-usage propensity models to pre-score inbound leads.
- Automated deal risk signals from product telemetry (feature depth, active seats) feeding forecast confidence adjustments.
- Periodic data quality fuzz-testing to detect duplicate patterns and taxonomy drift before they reach production.
