```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2026-05-02-intelgraph-summit-v1.14.0`
**Dates:** May 2–May 16, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Q2 scale & references at velocity.** Stabilize three production tenants, light up one new pilot, expand playbook/library reuse, publish two reference assets, and open the partner channel (co‑sell & marketplace attribution). Target **$900k new ARR in commit**, **3 production tenants healthy**, **1 new pilot countersigned**, and **2 reference assets published**.

---

## 0) North‑Star & Guardrails

- **North‑Star:** 3 prod tenants green on SLOs; 1 new pilot signed; 2 references live (anon or named);
- **SLOs:** API availability ≥ 99.85%; Read P95 ≤ 210 ms; Policy P95 ≤ 8 ms; Ingest success ≥ 99.3% (24h)
- **Security/Governance:** 0 criticals; SBOM on tag `v1.14.0`; quarterly access review diffs filed; schema approvals enforced; ER audit coverage ≥ 98%.

---

## 1) Objectives (Demo on May 16)

1. **Production Health @ 3 Tenants:** connector SLOs per tenant, DLQ auto‑replay tuned, budgets/quota alerts sane.
2. **New Pilot D:** countersigned SOW, kickoff plan, success plan, security packet delivered.
3. **Playbook Library v1:** curated catalogue with tags, RBAC sharing, import/export, and starter kits per segment (Gov/Enterprise).
4. **Reference Machine v2:** two assets published (case study + 60‑sec clip or quote card), consent tracked, analyst kit refreshed.
5. **Partner Channel On:** partner referral process live, co‑sell briefing pack, marketplace attribution into CRM.
6. **Analytics v7:** per‑playbook adoption, time‑to‑first‑insight trend, conversion funnel (lead→pilot→prod), NPS by tenant/role.

---

## 2) Scope & Priorities

- **P0 (Must):** Tenant health dashboards; Pilot D SOW + kickoff + success plan; Playbook Library v1 (catalogue + RBAC + import/export); 2 reference assets; partner referral & attribution; analytics v7.
- **P1 (Should):** Supervisor export presets; TI suppression & budget tuning UI; cost anomaly RCA notes; ServiceNow mapping diffs per tenant.
- **P2 (Could):** Playbook marketplace (internal sharing across tenants via templates export only); geo auto‑binning.
- **Won’t:** Payment rails; FedRAMP SSP; public template sharing beyond export.

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Pilot D packet & schedule, reference assets, partner pack & CRM attribution, ABM wave‑4 cadence.
- **Frontend:** Playbook Library UI (catalogue, tags, import/export), analytics v7 dashboards, export presets.
- **Backend:** Library APIs (tags, RBAC, import/export), attribution events to CRM, connector SLO feeds, TI tuning endpoints.
- **Data/ETL:** ServiceNow/Jira per‑tenant mapping diffs, DLQ tuning, suppression/budget datasets.
- **SecEng:** Security packet for Pilot D, access review diffs, policy coverage checks.
- **SRE:** Release `v1.14.0`, tenant SLO dashboards, alert hygiene, budgets & quotas verification, backup spot checks.

---

## 4) Backlog (Stories & Tasks)

### P0 — Production Health @ 3 Tenants

- **P0‑1** Per‑Tenant SLO Panels (owner: SRE)
  - Latency/error/ingest success; alerts with owner routing; weekly report export.
- **P0‑2** DLQ Auto‑replay Tuning (owner: SRE/Data)
  - Safe windows & batch sizes; success ≥ 92% of retriable; noisy sources flagged.
- **P0‑3** Budgets & Quotas Audit (owner: BE/SRE)
  - Thresholds verified; override audit; monthly rollup.

### P0 — Pilot D (New)

- **P0‑4** SOW & Kickoff (owner: GTM/Legal)
  - Countersigned; kickoff date/time; environment/hosting notes; CRM stage moved.
- **P0‑5** Success Plan (owner: Product/GTM)
  - Goals, metrics, personas, datasets; cadence; risks.
- **P0‑6** Security Packet (owner: SecEng)
  - SBOM, data handling, DPIA/DPA; tailored to Pilot D.

### P0 — Playbook Library v1

- **P0‑7** Catalogue & Tags (owner: FE/BE)
  - Browse, filter, tags (threat, fraud, supply chain, etc.); usage counters.
- **P0‑8** RBAC Sharing (owner: FE/SecEng)
  - Role/tenant scoped; link tokens; audit on run & share.
- **P0‑9** Import/Export (owner: FE/BE)
  - JSON template format; checksum; provenance; starter kits per segment.

### P0 — Reference Machine v2

- **P0‑10** Assets x2 (owner: GTM/Product)
  - Case study v2 + 60‑sec clip or quote card; legal approval; publish.
- **P0‑11** Analyst Kit Refresh (owner: GTM)
  - Updated one‑pager/deck addendum; demo script; proof table.

### P0 — Partner Channel On

- **P0‑12** Referral & Co‑sell (owner: GTM)
  - Briefing pack; referral form/process; margin confirmation; SLA for follow‑up.
- **P0‑13** Marketplace Attribution (owner: BE/GTM)
  - Event wiring to CRM; source/medium/campaign mapping; report.

### P0 — Analytics v7

- **P0‑14** Dashboards (owner: FE/SRE)
  - Playbook adoption, TTFI trend, conversion funnel, NPS by tenant/role; CSV export.

### P1 — Tuning & Presets

- **P1‑1** Supervisor Export Presets (owner: FE)
  - Saved filters; scheduled exports; S3/SFTP delivery.
- **P1‑2** TI Tuning UI (owner: FE/BE)
  - Suppression & budget sliders; preview impact; save per tenant.
- **P1‑3** Cost Anomaly RCA Notes (owner: BE)
  - Field for annotating anomalies; export with report.

---

## 5) Acceptance Criteria & DoD

- **Prod health:** All 3 tenants green on SLOs; DLQ auto‑replay ≥ 92% success; budget alerts tuned & acknowledged.
- **Pilot D:** SOW countersigned; kickoff scheduled; success plan approved; security packet delivered.
- **Playbook Library v1:** catalogue with tags & filters; RBAC sharing working; import/export JSON (checksum, provenance); starter kits available.
- **References:** two assets published; consent logged; analyst kit updated.
- **Partner:** referral process live; attribution flowing to CRM; first co‑sell call booked.
- **Analytics v7:** dashboards populated; CSV export works; NPS by role visible.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** May 9, 15:00 MT
- **Code freeze:** May 15, 12:00 MT
- **Review & demo:** May 16, 15:00 MT
- **Retro:** May 16, 16:00 MT

---

## 7) Metrics

- **Business:** ARR commit, pilots signed, references, partner‑sourced pipeline.
- **Product:** playbook usage, time‑to‑first‑insight trend, DLQ success, SLO adherence.
- **Trust:** access review diffs closed, schema approvals, ER audit coverage, NPS.

---

## 8) Deliverables (Repos & Docs)

- `ops/dashboards/tenant_slo_overview.json` + `ops/dlq/tuning_notes.md`
- `docs/contracts/pilots/SOW_pilot_D_signed.md` + `docs/gtm/pilots/success_plan_D.md` + `docs/compliance/pilot_D_security_packet.md`
- `server/src/playbooks/library/{api.ts,models.ts}` + `client/src/features/playbooks/library/*` + `docs/playbooks/starter_kits/{gov.md,enterprise.md}`
- `docs/gtm/references/{case_study_v2.md,clip_60sec_script.md,quote_cards.md}` + `docs/gtm/analyst_kit/`
- `docs/partners/{referral_process.md,co_sell_brief.md,margin.md}` + `server/src/telemetry/crm_attribution.ts`
- `client/src/admin/analytics/v7/*` + `server/src/analytics/funnels.ts`
- `CHANGELOG_sprint-2026-05-02.md`

---

## 9) Demo Script (May 16)

1. Walk tenant health: SLO panels, DLQ replay success, budget alerts.
2. Present Pilot D kickoff & success plan; show tailored security packet.
3. Browse Playbook Library; RBAC share; import/export a template; run a starter kit playbook.
4. Show reference assets published; analyst kit highlights.
5. Demonstrate partner referral into CRM with attribution; show co‑sell briefing pack.
6. Open analytics v7: adoption, TTFI trend, conversion funnel, NPS by role.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 18, 2025 (v1.14.0 plan)
```
