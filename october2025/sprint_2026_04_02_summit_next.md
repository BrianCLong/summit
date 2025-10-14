```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2026-04-02-intelgraph-summit-v1.12.0`
**Dates:** Apr 2–Apr 16, 2026 (2 weeks)
**Timezone:** America/Denver

> Focus: **Production scale & repeatability.** Land one **net-new pilot**, complete two **production rollouts** (Conversions #1–2), ship **Playbooks GA**, GA **ServiceNow Incident connector**, Threat Intel **scoring & suppression**, and SOC‑like hygiene pack (policy coverage, access reviews, backups). Target **$600k new ARR in commit** and **NPS ≥ 40** from active pilots.

---

## 0) North‑Star & Guardrails
- **North‑Star:** 2 production tenants live and stable; 1 additional pilot countersigned; webinar → ≥ 20 qualified meetings; marketplace leads ≥ 50 cumulative.
- **SLOs:** Availability ≥ 99.8%; Read P95 ≤ 220 ms; Policy P95 ≤ 8 ms; Ingest success ≥ 99.0% (24h), Error budget burn < 10%.
- **Security & Governance:** 0 criticals; SBOM on `v1.12.0`; access reviews completed; schema approvals enforced; ER audit coverage ≥ 98%.

---

## 1) Objectives (Demo on Apr 16)
1. **Conversions Operationalized:** both production tenants through migration, Day‑2 ops, and success plans with weekly scorecards.
2. **Playbooks GA:** save/share/run with ACLs, params, schedules, exports; approval/audit linkage.
3. **ServiceNow Incident Connector GA:** rate‑limited, monitored, with CI contract tests and DLQ auto‑replay policy.
4. **Threat Intel v5:** enrichment **confidence scoring**, **suppression rules** (noise control), and cost quotas with tenant budgets.
5. **Governance & Hygiene:** access reviews, policy coverage report, backup/restore drill, schema approval workflow enforced for prod.
6. **Customer Evidence:** reference case (anon or named) v2 + 2× 60‑sec demo clips; NPS collection in‑product.
7. **GTM Scale:** ABM wave‑3, webinar follow‑through to pilots, partner co‑sell calendar for Q2.

---

## 2) Scope & Priority
- **P0 (Must):** Production ops acceptance, Playbooks GA (ACLs + scheduler), ServiceNow GA, TI scoring/suppression + budgets, access reviews + backup drill, policy coverage report, NPS in‑app, reference v2.
- **P1 (Should):** Audit export automation, connector SLOs per tenant, analytics v5 (playbook adoption + cost), marketplace install telemetry improvements.
- **P2 (Could):** Map auto‑binning; SDK snippet generator for playbooks; cost anomaly RCA notes.
- **Won’t:** Payment processing; FedRAMP authorization; active‑active multi‑region.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Conversions ops acceptance, reference case v2, ABM wave‑3, webinar follow‑ups, partner calendar.
- **Frontend:** Playbooks GA (ACLs, scheduler UI), report annotations polish, NPS widget, analytics v5.
- **Backend:** Playbooks scheduler/runner, ServiceNow GA hardening, TI scoring/suppression, audit export automation, policy coverage service.
- **Data/ETL:** ServiceNow mappings & fixtures, enrichment scoring datasets, schema approvals tooling.
- **SecEng:** Access review process, OPA policy coverage tests, backup/restore drill plan & evidence, DPIA updates.
- **SRE:** Release `v1.12.0`, connector SLOs, DLQ auto‑replay, budgets/quotas, dashboards v5, backup drill execution.

---

## 4) Backlog (Stories & Tasks)

### P0 — Conversions Operationalized
- **P0‑1** Day‑2 Ops Sign‑off (owner: SRE/Product)
  - On‑call, quotas/budgets, backup cadence, runbooks acknowledged by both tenants.
- **P0‑2** Weekly Scorecards (owner: Product/SRE)
  - TTI, usage, incidents, policy hits; shared MD/PDF to execs.

### P0 — Playbooks GA
- **P0‑3** ACLs & Sharing (owner: FE/SecEng)
  - Role/tenant scoped; audit on run; link tokens with expiry.
- **P0‑4** Scheduler & Runner (owner: BE/SRE)
  - CRON‑like; per‑tenant limits; failure alerts; results export.
- **P0‑5** Export & Annotation (owner: FE/BE)
  - Include inline highlights & provenance; PDF/MD; respects redaction & branding.

### P0 — ServiceNow Incident Connector GA
- **P0‑6** Contract Tests & Fixtures (owner: BE/Data)
  - CI matrix for endpoints; schema changes caught; sample payloads.
- **P0‑7** DLQ Auto‑replay (owner: SRE)
  - Safe windows; idempotent replay; alerting.
- **P0‑8** Health SLOs (owner: SRE)
  - Latency/error panels; alert thresholds; pager wiring.

### P0 — Threat Intel v5
- **P0‑9** Confidence Scoring (owner: Data/BE)
  - Score model; thresholds; display in UI; exportable.
- **P0‑10** Suppression Rules (owner: BE)
  - Noise filters by type/source/score; audit of suppressions; toggle per tenant.
- **P0‑11** Quotas & Budgets (owner: SRE/BE)
  - Monthly caps; 80% notify, 100% block; override path; logs.

### P0 — Governance & Hygiene
- **P0‑12** Access Reviews (owner: SecEng)
  - Quarterly review; generate report; revoke stale access.
- **P0‑13** Policy Coverage Report (owner: SecEng/BE)
  - % of endpoints covered by OPA; gaps & plan; publish.
- **P0‑14** Backup/Restore Drill (owner: SRE)
  - Snapshot + restore; checksum; RTO/RPO recorded; after‑action.
- **P0‑15** Schema Approval Enforcement (owner: BE/FE)
  - Block ingest in prod until approved; audit & override with reason.

### P0 — Customer Evidence & NPS
- **P0‑16** Reference Case v2 (owner: GTM/Product)
  - Situation→Approach→Results; quotes/screens; legal ok.
- **P0‑17** In‑App NPS (owner: FE/BE)
  - Prompt post‑report export or week 3; store score & verbatim; export.

### P1 — Analytics & Telemetry
- **P1‑1** Analytics v5 (owner: FE/SRE)
  - Playbook adoption by persona; cost/usage overlays; export CSV.
- **P1‑2** Marketplace Telemetry (owner: BE)
  - Install→enable→first insight events; channel tagging.
- **P1‑3** Audit Export Automation (owner: BE)
  - Presets; scheduled dumps; secure delivery.

---

## 5) Acceptance Criteria & DoD
- **Production tenants:** both conversions have Day‑2 ops sign‑off; weekly scorecards sent; SLOs green.
- **Playbooks GA:** ACLs enforced; schedules run; alerts on failure; exports include annotations & provenance.
- **ServiceNow GA:** contract tests pass; SLO panels active; DLQ auto‑replay functioning; throttling verified.
- **TI v5:** confidence scores visible; suppression reduces low‑value indicators ≥ 50% on test; budgets enforced.
- **Governance:** access review report delivered; policy coverage report published; backup drill evidence recorded; schema approvals enforced.
- **Evidence & NPS:** reference case v2 drafted & internally approved; NPS collected from ≥ 10 users; average ≥ 40.
- **GTM:** ABM wave‑3 sent; ≥ 20 qualified meetings tied to webinar/pipeline; partner calendar published.

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily  
- **Mid‑sprint demo:** Apr 9, 15:00 MT  
- **Code freeze:** Apr 15, 12:00 MT  
- **Review & demo:** Apr 16, 15:00 MT  
- **Retro:** Apr 16, 16:00 MT

---

## 7) Metrics
- **Business:** ARR commit, meetings booked, pilots signed, NPS.
- **Product:** playbook saves/runs, export count, TI suppression %, ServiceNow SLOs.
- **Ops:** error budget, ingest success %, backup RTO/RPO, access revocations.

---

## 8) Deliverables (Repos & Docs)
- `docs/ops/day2_signoffs/{tenantA.md,tenantB.md}` + `docs/gtm/scorecards/{tenantA.md,tenantB.md}`
- `server/src/playbooks/{acl.ts,scheduler.ts,runner.ts}` + `client/src/features/playbooks/ga/*`
- `ingestion/connectors/servicenow/tests/*` + `ops/dlq/auto_replay.yaml` + `ops/dashboards/connector_servicenow_slo.json`
- `server/src/ti/{confidence_scoring.ts,suppression.ts,quotas.ts}`
- `docs/security/{access_review_Q2_2026.md,policy_coverage_report.md}`
- `ops/backups/{drill_plan.md,drill_results.md}`
- `server/src/ingestion/approvals_guard.ts` + `client/src/admin/registry/approvals/guard.tsx`
- `docs/case_studies/{reference_v2.md}` + `client/src/ux/nps/*`
- `client/src/admin/analytics/v5/*` + `server/src/telemetry/marketplace_events.ts`
- `CHANGELOG_sprint-2026-04-02.md`

---

## 9) Demo Script (Apr 16)
1. Review production tenant scorecards & SLOs; show Day‑2 sign‑offs.
2. Run a scheduled playbook; failure alert demo; export annotated report.
3. Show ServiceNow GA: contract tests, SLO panel, DLQ auto‑replay.
4. Demo TI confidence & suppression; budget threshold behavior.
5. Present access review & policy coverage reports; backup drill results.
6. Share reference case v2 & NPS snapshot; walk ABM wave‑3 calendar and meeting tally.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 16, 2025 (v1.12.0 plan)
```

