# M&A Integration Playbook (Execution-Ready)

## High-Level Summary & 7th+ Order Implications
- **Goal:** Acquire and integrate target with zero business disruption while unlocking revenue, cost, and product synergies within 90 days.
- **7th+ order implications:**
  - *Data & identity convergence* drives future AI/ML leverage, but failure to harden privacy and IAM introduces regulatory and lateral-movement risk.
  - *Platform strangler pattern* reduces coupling debt; premature full merges increase blast radius and churn risk.
  - *Governance and exception registries* enforce discipline; weak expiry/ownership creates permanent policy drift.
  - *Observability-first execution* (SLOs, playbooks, tabletop drills) shortens MTTR and protects brand equity during cutovers.
  - *Synergy scorecards with accountable owners* keep incentives aligned; missing owners yields “orphaned” synergies and negative ROI.
  - *Contract and pricing harmonization* must precede entitlement merges to avoid revenue leakage and legal exposure.
  - *Culture and retention programs* are prerequisite controls—attrition of domain experts undermines migration correctness and reliability.

## Integration Architecture & Governance
- **Operating Model:** Integration Management Office (IMO) with domain owners for Product, Platform, Security, Legal, Commercial, People. Escalation ladder: IC → Domain Owner → IMO Lead → ELT.
- **Decision Records:** RFC/ADR required for architecture, identity, data flows, and deprecations. Timeboxed approvals (72h) with stop-the-line authority for Security and SRE.
- **Systems Map:** Canonical domain map with system-of-record assignments; integration adapters mediate cross-domain calls to avoid tight coupling.
- **Controls:** SLOs for availability/latency, unified incident command, privileged access JIT, exception registry with expirations, red-line blockers enforced pre-close.

## Implementation Plan by Epic

### Epic 1 — M&A Thesis + Red Lines
1. **Acquisition thesis** covering product differentiation, market reach, talent density, data assets, distribution, and cost synergies; publish measurable hypotheses and owners.
2. **Red-line deal breakers:** security posture gaps (no MFA/SSO, missing logging), broken IP chain-of-title, undisclosed liabilities; block close until remediated or escrowed.
3. **Synergy hypotheses:** quantified targets (e.g., +8% NRR via cross-sell, -12% infra cost via consolidation) with accountable exec sponsors.
4. **Day-0/30/90 success metrics:** activation/retention, uptime/SLOs, ARR/NRR, gross margin, cost-to-serve; weekly reporting to IMO.
5. **Integration governance:** name IMO lead, domain owners, escalation ladder; publish RACI.
6. **Comms plan:** sequenced messaging for employees → customers → partners → regulators; FAQs and risk-trigger comms paths.
7. **Brand strategy:** decide keep/merge/dual-brand/sunset with milestones and customer experience guardrails.
8. **Exception registry:** required for any deviation; include owner, rationale, expiry, mitigation.
9. **Stop-the-line criteria:** security incidents, reliability regressions beyond error budget, churn spike; empower halt authority.
10. **Pre-close tabletop:** simulate failures (billing, auth, logging, DR) and refine runbooks.
11. **Integration charter:** publish as operating constitution with scope, principles, and decision rights.

### Epic 2 — Diligence Factory
1. **Domain checklists** (tech, security, legal, finance, HR, ops) with evidence requirements and owners.
2. **Data room index template** enforcing completeness and freshness SLAs.
3. **IP chain-of-title audit** for employees/contractors, OSS licensing, third-party components; remediate gaps.
4. **Security posture assessment:** SSO/MFA, vulnerability management cadence, incident history, logging/retention.
5. **Privacy review:** data inventory, DSAR process, retention maps, subprocessors/transfer basis.
6. **Reliability assessment:** SLOs, incident frequency, DR/BCP posture, dependency risks.
7. **Customer/contract mapping:** SLAs, renewal timelines, change-of-control triggers.
8. **Vendor review:** termination/assignment clauses; integration complexity score.
9. **Tech debt quantification:** systems map, coupling score, modernization backlog.
10. **Risk register:** mitigations, deal protections (reps/warranties/escrows), owners, due dates.
11. **Standardized outputs:** board-ready memo, scorecard with red/yellow/green posture per domain.

### Epic 3 — Day-0 Operational Continuity
1. **Freeze window** around close with approval gates for risky changes.
2. **Unified incident command** and escalation channels (Slack/phone tree) across both orgs.
3. **Access controls** for cross-org collaboration with least-privilege defaults and logging.
4. **Shared status reporting:** SLO dashboards, incident log, customer escalations.
5. **Support handoffs:** ticket routing rules and response SLAs.
6. **Security response alignment:** playbooks, notification obligations, breach decision tree.
7. **Billing/collections continuity:** invoice schedule verification and fallback flows.
8. **Onboarding/offboarding rules:** access provisioning checklists and audit trail.
9. **Data sharing boundaries:** privacy-safe collaboration with approved data sets.
10. **Exec comms cadence:** daily brief first week, then weekly until steady state.
11. **DR/backups verification:** restore tests for both stacks with evidence.

### Epic 4 — Identity & Access Unification
1. **Identity strategy** (single IdP vs. staged federation) with timeline.
2. **SSO with MFA** across internal tools; enforce policy and monitor exceptions.
3. **Role mapping** and least-privilege defaults for shared systems.
4. **Just-in-time privileged access** with approvals, expiry, and logging.
5. **Service account consolidation** and secret rotation.
6. **Audit logging** for cross-org admin actions; centralize in SIEM.
7. **Access reviews** weekly for first 60 days.
8. **Break-glass accounts** with strict logging and periodic drills.
9. **Decommission redundant admin tools/accounts** post-migration.
10. **Permission introspection** to reduce misconfig confusion.
11. **KPIs:** stale access reduced, privileged accounts reduced, incident rate down.

### Epic 5 — Product & Platform Integration
1. **Integration path decision** (coexist, connectors, embed, or merge) with milestones.
2. **Canonical domain map** and system-of-record assignments.
3. **Integration layer/adapters** to prevent tight coupling; API versioning.
4. **Unified entitlements and plan mapping** to prevent billing errors.
5. **Data migration factory:** backfill, verify, cutover, rollback rehearsals.
6. **Standardized event contracts** and versioning.
7. **Top 3 shared workflows** prioritized for earliest customer value.
8. **Infrastructure primitives consolidation** (queues, schedulers, observability).
9. **Deprecation calendar** for duplicate features with customer comms.
10. **Parity testing and reconciliation** during cutovers.
11. **Legacy deletion schedule** to avoid forever-parallel systems.

### Epic 6 — Commercial Integration
1. **Go-to-market motion** choice (cross-sell, up-sell, bundles, rebrand) with packaging rules.
2. **Unified CRM fields/stages** and single pipeline dashboard.
3. **Joint ICP/segmentation** with disqualifiers to curb churn.
4. **Combined pricing/packaging** with clean entitlements enforcement.
5. **Deal desk rules** and discount governance across orgs.
6. **Renewal cadence** at 120/90/60 days with ownership.
7. **Cross-sell playbooks** and enablement assets.
8. **Attribution model** (partner, PLG, outbound) enforced in CRM.
9. **Churn defense sprint** for acquired customers with top-risk triage.
10. **Customer comms** for packaging changes with opt-in/opt-out paths.
11. **Metrics:** NRR, GRR, cycle time, discount rate, churn reasons.

### Epic 7 — Legal, Privacy, and Contract Harmonization
1. **Contract inventory** (customers, partners, vendors) with change-of-control flags.
2. **Template harmonization** for MSAs/DPAs/SLAs; target set approved by Legal.
3. **Subprocessor updates** and notification obligations documented.
4. **Data flow mapping** and lawful transfer basis for cross-border data.
5. **Retention/deletion alignment** and DSAR procedure unification.
6. **IP/OSS policy consolidation** and SBOM practices.
7. **Litigation hold/eDiscovery workflows** for combined org.
8. **Claims library** and marketing approval gate to prevent overpromising.
9. **Regulator inquiry playbook** for regulated markets.
10. **Exception registry with expiry** for contract deviations.
11. **Track:** redline cycle time, exception count, compliance drift.

### Epic 8 — People & Culture Integration
1. **Key talent identification** with retention plans tied to integration milestones.
2. **Org design alignment**: domains, ownership, reporting, decision rights.
3. **Unified performance metrics** across outcomes, reliability, cost, velocity.
4. **Onboarding plan** for acquired teams (tools, processes, security training).
5. **Ways of working standards** (RFCs, ADRs, incident process).
6. **Meeting reset** to avoid bureaucracy creep; lean cadences.
7. **Feedback loops:** pulse surveys and issue-to-action pipeline.
8. **Career ladders/promotion criteria** standardized to reduce resentment.
9. **Cultural non-negotiables:** ownership, deletion, prevention, transparency.
10. **Friction register** maintained; resolve top 5 monthly.
11. **Metrics:** attrition, engagement, throughput, on-call health.

### Epic 9 — Decommission & Synergy Capture
1. **Decommission list** of tools/vendors/infra/features with published owners.
2. **Dates and owners** for each decommission; visible internally.
3. **Customer migrations** off redundant systems with parity reports and comms.
4. **Vendor renegotiation/termination** leveraging consolidation.
5. **Infra spend reduction** via rightsizing and duplicate environment removal.
6. **Observability stack consolidation** to cut telemetry costs.
7. **Duplicate code/service deletion** (≥1 per month) with change logs.
8. **Synergy scorecard**: planned vs. realized savings/revenue.
9. **Postmortems** on major integration milestones; codify playbooks.
10. **Customer win comms** highlighting improved features/reliability/support.
11. **Governance simplification** after targets met to avoid permanent IMO.

## Success Metrics & Monitoring
- **Availability & Reliability:** SLOs with error budgets; uptime/latency reported weekly.
- **Revenue & Retention:** ARR/NRR/GRR, churn, expansion, discount rate.
- **Cost & Efficiency:** Cost-to-serve, infra spend, vendor spend, support load.
- **Security & Compliance:** MFA/SSO coverage, privileged access counts, incident rate, DSAR SLA.
- **Execution Health:** Synergy burn-down, exception registry age, decision latency, pulse survey scores.

## Controls, Runbooks, and Tabletop
- **Stop-the-line triggers:** security incident with potential customer impact, SLO burn >50% of budget, abnormal churn spike (>2x baseline), or finance control failure; authority held by Security/SRE/Finance leads.
- **Exception registry:** required fields — owner, deviation, rationale, risk, mitigation, expiry, review cadence.
- **Tabletop schedule:** pre-close integration tabletop plus quarterly scenarios (auth cutover, billing rollback, data corruption, vendor outage).

## Communication Plan
- **Sequenced rollouts:** internal (ELT → managers → all-hands) → customers (top accounts first) → partners → regulators where applicable.
- **Artifacts:** FAQ, risk-response scripts, status page updates, migration notices with opt-in timelines.
- **Cadence:** daily integration standups first week, weekly thereafter; customer advisories aligned to milestones.

## Innovation & Forward-Looking Enhancements
- **Zero-trust by default:** continuous verification, device posture signals, and adaptive auth during integration.
- **Policy-as-code for exceptions:** encode registry in OPA/Conftest with automated expiry alerts.
- **Synergy observability:** unified scorecard with automated data pulls (CRM, billing, infra) to reduce reporting lag.
- **Progressive delivery for cutovers:** use feature flags and shadow reads to derisk migrations.

## Post-Merge Validation & Roadmap
- **Post-merge checks:** access review completion, SLO adherence, billing accuracy audit, exception expiry reviews.
- **Roadmap:** harden AI/ML risk controls for shared data sets, retire legacy observability stacks, expand automated compliance evidence collection, and codify integration playbook into repeatable runbooks for future acquisitions.
