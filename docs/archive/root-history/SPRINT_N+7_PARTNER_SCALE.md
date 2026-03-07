# Sprint N+7 — Partner Scale + 10-Customer Funnel + Claim-Chart Conversion + Revenue QA

**Duration:** 10 working days (two-week cadence)
**Objective:** Scale distribution through partners, run a 10-customer eval funnel with minimal engineering drag, convert IP into sales-ready claim charts, and make revenue delivery repeatable end-to-end (quote → deploy → measure → invoice).

---

## Goals & Success Criteria

- **Partner extensibility:** Partners ship extensions without core forks; SDK + certification harness available.
- **Eval at scale:** A new eval environment spins up from a single command with zero manual steps; 10 evals/pilots can run in parallel with standardized provisioning and reporting.
- **Revenue QA:** Every deal has standardized scope, KPI targets, pricing, provisioning, reporting cadence, and invoicing checkpoints.
- **Sales readiness:** Claim charts and defensibility brief mapped to observable behaviors/configs; competitor bakeoff template reproducible from harness logs.
- **Reporting:** Automated, auditable KPI reports (weekly) with SLA/SLO hooks and postmortem template.

---

## Workstreams & Deliverables

### 1) Product & Program (Revenue QA)

- **Checklist:** Revenue QA covering scoping → pricing → provisioning → reporting → invoicing.
- **Support model:** Tiers, response times, escalation path, light on-call rotation.
- **Exit:** Each deal has standardized scope, KPI targets, and reporting cadence; checklist versioned and linked to deal workflow.

### 2) Research (Differentiation proofs for sales)

- **Artifacts:** Three 1–2 page proof decks (speed, cost, robustness) with links to benchmark harness + logs.
- **Bakeoff template:** Apples-to-apples comparison steps, metrics, and required evidence.
- **Exit:** Proofs reproducible from harness; logs stored with run metadata.

### 3) Architecture (Partner-friendly extension points)

- **Partner plugin SDK:** Extension points, semantic versioning rules, certification tests, and reference “task pack” catalog structure.
- **Exit:** Partner can build/ship an extension without modifying core; SDK packaged and documented.

### 4) Engineering (Scale the funnel)

- **Multi-eval orchestration:** Provisioning scripts + isolated environments; single command to create new eval environment.
- **Customer pack generator:** Emits deploy bundle + docs + configs from template.
- **Exit:** Zero-manual-step environment creation; template-driven packs.

### 5) Experiments & Monitoring (Customer reporting)

- **Customer KPI report generator:** Weekly PDF/HTML or dashboard export; SLA/SLO reporting; incident postmortem template.
- **Exit:** Reports automatic and auditable; no hand-edited spreadsheets.

### 6) IP (Claim-chart conversion)

- **Claim charts:** 5–7 competitor archetypes with non-infringing language.
- **Defensibility brief:** What’s protected, why it’s hard to design around, licensing stance.
- **Exit:** Each claim element maps to observable product behavior or config.

### 7) Compliance & Security (Partner & customer readiness)

- **Partner security guide:** Secure development requirements and data handling; DPA technical appendix inputs.
- **Exit:** Partners can pass basic security review without custom engineering.

### 8) Integration (Partner connectors)

- **Harness:** Connector certification harness.
- **Connectors:** Two connectors certified; event/audit export compatibility with stable schema.
- **Exit:** Certification runs in CI and passes for both connectors.

### 9) Commercialization (Partner motion + pricing)

- **Partner program v1:** Tiers, margins/royalties, enablement, co-sell workflow.
- **Pricing v3:** Aligned to metering + partner resell; quote turnaround <24h with predictable margin/scope.

---

## Milestones (10 Working Days)

- **Day 1–2:** Finalize scope/acceptance per workstream; stand up checklist templates; confirm environments capacity for 10 parallel evals.
- **Day 3–4:** SDK skeleton + certification harness draft; KPI report generator scaffold; claim-chart outline + defensibility brief framing; partner security guide draft.
- **Day 5–6:** Customer pack generator functional; multi-eval provisioning scripts green; first proof deck + bakeoff template draft; partner program/pricing strawman.
- **Day 7–8:** Certification harness stable; two connectors in CI; proof decks finalized with harness logs; claim charts 5–7 completed; security guide + DPA appendix inputs frozen.
- **Day 9–10:** Revenue QA checklist integrated into deal workflow; KPI reporting automated; partner program v1 + pricing v3 signed off; go/no-go review and retrospective.

---

## Operating Model

- **Cadence:** Daily standups + mid-sprint checkpoints (Day 4, Day 8); end-of-sprint demo and retro.
- **Owners:** DRI per workstream; support rotation calendar defined; escalation path to program lead.
- **Quality gates:** CI green, certification harness passing, report generator sample outputs reviewed, claim-chart legal review, security checklist completion.
- **Artifacts:** Stored in versioned folders with run metadata (harness logs, configs, decks, briefs, pricing models).

---

## Risks & Mitigations

- **Environment contention:** Pre-book capacity; use isolated namespaces and quotas; auto-cleanup jobs.
- **Partner SDK churn:** Lock extension-point contracts early; semantic versioning; compatibility matrix in harness.
- **Reporting gaps:** Contract KPI schema + SLOs; fail CI on missing metrics; synthetic data path for dry-runs.
- **Legal/sales alignment on claim charts:** Early legal review; non-infringing language templates; map to observable behaviors/configs.
- **Quote accuracy:** Pricing calculator tied to metering inputs; dual sign-off (finance + delivery).

---

## Exit Checklist (Definition of Done)

- Partner can extend/integrate without core forks (SDK + harness + task pack catalog).
- 10 evals/pilots run in parallel with standardized provisioning + reporting (single-command spin-up).
- Claim charts + defensibility story tied to telemetry/observable configs; bakeoff template reproducible.
- Quotes, deployments, KPI reporting repeatable and auditable (Revenue QA + automated reports).
- Two connectors certified in CI; security guide + DPA appendix inputs approved.

---

## Metrics & Reporting

- **Velocity:** Story points completed vs. planned per workstream.
- **Reliability:** Provisioning success rate; mean time to prepare eval (<1h, no manual steps).
- **Reporting:** Weekly KPI reports auto-generated; SLA/SLO compliance %.
- **Commercial:** Quote turnaround time (<24h), margin adherence, number of partner-led deals initiated.
- **Quality:** Certification harness pass rate; audit log completeness; legal/QA sign-off counts.
