```markdown
# Sprint Plan — Summit / IntelGraph / Maestro Conductor
**Slug/Version:** `sprint-2025-11-14-intelgraph-summit-v1.3.0`
**Dates:** Nov 14–Nov 28, 2025 (2 weeks, US Thanksgiving Nov 27)
**Timezone:** America/Denver

> Focus: **Pilot → Production**. Convert at least one active pilot to production (limited-scope) with reliability SLOs, on-call rotation, incident runbooks, data retention controls, and governance reviews. Maintain golden path and secure-by-default posture.

---

## 0) North‑Star & Guardrails
- **North‑Star:** 1 production tenant live with signed MSA/SOW and **30‑day success plan**.
- **SLOs (initial):**
  - API availability **≥ 99.5%** (rolling 30d)
  - Read path latency **P95 ≤ 300 ms**, write/ingest **P95 ≤ 1.5 s**
  - Policy decision **P95 ≤ 10 ms**
- **Security:** **0 criticals** in CI; SBOM on tag; audit log tamper‑evidence verified.

---

## 1) Objectives (Demo on Nov 28)
1. **Production Readiness Pack:** runbooks (IR/BC/DR), on‑call, paging, dashboards, synthetic checks.
2. **Data Governance:** retention & purge jobs; legal hold; export/subject access workflow (for enterprise pilot).
3. **Multi‑tenant Hardening:** per‑tenant quotas, rate limits, namespace isolation checks; report branding (P1).
4. **Performance & Scale:** 1M event ingest target; backpressure tuning; HOT query cache.
5. **Contracts & Compliance:** production MSA/SOW pack, DPA executed, DPIA signed, updated evidence (SOC‑like guardrails, SSDF v1.1 mapping).
6. **GTM:** production pricing, ramp plan, reference capture, and customer success plan ready.

---

## 2) Scope & Priorities
- **P0 (Must):** IR/BC/DR runbooks + on‑call; synthetic monitors; retention/purge; quotas & limits; ingest scale test; production contract pack.
- **P1 (Should):** HOT query cache; legal hold; subject export; report branding; relevance feedback analytics.
- **P2 (Could):** Read replicas profile; HA notes for future; incident drill tabletop.
- **Won’t:** Full SOC 2 audit; FedRAMP ATO; multi‑region active‑active.

---

## 3) Swimlanes & Owners
- **Product/GTM (Felix):** Pricing & MSA/SOW pack, success plan, reference case, comms.
- **Frontend:** Export polish, report branding, usage notices, feedback analytics view.
- **Backend:** Retention/purge services, legal hold, subject data export, HOT query cache, audit search filters.
- **Data/ETL:** 1M event ingest test harness, DLQ inspector UI, backpressure tuning.
- **SecEng:** IR/BC/DR playbooks, privacy/DPA checks, policy coverage tests, redaction QA.
- **SRE:** On‑call setup, pager wiring, synthetic checks, dashboards v3, quotas/rate limits, load test rig.

---

## 4) Backlog (Stories & Tasks)

### P0 — Production Readiness
- **P0‑1** On‑Call & Paging (owner: SRE)
  - Escalation policy; quiet hours; runbook links; test page.
- **P0‑2** Synthetic Monitors (owner: SRE)
  - Golden-path probe (login → search → entity fetch); policy decision probe.
- **P0‑3** Dashboards v3 (owner: SRE)
  - SLO burn charts; top offenders; connector health; DLQ size.
- **P0‑4** IR/BC/DR Runbooks (owner: SecEng/SRE)
  - Incident severities; roles; comms templates; backup/restore.

### P0 — Data Governance
- **P0‑5** Retention & Purge Jobs (owner: BE)
  - Per‑tenant retention config; soft‑delete → purge pipeline; audit entry.
- **P0‑6** Legal Hold (owner: BE)
  - Freeze entities/edges; prevent purge; log reason & owner.
- **P0‑7** Subject Access/Export (owner: BE/FE)
  - Export package (JSON + CSV) with provenance; access logged.

### P0 — Multi‑tenant Hardening
- **P0‑8** Quotas & Rate Limits (owner: SRE/BE)
  - Per‑tenant: QPS, concurrent jobs, storage GB; 429s with headers; admin UI.
- **P0‑9** Namespace Isolation Check (owner: SRE)
  - Preflight tests to ensure tenant boundary; automated in CI.

### P0 — Performance & Scale
- **P0‑10** 1M Event Ingest (owner: Data)
  - Harness to load 1M events; track throughput; ensure backpressure stable.
- **P0‑11** Connector Tuning (owner: Data)
  - Token buckets; batch sizing; DLQ auto‑replay controls.

### P0 — Contracts & Compliance
- **P0‑12** Production Contract Pack (owner: Product/GTM)
  - MSA, SOW (prod), DPA, DPIA, Security Addendum; redlines checklist.
- **P0‑13** Evidence Pack v3 (owner: SecEng/Product)
  - Updated SBOM, SSDF mapping, policy logs, SLO screenshots, synthetic checks output.

### P1 — UX & Analytics
- **P1‑1** HOT Query Cache (owner: BE)
  - TTL + invalidation on writes; hit rate panel.
- **P1‑2** Report Branding (owner: FE)
  - Logo/footer per tenant; export respects branding.
- **P1‑3** Feedback Analytics (owner: FE/BE)
  - Aggregate thumbs up/down; filter by dataset; export CSV.

### P2 — Hardening Extras
- **P2‑1** Read Replicas Profile (owner: SRE)
  - Doc + terraform variable stubs; not enabled by default.
- **P2‑2** Incident Tabletop (owner: SecEng)
  - 60‑minute drill; after‑action report.

---

## 5) Acceptance Criteria & DoD
- **Production readiness:** paging works; synthetic checks green; dashboards show SLOs; IR/BC/DR runbooks reviewed.
- **Governance:** retention runs on schedule; purge produces audit records; legal hold prevents purge; subject export downloadable.
- **Multi‑tenant:** quotas enforced; 429s logged; isolation preflight passes in CI.
- **Performance:** 1M ingest completes; no data loss; P95s within targets; DLQ < 0.5% of events.
- **Contracts:** MSA/SOW/DPA/DPIA pack ready; at least one customer at redline/approval stage.
- **GTM:** success plan agreed with pilot; reference quotes captured (draft).

---

## 6) Cadence & Dates
- **Standup:** 09:30 MT daily  
- **Mid‑sprint demo:** Nov 21, 15:00 MT  
- **Code freeze:** Nov 27, 12:00 MT (adjust for holiday)  
- **Review & demo:** Nov 28, 15:00 MT  
- **Retro:** Nov 28, 16:00 MT

---

## 7) Metrics
- **Reliability:** availability %, error budget, pages per week, MTTR.
- **Perf:** API read P95, ingest throughput, policy P95, cache hit rate.
- **Data Gov:** purges executed, holds active, export requests served.
- **GTM:** SOW/MSA status, pilot→prod conversion, reference artifacts collected.

---

## 8) Deliverables (Repos & Docs)
- `ops/synthetics/{golden_path_check.ts,policy_probe.ts}`
- `ops/dashboards/v3/*`
- `docs/runbooks/{incident_response.md,bcdr.md}`
- `server/src/governance/{retention.ts,legal_hold.ts,subject_export.ts}`
- `ops/quota/{rate_limits.yaml,tenant_quotas.json}`
- `ingestion/tools/load_1m_events.ts`
- `docs/contracts/{MSA.md,SOW_production.md,DPA.md,DPIA.md,Security_Addendum.md}`
- `docs/evidence/v3/*`
- `client/src/features/report/branding/*`
- `CHANGELOG_sprint-2025-11-14.md`

---

## 9) Week Plan
**Week 1 (Nov 14–Nov 20):** On‑call/paging, synthetics, retention/purge, quotas, ingest harness, contract pack draft.  
**Week 2 (Nov 21–Nov 28):** Legal hold, subject export, HOT cache, dashboards v3, evidence v3, demo polish, close production contract.

---

## 10) Demo Script (Nov 28)
1. Trigger synthetic checks; show dashboards & SLO burn.
2. Load 1M events; watch throughput, DLQ, backpressure.
3. Run subject export; show provenance in bundle.
4. Apply legal hold; attempt purge → blocked; audit entry.
5. Show quotas in action (rate‑limit 429 with headers), then admin bump.
6. Export branded report; show contract pack ready.

---

**Owner:** Felix (The B.I.Z.) — VP Sales/BD/Growth  
**Last Updated:** Oct 6, 2025 (v1.3.0 plan)
```

