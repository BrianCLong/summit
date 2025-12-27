# Sprint Plan — Mar 2–13, 2026 (America/Denver)

> **Context:** Fifth sprint of 2026. Consolidate GA releases from February and push toward proactive prevention, cheaper/safer automation, and repeatable investigation workflows.

---

## 1) Sprint Goal (SMART)

Release **Policy Intelligence v1.6 (Proactive Prevention GA)**, **Graph UI v2.4** (scenario templates, control rollout tracking, exposure KPI pages), **SOAR v2.2** (dry‑run simulator GA + quota‑by‑risk + cost v1.1), and **Intel v5.4** (semi‑supervised uplift + federation 50%) to reach **MTTC P50 ≤ 7.0 min / P90 ≤ 17 min** and **auto‑approved low‑risk actions ≥ 50%** with **false‑allow = 0** — **by Mar 13, 2026**.

**Key outcomes**

- Policy prevention blocks risky merges pre‑commit with clear explanations and safe alternatives.
- Graph provides reusable **scenario templates** and **control rollout trackers** tied to remediation SLAs; exposure KPIs by entity/team.
- SOAR dry‑run simulator GA enables cost/impact previews; quotas enforced **by risk level** with budget/cost telemetry v1.1.
- Intel v5.4 improves precision/recall with semi‑supervised learning; partner federation broadened to **50% sample** under guardrails.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 7.0 min**, **P90 ≤ 17 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy prevention efficacy:** Blocks **≥ 85%** of high‑risk changes in backtests; suggestion acceptance **≥ 70%**; **0** critical authz escapes.  
  _Verify:_ CI gate logs; audit; offline eval.
- **Automation adoption & safety:** **≥ 50%** of eligible actions auto‑approved (low‑risk only); **false‑allow = 0** in prod.  
  _Verify:_ SOAR logs; simulation reports.
- **Graph adoption:** **≥ 80%** of P1/P2 investigations use templates or rollout tracking; KPI pages viewed weekly by **≥ 75%** of analysts.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.85**; Brier **≤ 0.12** on canary; override rate **≤ 7%**.  
  _Verify:_ Eval reports; sampling.
- **Cost governance:** Cost captured for **≥ 95%** automated actions; budget breach alerts **= 0**.  
  _Verify:_ Cost dashboard; alert logs.

---

## 3) Scope

**Must‑have (commit):**

- **Policy v1.6 (Prevention GA):** pre‑commit simulations on submit; proactive guardrails default‑on; example‑based explanations; exception workflow with approvals; safety/kill‑switch; telemetry.
- **Graph v2.4:** reusable scenario **templates**; **control rollout tracking** (ticket status, SLA timers); **exposure KPI pages** (entity/team); performance tuning; permissions/audit.
- **SOAR v2.2:** **dry‑run simulator GA** (cost + impact preview per playbook); **quota‑by‑risk** policies; **cost dashboard v1.1** (accuracy sampling, per‑action/vendor/tenant trends); resiliency polish.
- **Intel v5.4:** semi‑supervised improvements (consistency regularization/weak‑label voting); disagreement detection v2; reviewer routing refinements; **federation 50%** sample (guarded); calibration monitoring.
- **Operational analytics:** exec weekly snapshot automations; adoption widgets; SLA panels (policy reviews, control rollouts, approvals).

**Stretch:**

- **Responder Copilot v0.6 (alpha):** guided next steps combining prevention + graph templates (read‑only).
- **SOAR cost optimizer (proto):** recommend cheaper equivalent actions when risk allows.
- **Graph KPI exports:** scheduled PDF/email to owners.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant playbooks; external policy editor.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal); keep ~10% slack for interrupts.

---

## 5) Backlog (Ready for Sprint)

### Epic BI — Policy Intelligence v1.6 (Prevention GA) — **12 pts**

- **BI1 — Pre‑commit simulation & guardrails default‑on** (5 pts)  
  _AC:_ risk preview; block unsafe; exception flow; audit; kill‑switch.
- **BI2 — Example‑based explanations** (4 pts)  
  _AC:_ past incident links; expected blast radius; copy reviewed.
- **BI3 — Telemetry & governance** (3 pts)  
  _AC:_ acceptance/override metrics; owner dashboards; alerts.

### Epic BJ — Graph UI v2.4 — **10 pts**

- **BJ1 — Scenario templates** (4 pts)  
  _AC:_ create/share; permissions; freshness banner; export.
- **BJ2 — Control rollout tracking** (4 pts)  
  _AC:_ ticket linkage; SLA timers; status board.
- **BJ3 — Exposure KPI pages** (2 pts)  
  _AC:_ entity/team trends; CSV/PDF export.

### Epic BK — SOAR v2.2 — **12 pts**

- **BK1 — Dry‑run simulator GA** (5 pts)  
  _AC:_ cost/impact preview; safety checks; replay mode; logs.
- **BK2 — Quota‑by‑risk + policies** (4 pts)  
  _AC:_ thresholds per risk; breach handling; reports.
- **BK3 — Cost v1.1 + resiliency** (3 pts)  
  _AC:_ accuracy sampling; trend panels; alarms.

### Epic BL — Intel v5.4 — **6 pts**

- **BL1 — Semi‑supervised uplift** (3 pts)  
  _AC:_ method docs; eval lift vs v5.2; registry v5.4.
- **BL2 — Federation 50% (guarded)** (3 pts)  
  _AC:_ isolation; PII filters; budget caps; canary→GA; calibration.

### Epic BM — Operational Analytics & Enablement — **2 pts**

- **BM1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- CI gate active with exception workflow; approver groups staffed.
- Graph data fresh ≤ 24h; permissions enforced; ticketing integration reliable.
- Queue store/idempotency solid; autoscaling quotas approved; cost telemetry mapped.
- Partner legal/privacy approvals current; budget alerts set; federation traffic isolated.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Mar 2** — Planning & Kickoff; prevention GA safety review (30m).
- **Fri Mar 6** — Mid‑sprint demo/checkpoint (30m).
- **Wed Mar 11** — Grooming for next sprint (45m).
- **Fri Mar 13** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policy catalogs & risk factors documented; datasets ready; flags/telemetry named.
- Template set defined; ticket fields mapped; SLA targets agreed.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Policy:** A/B acceptance; backtests; CI gate simulations; exception flow audit.
- **Graph:** template correctness sampling; rollout tracker e2e (tickets/SLA); KPI calculations spot‑checks.
- **SOAR:** simulator accuracy sampling; quota breach drills; chaos on queues/runners; cost accuracy vs invoices.
- **Intel:** κ/Brier monitoring; override rate; reviewer SLA; budget alerts.

---

## 11) Risk Register (RAID)

| Risk                                 | Prob. | Impact | Owner | Mitigation                                  |
| ------------------------------------ | ----- | -----: | ----- | ------------------------------------------- |
| Prevention blocks legitimate changes | Med   |    Med | BI1   | Previews; exception path; audits            |
| Template misuse leaks data           | Low   |   High | BJ1   | Permissions; redaction; audit               |
| Cost telemetry inaccuracies          | Med   |    Med | BK3   | Reconciliation; thresholds; alerts          |
| Federation privacy/cost issues       | Low   |    Med | BL2   | Isolation; PII filters; budget caps         |
| Auto‑approve rate plateaus           | Med   |    Med | BK2   | Expand low‑risk catalog; education; metrics |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; assistant acceptance; auto‑approve rate; graph adoption; κ/Brier; SOAR cost.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- Template exports sanitized; tenant boundaries enforced; encryption in transit/at rest.
- SOAR destructive steps always HITL; blue/green rollouts; reason codes required.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → selected tenants (if applicable).
- **Rollback:** Disable prevention; hide templates/trackers/KPIs; revert quota‑by‑risk; scale runners to baseline; pin intel to v5.3.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Mar 16–27, 2026)

- **Policy v1.7:** prevention explainability and policy drift prediction GA; suggested guardrails auto‑PRs.
- **Graph v2.5:** KPI drill‑downs by team/service; recommended controls backlog burn‑down.
- **SOAR v2.3:** cost optimizer beta; multi‑region active‑active runners.
- **Intel v5.5:** selective online learning (shadow); federation 60%.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
