```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2026-02-16-intelgraph-summit-v1.9.0`
**Dates:** Feb 16–Mar 2, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Pilot execution → conversions + marketplace leverage.** Start two newly signed pilots, drive one to mid‑pilot proof, convert one existing pilot to production, ship CSV Schema Registry v1.1 with entity‑resolution rules, deepen Threat Intel track (enrichment stub → provider), and stand up GraphRAG eval harness v1. Target **1 pilot → production conversion** and **$350k new ARR in commit**.

---

## 0) North‑Star & Guardrails
- **North‑Star:** 1 conversion (pilot→production), 2 pilots actively executing with success plans, ≥ 20 marketplace‑sourced leads/installs tracked.
- **SLOs:** Availability ≥ 99.7%; Read P95 ≤ 250 ms; Policy P95 ≤ 8 ms; Error budget burn < 15%.
- **Security:** Critical CVEs = 0; SBOM on `v1.9.0`; DPIA/DPA in place for all pilots.

---

## 1) Objectives (Demo on Mar 2)
1. **Pilot Execution Pack:** success plans live, weekly metrics, and exec readouts for 2 pilots; mid‑pilot proof for one.
2. **Conversion Motion:** pricing + SOW (production) ready; governance checks passed; migration plan authored.
3. **CSV Schema Registry v1.1:** add **entity‑resolution rules** (email/domain/company), validation, and audit of merges.
4. **Threat Intel v2:** enrichment provider hookup (VirusTotal or OTX) via toggleable adapter; rate‑limit + cache.
5. **GraphRAG Eval Harness v1:** precision/recall on 100‑Q set; report with deltas vs prior sprint.
6. **Marketplace & Analytics:** install/lead tracking events wired; tenant analytics dashboard v2 (TTI proxy & adoption funnels).

---

## 2) Scope & Priority
- **P0 (Must):** Success plans, weekly pilot metrics, one conversion path prepared, schema registry rules, enrichment adapter, eval harness, marketplace events, analytics v2.
- **P1 (Should):** Audit search facets polish; report export annotations; connector health board v2; ABM wave‑2 follow‑ups.
- **P2 (Could):** Query plan cache stats; map clustering perf; cost anomaly suppression list.
- **Won’t:** Payment rails; FedRAMP package; multi‑region HA.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Pilot success plans, exec readouts, conversion SOW/pricing, ABM wave‑2 follow‑ups, marketplace campaigns.
- **Frontend:** Registry rules UI, audit merge log view, analytics v2, report annotations.
- **Backend:** ER rules engine, enrichment adapter, eval harness services, marketplace tracking events.
- **Data/ETL:** Schema validations, merge provenance, STIX enrichment pipeline, sample eval datasets.
- **SecEng:** DPIA/DPA checks for pilots, policy test coverage, access review.
- **SRE:** Dashboards v2 (adoption funnels, TTI proxy), error budget monitor, release `v1.9.0`.

---

## 4) Backlog (Stories & Tasks)

### P0 — Pilot Execution & Conversion
- **P0‑1** Success Plans Live (owner: Product/GTM)
  - Goals, owners, metrics; cadence; risks; shareable PDF.
- **P0‑2** Weekly Pilot Metrics (owner: SRE/Product)
  - TTI proxy, adoption, errors, policy hits; auto‑generated summary.
- **P0‑3** Conversion Package (owner: Product/Legal)
  - Production SOW + pricing; security/governance checklist; migration runbook draft.

### P0 — CSV Schema Registry v1.1 (Entity Resolution)
- **P0‑4** ER Rules Engine (owner: BE)
  - Deterministic & fuzzy; thresholds; preview before merge; audit trail of merges/splits.
- **P0‑5** Registry UI for ER (owner: FE)
  - Define rules; simulate; approve; rollback.
- **P0‑6** Provenance & Audit (owner: BE)
  - Store pre/post state; expose `/audit/merges` endpoint; CSV export.

### P0 — Threat Intel v2 (Enrichment)
- **P0‑7** Enrichment Adapter (owner: BE/Data)
  - Provider toggle (VirusTotal/OTX); caching; rate limits; redact keys in logs.
- **P0‑8** Indicator Page UX (owner: FE)
  - Show enrichments with source, time, score; link to graph edges.

### P0 — GraphRAG Eval Harness v1
- **P0‑9** 100‑Q Eval Set (owner: Product/BE)
  - Curate questions; gold answers & citations; store in `/eval/qa_set.json`.
- **P0‑10** Scorer + Report (owner: BE)
  - Template match accuracy; grounded citation precision/recall; HTML/MD report.

### P0 — Marketplace & Analytics
- **P0‑11** Install/Lead Events (owner: BE/FE)
  - Events for install, enable, first query; pass tenant/account metadata; privacy‑safe.
- **P0‑12** Tenant Analytics v2 (owner: SRE/FE)
  - Funnels: connector enabled → ingest → first answer; TTI trend; export CSV.

### P1 — Polish & ABM
- **P1‑1** Audit Facets Polish (owner: FE)
  - Saved filters; pinned views; faster pagination.
- **P1‑2** Report Annotations (owner: FE)
  - Highlight nodes/edges in exports; note author + timestamp.
- **P1‑3** Connector Health Board v2 (owner: SRE)
  - Retries, DLQ growth, success %, last error sample.
- **P1‑4** ABM Wave‑2 Follow‑ups (owner: GTM)
  - Sequenced emails + LinkedIn; meeting targets & calendar holds.

### P2 — Ops & Cost
- **P2‑1** Query Plan Cache Stats (owner: BE)
  - Expose hits/misses; invalidations; admin view.
- **P2‑2** Cost Anomaly Suppression (owner: SRE)
  - Allowlist spikes by window to avoid alert fatigue.

---

## 5) Acceptance Criteria & DoD
- **Pilots:** two success plans running with weekly reports; one mid‑pilot proof shown; exec readouts delivered.
- **Conversion:** production SOW & pricing approved internally; governance checklist completed; migration plan reviewed.
- **Registry v1.1:** ER rules create/preview/approve; merges audited; rollback works; API & UI tests pass.
- **Threat Intel v2:** enrichment calls return data; cache hit rate ≥ 70% on demo set; keys secured; indicator UI shows enrichments.
- **Eval Harness:** 100‑Q set stored; scorer runs; report generated with baseline deltas.
- **Analytics & Marketplace:** events flowing to dashboard; ≥ 20 installs/leads captured; funnels populated.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Feb 23, 15:00 MT
- **Code freeze:** Mar 1, 12:00 MT
- **Review & demo:** Mar 2, 15:00 MT
- **Retro:** Mar 2, 16:00 MT

---

## 7) Metrics
- **Business:** conversions, ARR commit, marketplace installs/leads, meetings booked.
- **Product:** ER merges audited, enrichment cache hit rate, eval scores, TTI proxy.
- **Reliability/Cost:** error budget, DLQ size, anomaly count (suppressed vs active).

---

## 8) Deliverables (Repos & Docs)
- `server/src/registry/{er_rules.ts,audit_merges.ts}` + `client/src/admin/registry/er_rules/*`
- `server/src/ti/{enrichment_adapter.ts,providers/{virustotal.ts,otx.ts}}`
- `client/src/features/indicator/*`
- `eval/qa_set.json` + `eval/score_report.ts` + `docs/eval/report.md`
- `client/src/admin/analytics/v2/*` + `ops/dashboards/analytics_v2.json`
- `server/src/marketplace/events.ts`
- `docs/gtm/pilots/{success_plan_A.md,success_plan_B.md}` + `docs/gtm/executive_readout_template.md`
- `docs/contracts/SOW_production_conversion.md`
- `CHANGELOG_sprint-2026-02-16.md`

---

## 9) Demo Script (Mar 2)
1. Walk two live success plans & weekly pilot metrics; show mid‑pilot proof.
2. Present conversion package (SOW, pricing, governance checklist, migration plan).
3. Configure ER rules; simulate & approve; show merge audit; rollback one merge.
4. Run enrichment adapter; view indicator page with enrichments & cache stats.
5. Execute 100‑Q eval; display report deltas; discuss next focus areas.
6. Show marketplace events & analytics funnels; tie to ABM follow‑ups.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 13, 2025 (v1.9.0 plan)
```

