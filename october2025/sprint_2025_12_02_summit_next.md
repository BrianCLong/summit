```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2025-12-02-intelgraph-summit-v1.4.0`
**Dates:** Dec 2–Dec 16, 2025 (2 weeks)
**Timezone:** America/Denver

> Focus: **Production expansion & proof at value.** Turn first production tenant into a referenceable win: billing/metering, success plans, ROI/TCO model wired to usage, incident drill, and first partner-led integration (Splunk app or ServiceNow). Freeze features by Dec 13 for year‑end stability.

---

## 0) North‑Star & Guardrails
- **North‑Star:** 1 referenceable production tenant + 1 partner‑led co‑sell opportunity in contracting.
- **SLOs (carry over):** API availability ≥ 99.5%; read P95 ≤ 300 ms; policy P95 ≤ 10 ms.
- **Security:** 0 criticals; SBOM on tag; DPIA/DPA executed for production tenant.

---

## 1) Objectives (Demo on Dec 16)
1. **Billing/Metering v1:** per‑tenant usage exports + invoice summary; budgets → notify/block; admin UI.
2. **Success & ROI:** success plan tracker; TCO/ROI calculator linked to real usage; exportable exec readout.
3. **Partner Integration 1:** Splunk app (search → graph handoff) **or** ServiceNow incident link‑back; pick by Dec 3.
4. **Reliability Drill:** incident tabletop + synthetic failover exercise; updated IR runbooks.
5. **Case Study v1:** anonymized, with metrics (TTI, auditability wins), quotes, and screenshots.
6. **Year‑End Hardening:** dependency bumps, CVE sweep, backup/restore test, log retention checks.

---

## 2) Scope & Priority
- **P0 (Must):** Usage meters + invoice export; success plan tracker; partner integration POC; incident drill; case study draft; security maintenance.
- **P1 (Should):** Admin budgets UI; ROI/TCO model bound to metering; ServiceNow webhook or Splunk app settings page; report export polish.
- **P2 (Could):** Multi‑tenant branding in exports; read replica toggle (doc + tf var); cost anomaly detection stub.
- **Won’t:** Full billing gateway; payment rails; SOC 2 audit.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Success plan tracker, ROI readout, case study v1, partner GTM brief, Q1 pipeline tie‑ins.
- **Frontend:** Admin usage dashboard, budget UI, report export polish, partner app UI shell (if Splunk app chosen).
- **Backend:** Usage metering API & exports, budget enforcement, partner integration endpoints, ROI API hookup.
- **Data/ETL:** Usage aggregation jobs, DLQ inspector polish, provenance completeness checks.
- **SecEng:** CVE sweep, dependency bumps, IR tabletop, log retention policy checks.
- **SRE:** Backup/restore fire drill, synthetic failover, dashboards tweaks, invoice export automation.

---

## 4) Backlog (Stories & Tasks)

### P0 — Billing/Metering v1
- **P0‑1** Usage Aggregation Jobs (owner: Data)
  - Aggregate per tenant: inference tokens, storage GB, connector compute hours, API calls.
- **P0‑2** Exports & Invoice Summary (owner: SRE/BE)
  - Nightly CSV/Parquet to `/exports/usage/YYYY‑MM‑DD`; invoice summary JSON + PDF.
- **P0‑3** Budget Modes (owner: BE)
  - Notify → throttle → block; audit entries; admin override.

### P0 — Success & ROI
- **P0‑4** Success Plan Tracker (owner: Product/FE)
  - Goals, owners, dates, status; export to PDF.
- **P0‑5** ROI/TCO Bind (owner: Product/BE)
  - Wire metering to calculator; scenarios; exec readout with charts.

### P0 — Partner Integration 1
- **Decision Gate (Dec 3):** Splunk App vs ServiceNow webhook.
- **P0‑6** If Splunk: App POC (owner: FE/BE)
  - Search panel → “Open in IntelGraph”; SSO or token settings; README for install.
- **P0‑7** If ServiceNow: Webhook (owner: BE)
  - Incident link → IntelGraph deep‑link with context; audit capture.

### P0 — Reliability Drill & Hardening
- **P0‑8** Incident Tabletop (owner: SecEng)
  - 60‑min scenario; after‑action with actions & owners.
- **P0‑9** Synthetic Failover (owner: SRE)
  - Kill a pod; verify SLOs; capture MTTR.
- **P0‑10** Security Maintenance (owner: SecEng/SRE)
  - CVE backlog; dep bumps; SBOM regenerate on `v1.4.0` tag.

### P0 — Case Study v1
- **P0‑11** Case Study Draft (owner: Product/GTM)
  - Structure: Situation → Approach → Results; metrics from metering; approved quotes/screens.

### P1 — Nice‑to‑Have
- **P1‑1** Admin Budgets UI (owner: FE)
  - Set thresholds; view usage; alert recipients.
- **P1‑2** ROI Charts (owner: FE)
  - TTI delta, cost vs status quo, analyst hours saved.
- **P1‑3** Export Branding (owner: FE)
  - Tenant logo/footer; persisted.

### P2 — Future
- **P2‑1** Cost Anomaly Detection Stub (owner: BE)
  - Simple z‑score on usage; alert on spikes.

---

## 5) Acceptance Criteria & DoD
- **Metering:** Exports present for last 3 nights; invoice summary downloadable; budgets enforce modes with audit.
- **Success/ROI:** Tracker filled for production tenant; readout generated with live usage.
- **Partner:** POC working in target environment; README/install notes; demoable path.
- **Reliability:** Tabletop completed; failover test recorded; MTTR measured.
- **Security:** CVE sweep complete; SBOM regenerated; log retention checks passed.
- **Case Study:** Draft ready for customer review; internal approval done.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily  
- **Mid‑sprint demo:** Dec 9, 15:00 MT  
- **Feature freeze:** Dec 13, 12:00 MT  
- **Review & demo:** Dec 16, 15:00 MT  
- **Retro:** Dec 16, 16:00 MT

---

## 7) Metrics
- **Business:** pilot→prod conversions; reference status; partner co‑sell opps.
- **Product:** MTTR in drill; SLO burn; budget hits; invoice accuracy.
- **Adoption:** active investigators; reports exported; partner app clicks.

---

## 8) Deliverables (Repos & Docs)
- `ops/usage/{aggregations.sql,exporter.ts}`
- `server/src/billing/{metering.ts,budgets.ts}`
- `client/src/admin/usage/*`
- `docs/success/{plan_tracker.md,roi_readout.md}`
- `integrations/{splunk-app/* | servicenow-webhook/*}`
- `docs/runbooks/incident_tabletop.md`
- `docs/evidence/v1.4/*` (sbom, reports)
- `docs/case_studies/prod_tenant_v1.md`
- `CHANGELOG_sprint-2025-12-02.md`

---

## 9) Demo Script (Dec 16)
1. Show admin usage dashboard; download invoice summary; set budget to throttle → verify behavior.
2. Walk through success tracker; generate ROI readout with live metrics.
3. Demo partner integration (Splunk app or ServiceNow deep‑link) with audit capture.
4. Trigger synthetic failover; show MTTR & SLO burn.
5. Present case study draft and next‑step plan for public reference.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 8, 2025 (v1.4.0 plan)
```

