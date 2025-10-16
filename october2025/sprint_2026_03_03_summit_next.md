```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor

**Slug/Version:** `sprint-2026-03-03-intelgraph-summit-v1.10.0`
**Dates:** Mar 3–Mar 17, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Conversions at scale + quality & governance.** Close at least **1 production conversion** from Feb pilots, progress second to redlines, raise GraphRAG answer quality (**v2 eval & guardrails**), harden entity‑resolution & ingestion governance, and launch the first joint webinar. Land **$400k new ARR in commit**.

---

## 0) North‑Star & Guardrails

- **North‑Star:** 1 pilot → production (signed) + 1 in redlines; webinar ≥ 200 registrations; marketplace‑sourced leads ≥ 30 total.
- **SLOs:** Availability ≥ 99.7%; Read P95 ≤ 240 ms; Policy P95 ≤ 8 ms; Error budget burn < 12%.
- **Security & Governance:** 0 criticals; SBOM on `v1.10.0` tag; ER merge audit coverage ≥ 95%; DPIA/DPA current for all active pilots.

---

## 1) Objectives (Demo on Mar 17)

1. **Conversion Pack Complete:** signed production SOW, pricing, migration executed in staging, day‑2 ops plan accepted.
2. **GraphRAG Quality v2:** expanded eval set (250 Qs), prompt/plan lint v2, answerability checks, top‑k tuning, and guardrail tests.
3. **ER & Ingestion Governance:** ER rollback UX + merge reason codes; schema registry approvals; DLQ policies & retention.
4. **Threat Intel v3:** enrichment provider in production mode with quota & cost guardrails; indicator dedupe.
5. **Analytics v3:** adoption funnel upgrades (from install→first insight), cost/usage cohort views, pilot scorecard.
6. **Joint Webinar:** landing live, emails scheduled, partner speaker locked, dry‑run date set; press analyst brief finalized.

---

## 2) Scope & Priority

- **P0 (Must):** Conversion pack; eval v2 + guardrails; ER rollback UX; schema approvals; enrichment prod mode; analytics v3; webinar launch.
- **P1 (Should):** Indicator dedupe heuristics; DLQ auto‑replay policies; cost anomaly suppression rules UI; audit export presets.
- **P2 (Could):** Simple fine‑tune hooks for retrieval scorer; map clustering auto‑binning; SDK snippet generator.
- **Won’t:** Payment rails; FedRAMP ATO; multi‑region HA.

---

## 3) Swimlanes & Owners

- **Product/GTM (Felix):** Conversion pack, pricing, webinar, press/analyst, customer references.
- **Frontend:** ER rollback UX, schema approval flow, audit export presets, analytics v3 dashboard.
- **Backend:** Guardrail checks, prompt/plan lint v2, top‑k tuner, enrichment quotas, indicator dedupe, DLQ policy engine.
- **Data/ETL:** Eval set curation (250 Qs), ingestion policy metadata, dedupe metrics, replay safety.
- **SecEng:** Governance controls review, DPIA/DPA updates, policy coverage tests.
- **SRE:** Release `v1.10.0`, dashboards v3, error budget & cohort analytics, migration rehearsal.

---

## 4) Backlog (Stories & Tasks)

### P0 — Conversion Pack

- **P0‑1** Migration Rehearsal (owner: SRE/BE)
  - Run production‑like migration on staging dataset; rollback tested; timing doc.
- **P0‑2** Production SOW Sign (owner: GTM/Legal)
  - Redlines closure; signature; project kickoff scheduled; CRM stage updated.
- **P0‑3** Day‑2 Ops Acceptance (owner: SRE/Product)
  - On‑call, backup/restore, quota/budget settings acknowledged by customer.

### P0 — GraphRAG Quality v2

- **P0‑4** Eval Set 250 (owner: Product/Data)
  - Expand to 250 Qs with gold citations; difficulty tags.
- **P0‑5** Guardrails (owner: BE)
  - Answerability detection; citation presence checks; hallucination filter; failing answers blocked with rationale.
- **P0‑6** Prompt/Plan Lint v2 (owner: BE)
  - Token budget, banned patterns, join fan‑out limits; CI rule set.
- **P0‑7** Top‑k Tuner (owner: BE)
  - Sweep k & rerank strategies; persist per‑dataset defaults.

### P0 — ER & Ingestion Governance

- **P0‑8** ER Rollback UX (owner: FE/BE)
  - Compare pre/post; multi‑select rollback; reason codes; audit.
- **P0‑9** Schema Approval Flow (owner: FE/Data)
  - Submit→review→approve with comments; required for prod tenants.
- **P0‑10** DLQ Policies (owner: BE/SRE)
  - Time‑based retention; auto‑replay windows; severity tags; alerts.

### P0 — Threat Intel v3

- **P0‑11** Provider Quotas & Costs (owner: BE/SRE)
  - Rate caps per tenant; budgets; notify on 80% usage; block at 100% (configurable).
- **P0‑12** Indicator Dedupe (owner: Data)
  - Hash‑based + fuzzy; link consolidation; provenance preserved.

### P0 — Analytics v3 & Webinar

- **P0‑13** Adoption Funnel v3 (owner: FE/SRE)
  - Install→enable→ingest→first insight; drop‑off detection; CSV export.
- **P0‑14** Cost/Usage Cohorts (owner: BE)
  - Cohort views by tenant size/segment; MTD rollups; budget hit rate.
- **P0‑15** Pilot Scorecard (owner: Product)
  - TTI, usage, policy hits, issues, exec status; shareable MD/PDF.
- **P0‑16** Webinar Launch (owner: GTM)
  - Landing, emails, registration tracking; dry‑run schedule; speaker bios; press/analyst brief final.

### P1 — Extras

- **P1‑1** DLQ Auto‑replay Policies (owner: SRE)
  - Safe window & batch sizes; abort on error spike.
- **P1‑2** Anomaly Suppression UI (owner: FE)
  - Allowlist time windows; comment trail.
- **P1‑3** Audit Export Presets (owner: FE)
  - Common filters saved; one‑click CSV.

---

## 5) Acceptance Criteria & DoD

- **Conversion:** Signed SOW; migration rehearsal passed with rollback; day‑2 ops accepted; kickoff scheduled.
- **Quality:** Eval report shows ≥ +10% improvement in grounded precision or ≥ −20% hallucination rate; guardrails block bad answers with rationale.
- **Governance:** ER rollback works and audited; schema approvals enforced for prod tenants; DLQ policies applied with alerts.
- **Threat Intel:** Quotas & budgets active; dedupe reduces duplicate indicators ≥ 50% in test set; provenance intact.
- **Analytics/Webinar:** Adoption funnel & cohort dashboards populated; pilot scorecard shared; webinar live with ≥ 200 regs or scheduled with pace to hit.

---

## 6) Cadence & Dates

- **Standup:** 09:30 MT daily
- **Mid‑sprint demo:** Mar 10, 15:00 MT
- **Code freeze:** Mar 16, 12:00 MT
- **Review & demo:** Mar 17, 15:00 MT
- **Retro:** Mar 17, 16:00 MT

---

## 7) Metrics

- **Business:** conversions, ARR commit, webinar registrations, marketplace leads.
- **Product:** grounded precision/recall, hallucination rate, top‑k default performance, ER rollback count.
- **Ops:** error budget, DLQ retention/replay, quota/budget alerts.

---

## 8) Deliverables (Repos & Docs)

- `docs/contracts/{SOW_production_signed.md}` + `docs/runbooks/migration_rehearsal.md`
- `eval/qa_set_250.json` + `eval/guardrail_tests.yaml` + `eval/report_v2.md`
- `client/src/admin/registry/er_rollback/*` + `server/src/registry/er_rollback.ts`
- `client/src/admin/registry/approvals/*` + `server/src/registry/approvals.ts`
- `server/src/ingestion/dlq_policies.ts` + `ops/dashboards/dlq_policies.json`
- `server/src/ti/{quota.ts,dedupe.ts}` + `ops/costs/ti_budgets.yaml`
- `client/src/admin/analytics/v3/*` + `server/src/analytics/cohorts.ts`
- `docs/gtm/webinar/{landing.md,emails.md,run_of_show.md}` + `docs/press/analyst_brief_final.md`
- `docs/gtm/pilot_scorecards/{pilotA.md,pilotB.md}`
- `CHANGELOG_sprint-2026-03-03.md`

---

## 9) Demo Script (Mar 17)

1. Show signed conversion pack; migration rehearsal results; kickoff.
2. Run GraphRAG eval v2; display guardrail test results & top‑k tuning effect.
3. Demonstrate ER rollback UX on a sample; show audit.
4. Enforce schema approval; attempt ingest before/after approval.
5. Show TI quotas & dedupe effect; cost budget alert.
6. Walk through analytics v3 & pilot scorecard; show webinar launch & registrations.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 14, 2025 (v1.10.0 plan)
```
