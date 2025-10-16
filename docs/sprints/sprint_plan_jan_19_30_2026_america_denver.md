# Sprint Plan — Jan 19–30, 2026 (America/Denver)

> **Context:** Second sprint of 2026. U.S. **MLK Day (Mon Jan 19)** reduces capacity. Build on v1.2/2.0 foundations: _policy safety assistant_, _graph scenarios_, _SOAR v2.0 beta_, and _intel v5.1_.

---

## 1) Sprint Goal (SMART)

Release **Policy Intelligence v1.3** (assistant + drift prevention rules), **Graph UI v2.1** (scenario saving, lateral‑movement heatmap, chokepoint remediation templates), **SOAR v2.0 Beta** (autoscaling runners, Queues v2, approval dashboard integration), and **Intel v5.1** (active‑learning cadence + annotator scoring + federation expansion) to achieve **MTTC P50 ≤ 9 min / P90 ≤ 22 min** and **auto‑approved actions ≥ 30%** (low‑risk only) — **by Jan 30, 2026**.

**Key outcomes**

- Policy assistant proposes safe guardrails with human‑readable **risk explanations**; drift‑prevention rules block unsafe merges.
- Graph supports saved **investigation scenarios**, **lateral‑movement heatmap**, and out‑of‑the‑box **remediation templates**.
- SOAR v2.0 Beta delivers **runner autoscaling**, **Queues v2** with idempotency, and **approval dashboard** (HITL) integration.
- Intel v5.1 scales **active‑learning cadence**, adds **annotator quality scoring**, and expands partner federation to **15% sample** under guardrails.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC P50 ≤ 9 min; P90 ≤ 22 min (7‑day rolling).  
  _Verify:_ Incident dashboard; export.
- **Policy safety:** Drift‑prevention rules catch ≥ 80% of high‑risk changes in backtests; **zero** critical authz escapes.  
  _Verify:_ Backtests; CI gate logs; audit.
- **Automation adoption:** ≥ 30% of eligible actions auto‑approved (low‑risk); **false‑allow = 0** in prod.  
  _Verify:_ SOAR logs; simulation reports.
- **Graph effectiveness:** ≥ 70% of P1/P2 investigations use scenarios or heatmap; remediation templates invoked in ≥ 50% of those.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ (inter‑annotator) ≥ 0.82; Brier ≤ 0.14 on canary; override rate ≤ 8%.  
  _Verify:_ Eval reports; sampling.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Intelligence v1.3:** natural‑language risk explanations; drift‑prevention ruleset (deny patterns + safe defaults); assistant suggestions inline with acceptance telemetry; simulator updates.
- **Graph UI v2.1:** scenario saving/loading; lateral‑movement heatmap from identity/asset graph; remediation templates (owner handoffs, SOAR links).
- **SOAR v2.0 Beta:** runner autoscaling (HPA/queue‑driven), Queues v2 (exactly‑once semantics), approval dashboard integration (HITL with SLAs), safety counters.
- **Intel v5.1:** weekly AL cadence; annotator quality scoring & coaching; partner federation expansion (15% sample) with isolation and cost caps; export to detections (gated).
- **Operational analytics:** adoption widgets for assistant, scenarios, approvals; automation reliability; intel calibration.

**Stretch:**

- **Responder Copilot v0.4 (alpha):** tie policy assistant + graph scenarios to suggest next steps (read‑only).
- **SOAR cost dashboard:** per‑action/vendor cost estimates; budget alerts.
- **Graph what‑if ACL changes:** show risk delta before policy merges.

**Out‑of‑scope:**

- Destructive actions default‑on; customer‑visible ABAC editor; cross‑tenant playbooks.

---

## 4) Team & Capacity (holiday‑adjusted)

- **Working days:** 9 (MLK Day observed Mon Jan 19).
- **Focus factor:** 0.8.
- **Nominal ~50 pts → commit ≈ **36 pts** (+ up to 6 pts stretch).**

---

## 5) Backlog (Ready for Sprint)

### Epic AT — Policy Intelligence v1.3 (11 pts)

- **AT1 — Risk explanations + UX** (4 pts)  
  _AC:_ highlight blast radius, precedent incidents; copy reviewed.
- **AT2 — Drift‑prevention ruleset** (5 pts)  
  _AC:_ deny patterns; safe defaults; CI gate; kill‑switch.
- **AT3 — Assistant acceptance telemetry** (2 pts)  
  _AC:_ capture accept/modify/reject; dashboard.

### Epic AU — Graph UI v2.1 (10 pts)

- **AU1 — Scenario saving/loading** (4 pts)  
  _AC:_ name, share, permissions; freshness banner.
- **AU2 — Lateral‑movement heatmap** (4 pts)  
  _AC:_ hop limit; identity edges; export.
- **AU3 — Remediation templates** (2 pts)  
  _AC:_ top chokepoint fixes; owner handoff; ticket export.

### Epic AV — SOAR v2.0 Beta (11 pts)

- **AV1 — Runner autoscaling** (4 pts)  
  _AC:_ queue‑driven scale; SLOs; soak test.
- **AV2 — Queues v2 (exactly‑once)** (4 pts)  
  _AC:_ idempotency keys; retries; poison queue.
- **AV3 — Approval dashboard integration** (3 pts)  
  _AC:_ SLAs; audit trail; filters.

### Epic AW — Intel v5.1 (6 pts)

- **AW1 — Active‑learning cadence + scoring** (3 pts)  
  _AC:_ per‑annotator metrics; coaching prompts; weekly loop.
- **AW2 — Federation expansion (15% sample)** (3 pts)  
  _AC:_ isolation; PII filters; cost caps; canary.

### Epic AX — Operational Analytics (2 pts)

- **AX1 — Adoption & reliability panels** (2 pts)  
  _AC:_ assistant/scenario/auto‑approve widgets; intel calibration; export.

> **Planned:** 40 pts total — **commit 36 pts**, hold 4 pts buffer; + up to 6 pts stretch.

---

## 6) Dependencies & Assumptions

- CI gate for drift rules wired; approver groups defined.
- Graph data (identity + asset) fresh ≤ 24h; permissions enforced.
- Queue store supports exactly‑once semantics; autoscaling infra ready.
- Partner legal/compliance sign‑off for 15% sample; budget alerts configured.

---

## 7) Timeline & Ceremonies (MT)

- **Tue Jan 20** — Planning & Kickoff; safety review (30m).
- **Fri Jan 23** — Mid‑sprint demo/checkpoint (30m).
- **Wed Jan 28** — Grooming for next sprint (45m).
- **Fri Jan 30** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policy rules cataloged; datasets available; flags/telemetry named.
- Queue/autoscaling quotas approved; dashboard integration points validated.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; approvals configured; audits wired.
- Runbooks updated; enablement notes posted; rollback verified.

---

## 10) QA & Validation Plan

- **Policy:** backtests; CI gate simulation; human review of top 20 suggested guardrails.
- **Graph:** scenario correctness sampling; heatmap sanity checks; remediation export e2e.
- **SOAR:** autoscaling load test; exactly‑once chaos test; approval SLA timing.
- **Intel:** κ tracking; canary metrics vs v4.1; cost monitor alerts.

---

## 11) Risk Register (RAID)

| Risk                                 | Prob. | Impact | Owner | Mitigation                               |
| ------------------------------------ | ----- | -----: | ----- | ---------------------------------------- |
| Drift rules block legitimate changes | Med   |    Med | AT2   | Previews; exception path; audit          |
| Scenario sharing leaks data          | Low   |   High | AU1   | Permissions; redaction; audit            |
| Queue bugs cause duplicates          | Low   |   High | AV2   | Idempotency; poison queue; alarms        |
| Federation expansion costs spike     | Med   |    Med | AW2   | Rate caps; budget alerts; off‑peak       |
| Approval SLAs missed                 | Med   |    Med | AV3   | Paging; load balancing; backup reviewers |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; auto‑approve rate; intel calibration; approval SLAs.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- Scenario artifacts scrubbed on export; tenant boundaries enforced.
- SOAR destructive steps always HITL; approvals logged with reason codes.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → select tenants (if applicable).
- **Rollback:** Disable drift rules; hide scenarios/heatmap; revert Queues v2; scale runners to safe baseline; pin intel to v5.0.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Feb 2–13, 2026)

- **Policy v1.4:** policy suggestion assistant GA; risk explanations with examples.
- **Graph v2.2:** scenario diffs + recommended controls rollout; exposure time series.
- **SOAR v2.0 GA prep:** throughput targets, quota policies, blue/green runners.
- **Intel v5.2:** disagreement detection; reviewer routing; expanded federation.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
