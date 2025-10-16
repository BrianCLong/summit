# Sprint Plan — Feb 2–13, 2026 (America/Denver)

> **Context:** Third sprint of 2026. Consolidate January foundations: **policy assistant GA**, **graph scenarios at scale**, **SOAR v2.0 GA**, and **intel v5.2** for higher precision and safer automation.

---

## 1) Sprint Goal (SMART)

Ship **Policy Intelligence v1.4 (Assistant GA)**, **Graph UI v2.2** (scenario diffs + recommended controls rollout + exposure time series), **SOAR v2.0 GA** (autoscaling runners, Queues v2, blue/green deploys, quota policies), and **Intel v5.2** (disagreement detection + reviewer routing + federation 25%) to achieve **MTTC P50 ≤ 8 min / P90 ≤ 20 min** and **auto‑approved low‑risk actions ≥ 40%** — **by Feb 13, 2026**.

**Key outcomes**

- Policy Assistant GA with **risk explanations**, **what‑if**, and **drift‑prevention** rules default‑on.
- Graph supports **scenario diffs**, **recommended control rollout**, and **exposure time series** for top entities.
- SOAR v2.0 **general availability**: stable autoscaling, exactly‑once queues, **blue/green runners**, per‑tenant quotas + budgets.
- Intel v5.2 improves calibration with **disagreement detection** and **reviewer routing**; partner federation at **25% sample** (guarded).

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 8 min**, **P90 ≤ 20 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy assistant effectiveness:** Suggestion acceptance **≥ 65%**; backtest AUC **≥ 0.83**; **0** critical authz escapes.  
  _Verify:_ Assistant telemetry; CI gate logs; audit.
- **Automation adoption & safety:** **≥ 40%** of eligible actions auto‑approved (low‑risk); **false‑allow = 0** in prod.  
  _Verify:_ SOAR logs; simulation reports.
- **Graph adoption:** **≥ 75%** of P1/P2 investigations use scenarios or diffs; recommended controls exported in **≥ 50%** of those.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.83**; Brier **≤ 0.13** on canary; override rate **≤ 7.5%**.  
  _Verify:_ Eval reports; sampling.

---

## 3) Scope

**Must‑have (commit):**

- **Policy v1.4 (Assistant GA):** finalize NL risk explanations; enforce drift‑prevention default‑on; assistant inline suggestions with acceptance telemetry; governance & kill‑switch; what‑if simulator polish.
- **Graph v2.2:** scenario diff view (time‑boxed); recommended controls rollout (tickets + SOAR links); exposure time series (entity/node panels); owner handoff improvements.
- **SOAR v2.0 GA:** autoscaling runners hardened; Queues v2 (exactly‑once) canary → GA; blue/green runner deploys; per‑tenant quotas; budget/cost telemetry; approval dashboard integration.
- **Intel v5.2:** disagreement detection; reviewer routing (expertise, load); partner federation to 25% sample within cost/privacy caps; export to detections gated; calibration monitoring.
- **Operational analytics:** adoption & safety widgets (assistant, auto‑approve, graph diffs, reviewer SLAs) and weekly exec snapshot.

**Stretch:**

- **Responder Copilot v0.5 (alpha):** fuse assistant + graph scenarios into guided next steps (read‑only, no auto‑exec).
- **SOAR cost dashboard v1:** per‑action/vendor cost, budgets, alerts.
- **Graph risk overlays:** highlight control gaps on scenarios.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant playbooks; mobile clients.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal).
- Keep **~10% slack** for incident/ops interrupts.

---

## 5) Backlog (Ready for Sprint)

### Epic AY — Policy Intelligence v1.4 (Assistant GA) — **12 pts**

- **AY1 — GA hardening & UX** (5 pts)  
  _AC:_ copy reviewed; accessibility; telemetry; kill‑switch.
- **AY2 — Drift‑prevention default‑on** (5 pts)  
  _AC:_ CI gate; exception workflow; audit; previews.
- **AY3 — What‑if simulator polish** (2 pts)  
  _AC:_ clearer diffs; export; link to approvals.

### Epic AZ — Graph UI v2.2 — **10 pts**

- **AZ1 — Scenario diffing** (4 pts)  
  _AC:_ T‑0 vs T‑1; annotate changes; export.
- **AZ2 — Recommended controls rollout** (4 pts)  
  _AC:_ control templates; owner handoff; ticket export; SOAR link.
- **AZ3 — Exposure time series** (2 pts)  
  _AC:_ entity trend; freshness banner; CSV.

### Epic BA — SOAR v2.0 GA — **12 pts**

- **BA1 — Autoscaling & Queues v2 hardening** (5 pts)  
  _AC:_ exactly‑once verified; soak test; alarms.
- **BA2 — Blue/green runner deploys** (4 pts)  
  _AC:_ zero‑downtime; rollback switch; audit.
- **BA3 — Quotas & cost telemetry** (3 pts)  
  _AC:_ per‑tenant limits; budget alerts; report.

### Epic BB — Intel v5.2 — **6 pts**

- **BB1 — Disagreement detection + routing** (3 pts)  
  _AC:_ detect conflicts; route to expert; SLA.
- **BB2 — Federation expansion 25%** (3 pts)  
  _AC:_ isolation; PII filters; cost caps; canary → GA.

### Epic BC — Operational Analytics & Enablement — **2 pts**

- **BC1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- CI gates active with exception path; approver groups defined.
- Graph data (identity + asset) fresh ≤ 24h; permission model enforced.
- Queue store supports idempotency; autoscaling infra quota approved.
- Partner legal/privacy approvals current; budget alerts in place.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Feb 2** — Planning & Kickoff; SOAR GA readiness review (30m).
- **Fri Feb 6** — Mid‑sprint demo/checkpoint (30m).
- **Wed Feb 11** — Grooming for next sprint (45m).
- **Fri Feb 13** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policies/catalogs documented; datasets ready; flags/telemetry named.
- Blue/green pipelines configured; rollback plans drafted.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback verified.

---

## 10) QA & Validation Plan

- **Policy:** A/B acceptance; backtests; CI gate simulation; human review of top 20 guardrails.
- **Graph:** scenario diff accuracy spot checks; control rollout e2e to ticket/SOAR; exposure trend sanity checks.
- **SOAR:** load tests; chaos on queues; blue/green failover drill.
- **Intel:** κ monitoring; override rate; reviewer SLA; cost alerts.

---

## 11) Risk Register (RAID)

| Risk                                     | Prob. | Impact | Owner | Mitigation                                  |
| ---------------------------------------- | ----- | -----: | ----- | ------------------------------------------- |
| Drift rules block legitimate changes     | Med   |    Med | AY2   | Previews; exception path; audit             |
| Scenario diffs mislead due to stale data | Low   |   High | AZ1   | Freshness banner; sampling; quick fixes     |
| Queue/runner bugs under GA load          | Low   |   High | BA1   | Soak + chaos tests; rollback                |
| Federation privacy/cost issues           | Low   |    Med | BB2   | Isolation; PII filters; budget caps         |
| Auto‑approve rate plateaus               | Med   |    Med | BA3   | Expand low‑risk catalog; education; metrics |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup, MTTC, assistant acceptance, auto‑approve rate, graph adoption, κ/Brier, SOAR cost.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege.
- No PII in model features; encryption in transit/at rest; retention limits.
- SOAR destructive steps always HITL; approvals with reason codes; blue/green rollouts.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → selected tenants (if applicable).
- **Rollback:** Disable drift rules; hide scenario diffs; revert to Queues v1; scale runners to baseline; pin intel to v5.1.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Feb 16–27, 2026)

- **Holiday capacity note:** U.S. Presidents’ Day **Mon Feb 16** (reduced capacity).
- **Policy v1.5:** change‑risk explanations with examples; proactive guardrail suggestions.
- **Graph v2.3:** risk overlays + control gap analysis; saved scenario sharing.
- **SOAR v2.1:** GA hardening + cost dashboard + quota policies.
- **Intel v5.3:** reviewer routing + semi‑supervised improvements; federation 35–40%.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
