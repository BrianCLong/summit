# Sprint Plan — Dec 1–12, 2025 (America/Denver)

> **Context:** Seventh sprint. Post‑holiday cadence; stabilize and push analyst efficiency. Emphasis on _policy intelligence_, _graph‑assisted investigations_, _automation governance_, and _model quality_.

---

## 1) Sprint Goal (SMART)

Ship **Policy Intelligence v1.1** (learned weights + rule suggestions), **Graph UI v1.1** (attack‑path scoring + remediation hints), **SOAR v1.5** (graph‑aware batching, per‑tenant quotas, HITL dashboard), and **Intel v4.1** (active‑learning cadence + annotator quality) to drive **MTTC P50 ≤ 12 min / P90 ≤ 30 min** and **Analyst Action Adoption ≥ 85%** — **by Dec 12, 2025**.

**Key outcomes**

- Policy change‑risk scoring upgraded with learned weights; assistant suggests guardrails before apply.
- Graph panel ranks attack paths and proposes remediations with owner handoffs.
- SOAR enforces per‑tenant quotas + batching; live HITL queue for approvals; improved safety metrics.
- Intel v4.1 standardizes weekly retraining cadence; annotator agreement ≥ 0.8 (Cohen’s κ) on samples.

---

## 2) Success Metrics & Verification

- **MTTC:** P50 ≤ 12 min; P90 ≤ 30 min (rolling 7‑day).  
  _Verify:_ Incident dashboard; export.
- **Policy safety:** Backtest AUC ≥ 0.82; suggestion acceptance ≥ 60%; 0 critical misconfigs.  
  _Verify:_ Change logs; offline eval.
- **Graph effectiveness:** Analysts use remediation hints in ≥ 60% of P1/P2 cases; mean time‑to‑context ↓ 35%.  
  _Verify:_ UI telemetry; survey.
- **Automation governance:** Quota breaches = 0; SOAR success ≥ 93%; approvals SLA P95 ≤ 5 min.  
  _Verify:_ SOAR run logs; HITL dashboard.
- **Intel quality:** κ ≥ 0.8 on inter‑annotator; Brier ≤ 0.15; override rate ≤ 9%.  
  _Verify:_ Label audits; eval report.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Intelligence v1.1:** learned weights (logistic/GBM) over risk factors; what‑if simulator; rule suggestions; pre‑commit checks; rollback.
- **Graph UI v1.1:** attack‑path scoring (risk weighted); remediation hints library; owner/contact inline; export action to ticket.
- **SOAR v1.5:** graph‑aware batching (grouping by entity/tenant), per‑tenant quotas, HITL reviewer dashboard (queue, SLAs), safety counters.
- **Intel v4.1:** weekly active‑learning cadence, annotator quality metrics (κ, disagreement), sampling UI improvements; gated deploy.
- **Operational analytics:** adoption widgets (quick actions, hints usage), quota dashboards, policy risk trend.

**Stretch:**

- **Responder Copilot (alpha):** promptable runbooks for top 3 incident types (read‑only suggestions).
- **Graph UI: path diffing** between time ranges.
- **SOAR: multi‑region runners** (standby failover).

**Out‑of‑scope:**

- Online training in prod; destructive SOAR actions default‑on; customer‑facing policy editor.

---

## 4) Team & Capacity

- Same roster; **commit 40 pts** (≈50 nominal × 0.8 focus).

---

## 5) Backlog (Ready for Sprint)

### Epic AF — Policy Intelligence v1.1 (12 pts)

- **AF1 — Learned weights + calibration** (5 pts)  
  _AC:_ model registry; AUC ≥ 0.82; reliability diagram; rollback.
- **AF2 — What‑if simulator & pre‑commit checks** (4 pts)  
  _AC:_ show blast radius; conflicting rules; required approvals.
- **AF3 — Suggestion engine** (3 pts)  
  _AC:_ top‑N guardrails; acceptance telemetry; audit.

### Epic AG — Graph UI v1.1 (10 pts)

- **AG1 — Attack‑path scoring** (4 pts)  
  _AC:_ weighted by exposure/criticality; top‑3 surfaced.
- **AG2 — Remediation hints + owner handoff** (4 pts)  
  _AC:_ hint library; owner lookup; ticket export.
- **AG3 — UX polish** (2 pts)  
  _AC:_ loading states; freshness banner; PNG export.

### Epic AH — SOAR v1.5 (12 pts)

- **AH1 — Graph‑aware batching + quotas** (5 pts)  
  _AC:_ per‑tenant limits; queue saturation tests; alerts.
- **AH2 — HITL reviewer dashboard** (4 pts)  
  _AC:_ SLA timers; filters; audit trail.
- **AH3 — Safety counters & reports** (3 pts)  
  _AC:_ false‑allow = 0; per‑action metrics; weekly report.

### Epic AI — Intel v4.1 (6 pts)

- **AI1 — Active‑learning cadence + sampling** (3 pts)  
  _AC:_ weekly schedule; stratified sampling; drift checks.
- **AI2 — Annotator quality & disagreement** (3 pts)  
  _AC:_ κ ≥ 0.8; disagreement review queue; coach marks.

> **Planned:** 40 pts commit + 6 pts stretch bucket.

---

## 6) Dependencies & Assumptions

- Policy logs + attributes available; legal review for suggestions that affect access.
- Owner directory authoritative (CMDB/HRIS); ticketing integration available.
- SOAR vendor quotas documented; queue store reliable; on‑call bandwidth for HITL.
- Sufficient labeled intel data; privacy review complete.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Dec 1** — Planning & Kickoff; policy model review (30m).
- **Fri Dec 5** — Mid‑sprint demo/checkpoint (30m).
- **Wed Dec 10** — Grooming for next sprint (45m).
- **Fri Dec 12** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Model features and risk factors documented; datasets ready.
- Integration points (ticketing, owner directory) validated; flags/telemetry named.

## 9) Definition of Done (DoD)

- Tests pass (unit/integration); dashboards live; approvals configured.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Policy:** offline AUC; reliability plots; change simulations; 10 prod‑like dry‑runs.
- **Graph:** sampled path accuracy; hint usefulness survey; ticket export e2e test.
- **SOAR:** quota breach simulations; queue soak test; reviewer SLA timing.
- **Intel:** κ measurement on blind set; canary comparison v3/v4.1; override rate tracking.

---

## 11) Risk Register (RAID)

| Risk                        | Prob. | Impact | Owner | Mitigation                                     |
| --------------------------- | ----- | -----: | ----- | ---------------------------------------------- |
| Learned weights overfit     | Med   |    Med | AF1   | Cross‑val; regularization; rollback            |
| Owner mapping stale         | Med   |    Med | AG2   | Freshness banner; manual override; sync alerts |
| Quotas block urgent actions | Low   |   High | AH1   | Break‑glass bypass; on‑call escalation         |
| Reviewer SLA misses         | Med   |    Med | AH2   | Paging; load balancing; secondary reviewer     |
| Annotation quality dips     | Med   |    Med | AI2   | Training; consensus; spot checks               |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, policy risk trend, graph adoption, quota incidents, κ & Brier, MTTC.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- SOAR approvals enforced; destructive actions require HITL; simulation before prod.
- Graph remains read‑only; export sanitized.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → select tenants (if applicable).
- **Rollback:** Disable learned weights & suggestions; hide Graph hints; revert SOAR quotas/batching; pin Intel v4.0.
- **Docs:** Release notes; analyst changelog; customer comms as needed.

---

## 15) Next Sprint Seeds (Dec 15–23)

- **Holiday mode:** capacity‑aware maintenance sprint; reliability, debt burn‑down, docs sprint.
- **Responder Copilot v0.2:** playbook reasoning + trace; safe command generation (no auto‑exec).
- **Graph UI v1.2:** path diffing, chokepoint detection, recommended controls.

---

_Prepared by: Covert Insights — last updated Sep 7, 2025 (America/Denver)._
