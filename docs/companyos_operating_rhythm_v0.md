# CompanyOS Operating Rhythm v0

## 1) KPI & Health Model

**Core dimensions and exemplar KPIs**

- **Reliability**: SLO attainment (availability/latency), MTTR, change failure rate, incident reopen rate, error budget burn, on-call page volume per service.
- **Security**: Time to detect/respond/contain, vuln SLA adherence, control coverage (e.g., MFA/SCIM/TLS), security posture score (CIS/NIST mapping), dependency risk age, secrets exposure count.
- **Product adoption**: Weekly active tenants, DAU/WAU per surface, activation rate, feature adoption per cohort, workflow completion rate, time-to-first-value, tenant health score (usage depth × breadth × outcomes).
- **Financials**: Net/gross retention, expansion/contraction MRR, pipeline-to-revenue conversion, ARPA, billable usage vs. committed, gross margin, payback period.
- **Efficiency**: Infra cost per active tenant or unit, unit economics per product surface, eng cycle time (idea→deploy), flow efficiency, ticket aging, automation coverage (runbooks vs. manual), build minutes per deploy.

**Cascading model (company → domain → team/service)**

- **Company level**: A handful of north-star KPIs per dimension (e.g., Availability SLO attainment %, Net Retention %, Security SLA compliance %, Infra cost per active tenant, WAU). These appear in the Exec Cockpit as top-line cards with trend and target.
- **Domain level** (e.g., Platform, Product, Security, GTM, Ops): Each inherits 1–2 parent KPIs and adds domain levers. Example: Platform owns Availability SLO attainment, Error budget burn, Change failure rate; Security owns Vulnerability SLA adherence, Credential hygiene coverage, Incident MTTR; Product owns WAU, Activation, Feature adoption; GTM owns Net/Gross retention, Pipeline conversion.
- **Team/service level**: Each service dashboard shows its contribution to parent KPIs and leading indicators: per-service SLOs, error budget, deploy frequency, change fail %, security findings open/overdue, cost-per-request, adoption per feature flag. Roll-ups aggregate via weighted averages (traffic for reliability, revenue/tenant count for financial/adoption, control coverage for security) so executives can drill down with consistent math.
- **KPI contracts**: Every KPI has owner, definition, data source, update cadence, target/thresholds, and links to upstream/downstream dependencies (e.g., Availability depends on specific services’ SLOs; Net retention depends on churn/expansion cohorts). Contracts live in the KPI registry and power CompanyOS dashboards.

## 2) Operating Rhythm

**Weekly**

- **Standups (team-level)**: Focus on deltas to SLOs, incidents closed, upcoming risky changes, experiment readouts. Artifacts: per-service "week-at-a-glance" card (SLO burn, deploys, open sev1/2, cost drift), change calendar, top regressions diff.
- **Ops/Platform review**: Reliability/security posture snapshot vs. targets; error budget policy actions; top regressions from change analysis; hotfix backlog. Ready-made pack: "Weekly Ops Pack" dashboard with red/amber/green KPIs, incident drill-downs, change diff widgets.
- **Product/GTM health sync**: WAU/activation trends, churn/expansion signals, feature adoption diffs, leading indicators (time-to-value). Ready-made pack: "Weekly Growth Pack" with cohort tables and flag-level adoption diffs.

**Monthly**

- **Business review**: Net/gross retention, pipeline conversion, margin, cost per tenant/unit, roadmap delivery vs. committed outcomes. Artifacts: revenue waterfall, cohort retention heatmap, cost efficiency table, roadmap milestone burn-up. Pack: "Monthly Business Review" with narrative auto-summaries and variance explanations.
- **Security & compliance review**: SLA adherence for vulnerabilities, control coverage, incident MTTR/MTTC, audit exceptions. Pack: "Monthly Trust Pack" with control gap diff, overdue findings list, and remediation burndown.
- **Platform/product review**: SLO attainment, change failure rate, release quality, adoption of new capabilities, infra efficiency. Pack: "Platform/Product Monthly" with service leaderboard and cost-per-feature view.

**Quarterly**

- **QBR/OKR checkpoint**: Progress to strategic goals, north-star KPIs, bets/experiments, capacity vs. plan. Artifacts: OKR scorecards, initiative health (scope/schedule/risks), investment mix (run/grow/transform), talent/coverage view.
- **Resilience game-day/chaos review**: Scenario results mapped to SLOs and controls; follow-up actions and owners. Pack: "Resilience Pack" with scenario scorecards and dependency weak-points.
- **Board prep**: Curated set of company-level KPIs with variance explanations, major incidents/learning, fiscal outlook. Pack: "Board Pack" auto-generated from the cockpit with an exec narrative and appendix links.

**How CompanyOS surfaces packs**

- Prebuilt dashboards for each cadence with configurable slots: top-line KPI cards, trend + target, variance vs. prior period, and drill-down links.
- Diff views that highlight week-over-week or month-over-month changes (e.g., SLO burn delta, adoption uplift per feature flag, cost drift by service).
- Summaries auto-generated with rationale: “SLO burn up 3% driven by Service X latency regression; mitigated by rollback on 2026-06-04.”
- Meeting mode: freeze a "snapshot" with timestamped metrics, owners’ notes, and decision logs; shareable as PDF/URL.

## 3) Exec Cockpit & Views

**Personas & default experience**

- **CEO**: North-star KPIs (revenue, retention, WAU, margin), risk radar (incidents affecting customers), forecast vs. plan. Alerts: churn risk spikes, major incident customer impact, variance >3% on revenue/usage targets.
- **CTO**: Reliability and delivery health—SLO attainment by tier-0 services, change failure rate, deploy frequency, error budget status, platform cost/unit, architectural risk register. Alerts: error budget breach, change failure spike, infra cost drift, capacity risks.
- **CISO**: Control coverage, vuln SLA adherence, secrets exposure, identity posture (MFA/SCIM), incident MTTR/MTTC, third-party risk status. Alerts: overdue critical vulns, missing controls in tier-0, anomalous access patterns, failing attestations.
- **Head of Ops**: Incident volume/severity, MTTR, on-call load, runbook automation coverage, ticket backlog/aging, vendor SLAs. Alerts: paging fatigue, SLA breaches, automation regression.
- **Head of Product**: WAU/MAU, activation, feature adoption, conversion funnels, time-to-first-value, NPS/CSAT, churn/expansion signals. Alerts: adoption drop by cohort, feature flag regression, activation stall.

**Drill-down paths**

- KPI card → domain view → service dashboard → incident timeline → change list → logs/runbooks.
- For financial/adoption KPIs: KPI → cohort/segment → feature/plan → experiment results → underlying events.
- For security: KPI → control gap → affected assets → remediation tasks → pull requests/rollouts.
- Each hop shows ownership, current status, and next actions, maintaining context breadcrumbs.

## 4) Artifacts

### CompanyOS Operating Rhythm v0 (outline)

- **Cadences**: Weekly (ops, product/growth), Monthly (business, trust, platform/product), Quarterly (QBR/OKR, resilience, board). Each has owners, agenda, inputs (dashboards/packs), and outputs (decisions, action register).
- **Responsibilities**: Execs own targets; domain leads own roll-ups and exceptions; teams own service-level KPIs and remediations. CompanyOS enforces owners on every KPI card and logs decisions.
- **Artifacts**: Ready-made packs (Weekly Ops/Growth, Monthly Business/Trust, Resilience, Board), snapshot + decision log per meeting, change calendar, incident registry, KPI registry with contracts.

### Example Exec Cockpit Layouts

- **CTO view (default)**:
  - Header: Top-line reliability cards (Overall SLO attainment, Error budget burn, Change failure rate) with targets and sparkline trends.
  - Panels: Service tier leaderboard (tier-0/1), Deploy frequency vs. failure % chart, Incident timeline with MTTR/MTTC, Cost-per-active-unit by service, Architecture risk register (open risks with owners/ETAs), Upcoming risky changes (from change calendar), Automation coverage gauge.
  - Drill-down: Click a service → SLO details, recent incidents, recent changes, dependency map, cost + performance efficiency tiles.
- **CISO view (default)**:
  - Header: Security posture score, Critical/High vuln SLA adherence, Identity hygiene (MFA/SCIM coverage), Secrets exposure count.
  - Panels: Control coverage map by domain, Incident MTTC/MTTR trend, Overdue findings table with owners/age, Third-party risk status, Detection efficacy (alert fidelity, dwell time), Compliance attestation tracker, Change-scanner alerts (new services without guardrails).
  - Drill-down: Control gap → affected assets → remediation tasks/PRs → rollout status; Incident → timeline, detection source, actions; Dependency → vulnerable packages and patch status.

### Checklist — "Metric is exec-ready if…"

- Has a clear owner, definition, formula, and data source recorded in the KPI registry.
- Has target, threshold bands (green/amber/red), and annotated historical trend.
- Is tied to a cadence pack (weekly/monthly/quarterly) with a last-updated timestamp.
- Supports drill-down to underlying services/incidents/changes or cohorts/experiments.
- Includes variance explanation (driver tags) and a proposed/active action when out of bounds.
- Is privacy/security reviewed (no sensitive data exposure) and tested for data quality (freshness, completeness, outlier handling).
- Has alerts configured with routing (persona + channel) and documented runbooks for breaches.
