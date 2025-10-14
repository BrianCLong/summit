```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2026-04-17-intelgraph-summit-v1.13.0`
**Dates:** Apr 17–May 1, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Q2 Launch Readiness + Reference Machine.** Lock two production rollouts, convert one net‑new pilot, operationalize playbooks & ServiceNow GA in the field, and stand up a repeatable reference/advocacy engine. Prep Q2 roadmap and capacity plan. Target **$750k new ARR in commit**, **3 production tenants live**, and **2 public/anon references**.

---

## 0) North‑Star & Guardrails
- **North‑Star:** 3 production tenants; 1 new pilot conversion committed; reference hub live with 2 stories.
- **SLOs:** Availability ≥ 99.85%; Read P95 ≤ 220 ms; Policy P95 ≤ 8 ms; Ingest success ≥ 99.2% (24h).
- **Security/Governance:** 0 criticals; SBOM on `v1.13.0`; quarterly access review evidence; schema approvals enforced; ER audit coverage ≥ 98%.

---

## 1) Objectives (Demo on May 1)
1. **Production at Speed:** Day‑2 ops steady for tenants A/B; tenant C conversion signed & migration rehearsal complete.
2. **Playbooks in the Field:** scheduled playbooks running at two tenants; alerting & exports used by supervisors.
3. **ServiceNow GA Adoption:** two tenants pulling incidents; SLO panel shows healthy throughput; DLQ auto‑replay active.
4. **Threat Intel v6:** confidence‑aware **suppression policies per tenant**, noise dashboards, and per‑source cost guardrails.
5. **Reference Machine v1:** reference hub (case studies, quotes, short demo clips), consent workflow, and analyst briefing kit.
6. **Q2 Capacity & Roadmap:** segment P&L view, win/loss analysis Q1→Q2, prioritized roadmap with revenue tags and capacity plan.
7. **Analytics v6:** playbook adoption by persona, insight time trend, pilot→prod conversion dashboard, and NPS over time.

---

## 2) Scope & Priority
- **P0 (Must):** Tenant C conversion pack; playbook schedules live at 2 tenants; ServiceNow GA live at 2 tenants; TI suppression policies; reference hub & consent; Q2 roadmap & capacity; analytics v6.
- **P1 (Should):** Audit export automation to S3/SFTP; connector SLOs per tenant; SDK snippet generator for playbooks.
- **P2 (Could):** Map auto‑binning; lightweight fine‑tune hooks for retriever scorer.
- **Won’t:** Public marketplace for additional integrations; FedRAMP SSP; payment rails.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Conversion C, reference hub, analyst kit, Q2 roadmap/priorities, capacity plan, ABM wave‑4.
- **Frontend:** Playbooks scheduler UX polish, supervisor exports, analytics v6 dashboards, reference hub pages.
- **Backend:** Tenant‑scoped suppression policies & budgets, audit export automation, ServiceNow throughput tuning, roadmap tagging hooks.
- **Data/ETL:** ServiceNow mapping fixtures per tenant, TI suppression analytics, ER audit sampling.
- **SecEng:** Access review evidence bundle, policy coverage diffs, DPIA updates for tenant C.
- **SRE:** Release `v1.13.0`, connector per‑tenant SLO panels, DLQ auto‑replay checks, migration rehearsal for tenant C, cost guardrails.

---

## 4) Backlog (Stories & Tasks)

### P0 — Conversion C & Production Steady State
- **P0‑1** Migration Rehearsal C (owner: SRE/BE)
  - Dry‑run with tenant dataset; rollback steps; timing; sign‑off.
- **P0‑2** SOW Execution C (owner: GTM/Legal)
  - Redlines; countersign; kickoff; CRM update.
- **P0‑3** Day‑2 Ops C (owner: SRE/Product)
  - On‑call, quotas/budgets, backup cadence; acceptance note filed.

### P0 — Playbooks in the Field
- **P0‑4** Scheduler Rollout (owner: FE/BE)
  - Create two scheduled playbooks per tenant; alert routes; export destinations.
- **P0‑5** Supervisor Export Flows (owner: FE)
  - One‑click annotated exports (PDF/MD) to S3/SFTP; respect redaction/branding.

### P0 — ServiceNow GA Adoption
- **P0‑6** Tenant Config & Throttling (owner: BE/SRE)
  - OAuth secrets, rate limits, backoff; SLO panel per tenant; pager on breach.
- **P0‑7** DLQ Auto‑replay Policy (owner: SRE)
  - Time windows, idempotency; alerts on consecutive failures.

### P0 — Threat Intel v6 (Policies & Costs)
- **P0‑8** Suppression Policies (owner: BE/Data)
  - Rules by type/source/score; preview impact; audit of suppressed items.
- **P0‑9** Per‑source Budgets (owner: BE/SRE)
  - Monthly caps per provider; 80/100% thresholds; override path.
- **P0‑10** Noise Dashboard (owner: FE/SRE)
  - Suppressed vs surfaced; confidence distribution; cost overlay.

### P0 — Reference Machine v1
- **P0‑11** Reference Hub (owner: Product/FE)
  - `/docs/gtm/references/` index: case studies, quotes, 60‑sec clips, evidence pack links.
- **P0‑12** Consent Workflow (owner: GTM/Legal)
  - Email templates, redlines, logo usage; tracker.
- **P0‑13** Analyst Kit (owner: GTM)
  - One‑pager, deck addendum, briefing notes; demo script.

### P0 — Q2 Capacity & Roadmap
- **P0‑14** Segment P&L & Win/Loss (owner: Product/Finance)
  - ARR, CAC payback, win rate, cycle time; insights.
- **P0‑15** Roadmap with Revenue Tags (owner: Product/Eng)
  - Rank top 10 items with $ impact; dependencies; risk; publish.
- **P0‑16** Capacity Plan (owner: Eng/Product)
  - Sprint capacity by team; hiring/contractor asks; deliverables per month.

### P0 — Analytics v6
- **P0‑17** Dashboards (owner: FE/SRE)
  - Playbook adoption by persona; time‑to‑first‑insight; pilot→prod conversion; NPS trend.
- **P1‑18** Audit Export Automation (owner: BE)
  - Presets; scheduled delivery; encryption.

---

## 5) Acceptance Criteria & DoD
- **Tenant C:** signed SOW; migration rehearsal passed; Day‑2 ops acceptance filed.
- **Playbooks:** ≥ 2 scheduled playbooks per tenant (A & B) running; alerts delivered; exports landing in S3/SFTP; audit links present.
- **ServiceNow:** two tenants live; per‑tenant SLO green; DLQ auto‑replay resolving ≥ 90% of retriable batches.
- **TI Policies:** suppression reduces low‑value indicators ≥ 50% with audit trail; per‑source budgets enforced with notifications.
- **References:** hub live with 2 stories (anon or named), consent logged; analyst kit published.
- **Q2 Plan:** roadmap with $ tags approved; capacity plan agreed; segment P&L & win/loss doc published.
- **Analytics:** v6 dashboards populated; NPS trend line visible; export to CSV works.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily  
- **Mid‑sprint demo:** Apr 24, 15:00 MT  
- **Code freeze:** Apr 30, 12:00 MT  
- **Review & demo:** May 1, 15:00 MT  
- **Retro:** May 1, 16:00 MT

---

## 7) Metrics
- **Business:** ARR commit, pilots signed, conversions, references.
- **Product:** playbook runs/exports, ServiceNow throughput & errors, TI suppression %, provider budget hits.
- **Ops:** ingest success %, error budget burn, DLQ auto‑replay success, backup cadence adherence.

---

## 8) Deliverables (Repos & Docs)
- `docs/contracts/{SOW_production_C_signed.md}` + `docs/ops/day2_signoffs/tenantC.md`
- `client/src/features/playbooks/schedule/*` + `server/src/playbooks/scheduler_v2.ts`
- `client/src/features/export/supervisor/*` + `server/src/export/destinations/{s3.ts,sftp.ts}`
- `ops/dashboards/servicenow_slo_per_tenant.json` + `ops/dlq/auto_replay_policy.yaml`
- `server/src/ti/{suppression_policies.ts,provider_budgets.ts}` + `client/src/admin/ti/noise_dashboard/*`
- `docs/gtm/references/{index.md,story1.md,story2.md}` + `docs/gtm/analyst_kit/*` + `docs/gtm/consent_tracker.csv`
- `docs/strategy/Q2_roadmap_with_revenue.md` + `docs/strategy/segment_PnL_Q1_to_Q2.md` + `docs/strategy/capacity_plan_Q2.md`
- `client/src/admin/analytics/v6/*` + `server/src/analytics/conversions.ts`
- `CHANGELOG_sprint-2026-04-17.md`

---

## 9) Demo Script (May 1)
1. Show tenant C conversion pack & migration rehearsal; Day‑2 sign‑off.
2. Run scheduled playbooks; show alert & exports in S3/SFTP; open annotated PDF.
3. Display ServiceNow SLO per tenant; trigger DLQ auto‑replay demo.
4. Show TI suppression impact & provider budget caps; review noise dashboard.
5. Present reference hub + consent log; analyst kit walkthrough.
6. Review Q2 roadmap with $ tags, capacity plan, and analytics v6 dashboards.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 17, 2025 (v1.13.0 plan)
```

