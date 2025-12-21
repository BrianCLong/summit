# Revenue Operations Operating Blueprint

This blueprint operationalizes the nine epics provided for pipeline instrumentation, ICP tightening, sales-cycle compression, pricing discipline, POC excellence, expansion, renewal defense, marketing engine, and revenue operations governance. It translates strategy into execution-ready standards, data contracts, cadences, and dashboards.

## Guiding Principles
- **Single source of truth:** CRM remains authoritative; shadow spreadsheets are deprecated and blocked via access reviews and dashboard parity.
- **Instrumentation-first:** Every stage change, handoff, and exception is evented and auditable; dashboards draw from the same events to earn trust.
- **Standard over bespoke:** Templates, guardrails, and approval ladders reduce variance; deviations require documented exceptions with expiry.
- **ICP-aligned growth:** Lead capture, routing, and pricing favor ICP fit; disqualifiers are explicit and enforced at intake.
- **Closed-loop learning:** Churn reasons, win/loss codes, and campaign performance feed monthly updates to ICP, messaging, and playbooks.

## Funnel Stages & Hygiene Standards (Epic 1)
- **Stages:** `MQL → SQL → SAO → Closed Won/Closed Lost/Closed No Decision` with explicit entry/exit criteria.
- **Required fields by stage:**
  - MQL: source, campaign, persona, ICP fit score, segment, territory candidate.
  - SQL: meeting date, discovery summary, qualification checklist status, lead source snapshot (immutable), owner.
  - SAO: problem statement, champion contact, mutual action plan (MAP) link, technical validation checklist status, next step date.
  - Closed: reason code (lost/no-decision), commercial terms (ARR, term, seats), primary competitor, procurement path, discount applied.
- **Stage exit gates:** automated validation blocks progression if mandatory fields or next-step dates are missing; stale records (>14 days idle) trigger risk scoring and escalation.
- **Ownership rules:** territory-based routing with SLA (15m MQL touch; 24h SQL follow-up); reassignment requires manager approval and audit note.

## ICP & Segmentation (Epic 2)
- **ICP definition:** codify industry, size band, use case, and disqualifiers (e.g., low data volume, banned geos). Maintain `segment_fit_score` (0–100) auto-calculated from enrichment and behavior.
- **Qualification:** MEDDICC-lite checklist logged at SQL and refreshed before SAO; blocker = missing economic buyer or pain quantification.
- **Messaging:** segment-specific value map (pain → proof asset → ROI lever) referenced by SDR/AE sequences and nurture tracks.
- **Routing priority:** leads with `segment_fit_score ≥ 70` and qualified source get fast-path SLA and senior reps; sub-ICP routed to nurture or disqualified with reason.

## Sales Cycle Compression (Epic 3)
- **5-step process:** Discovery → Value Demo → Validation (tech + security) → Business Case → Commercials. Each step requires dated next action.
- **Demo library:** standardized 5/15/45 minute flows per segment; stored with versioning and feedback loop to improve hit rates.
- **Technical validation:** pre-flight checklist (SSO, integrations, data quality, performance) initiated at SQL; MAP includes owners and target dates.
- **Automation:** enforce follow-ups and calendar holds on every stage advance; idle deals auto-create tasks and raise risk score.

## Pricing, Discounting, and Deal Desk (Epic 4)
- **Guardrails:** discount ladder by segment and ARR with approval matrix; entitlements map to SKU configuration to prevent custom plan sprawl.
- **Contracting:** standardized templates with fallback clauses; concessions tracked with expiry. Quote-to-cash checks cover proration, billing anchor dates, and tax.
- **Reporting:** ASP, discount rate, win rate by competitor, and exception count per region surfaced in dashboard.

## Trial/POC Machine (Epic 5)
- **Templates:** per-segment POC runbooks (data import, config, “aha” workflow Day 1), plus security/IT parallel track.
- **Automation:** sandbox provisioning with starter data; in-product guided steps and usage instrumentation; stall alerts to Sales/CS at 48h inactivity.
- **Closeout:** standard outcomes—expand, extend (paid), or exit with reason code and lessons captured.

## Expansion & Adoption (Epic 6)
- **Triggers:** seat utilization threshold, feature gates, new team invites, integration requests, and executive sponsor engagement.
- **Health dashboards:** admin view with usage, ROI signals, upcoming limits, and champion roster; drives in-app upgrade prompts tied to value moments.
- **Playbooks:** 30/60/90 day adoption sequences by segment; champions program with perks and early access.
- **Pipeline:** expansion opportunities tracked with stages/owners; MAPs required for upsell motions.

## Renewal Defense & Churn Kill (Epic 7)
- **Taxonomy:** standardized churn reasons (product, pricing, support, competitor, no-need) used across cancellation flows and CS notes.
- **Renewal playbook:** timeline at 120/90/60/30 days with exec visibility; save offers controlled, time-boxed, and approved.
- **Health scoring:** blend usage, error rate, support tickets, sentiment, and champion strength; “at-risk” alerts trigger interventions and exec escalation for strategic accounts.
- **Win-back:** campaigns by churn reason; GRR/NRR tracked weekly with driver decomposition.

## Marketing Engine (Epic 8)
- **Campaigns:** quarterly calendar aligned to ICP pains; co-marketing and webinars with shared attribution.
- **Attribution:** full-funnel multi-touch model mapped to pipeline and revenue; lead source snapshot persists through channel changes.
- **Nurture:** segment-fit tailored sequences; retargeting reflects differentiators; competitive positioning pages use compliant language.
- **Metrics:** CAC payback by segment/channel, pipeline created, experiments run, and learnings logged weekly.

## Revenue Operations OS (Epic 9)
- **RACI:** defined across Marketing/Sales/CS/Support for every stage and handoff; published in the operating handbook.
- **Automation:** routing, enrichment, sequencing, renewal reminders, and SLA tracking; data governance with validation rules and required fields.
- **Forecasting:** stage-based probabilities with inspection cadence; enablement via training, certifications, and talk tracks.
- **Ops debt:** catalog manual steps and broken automations; burn-down tracked in the weekly ops review.

## Dashboard Blueprint (Epic 1 & 8)
- **Views:**
  - Pipeline coverage (by segment/owner/territory) vs targets.
  - Velocity and conversion by stage with slippage highlighting idle days and regression.
  - Loss/no-decision reason codes trend; competitor impact.
  - Deal risk panel (no activity, no champion, no next step) with alerting.
  - POC conversion and stall signals; expansion and renewal pipeline.
- **Trust levers:** dashboard uses evented data from CRM with SLA checks; discrepancies trigger data quality alerts instead of spreadsheets.

## Data & Attribution Controls
- **Immutable snapshots:** store `lead_source_original`, `first_touch_campaign`, and `segment_fit_score_at_MQL` to survive channel changes.
- **Territory/ownership:** deterministic rules with audit trail; conflicts require manager adjudication and logged outcome.
- **Reason codes:** mandatory for Closed Lost/No Decision and POC exit; enumerations managed centrally with periodic review.

## Implementation Phasing
1. **Foundation (Weeks 1–3):** stage definitions, required fields, validation rules, lead source snapshots, routing/ownership rules, initial dashboards, RACI publication.
2. **Acceleration (Weeks 4–8):** demo library, MAP automation, POC templates/provisioning, discount guardrails, churn taxonomy, health scoring, expansion triggers.
3. **Optimization (Weeks 9–12):** attribution refinement, risk scoring, experimentation cadence, ops debt burn-down, enablement refresh, trust campaign to retire spreadsheets.

## Risk Management & Controls
- **Data quality:** nightly audits for missing required fields, stage backslides, and ownership anomalies; violations create tickets automatically.
- **Governance:** monthly ICP and churn review boards; quarterly pricing review; weekly pipeline/renewal/growth reviews with action logs.
- **Security & compliance:** role-based access to pricing/discount knobs; audit logs for ownership changes and exceptions.

## Success Metrics
- Funnel conversion uplift, stage velocity reduction, and pipeline coverage ≥3× target ARR by segment.
- POC conversion rate and cycle time; stall alerts cleared within SLA.
- GRR/NRR trend by cohort; expansion contribution to NRR.
- Dashboard trust (self-reported) and elimination of shadow spreadsheets.
