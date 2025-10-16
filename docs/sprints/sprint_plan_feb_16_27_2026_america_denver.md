# Sprint Plan — Feb 16–27, 2026 (America/Denver)

> **Context:** Fourth sprint of 2026. U.S. **Presidents’ Day (Mon Feb 16)** reduces capacity. Goal: push assistance + automation safely while controlling cost and improving investigation context.

---

## 1) Sprint Goal (SMART)

Release **Policy Intelligence v1.5** (proactive guardrails + example‑based explanations), **Graph UI v2.3** (risk overlays, control gap analysis, scenario sharing), **SOAR v2.1** (GA hardening + cost dashboard + quota governance), and **Intel v5.3** (disagreement clustering, reviewer routing v2, federation 35–40%) to achieve **MTTC P50 ≤ 7.5 min / P90 ≤ 18 min** and **auto‑approved low‑risk actions ≥ 45%** with **false‑allow = 0** — **by Feb 27, 2026**.

**Key outcomes**

- Policy assistant proactively suggests guardrails pre‑merge; explanations include concrete examples and expected blast radius.
- Graph highlights control gaps and overlays risk on saved scenarios; analysts can **share scenarios** with permissions.
- SOAR v2.1 delivers cost visibility (per action/vendor), **quota policies** with budgets/alerts, and resiliency hardening.
- Intel improves precision with disagreement clustering and smarter reviewer routing; partner federation expanded to **35–40% sample** (guarded).

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 7.5 min**, **P90 ≤ 18 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy assistant effectiveness:** Suggestion acceptance **≥ 68%**; backtest AUC **≥ 0.84**; **0** critical authz escapes.  
  _Verify:_ Telemetry; CI gate logs; audit.
- **Automation adoption & safety:** **≥ 45%** of eligible actions auto‑approved (low‑risk); **false‑allow = 0** in prod.  
  _Verify:_ SOAR logs; simulation reports.
- **Graph adoption:** **≥ 78%** of P1/P2 investigations use scenarios/overlays; recommended controls exported in **≥ 55%** of those.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.84**; Brier **≤ 0.13**; override rate **≤ 7%**.  
  _Verify:_ Eval reports; sampling.
- **Cost governance:** Cost per automated action reported for **≥ 90%** of actions; budget breach alerts **= 0**.  
  _Verify:_ Cost dashboard; alert logs.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Intelligence v1.5:** proactive guardrail suggestions inline; example‑based risk explanations; drift‑prevention ruleset tuned; exception workflow; audit + kill‑switch.
- **Graph UI v2.3:** risk overlays (exposure, asset criticality, control gaps); scenario sharing with permissions; control gap analysis with remediation templates; performance tuning.
- **SOAR v2.1:** cost dashboard v1 (per action/vendor/tenant); quota governance (per‑tenant/per‑action with budgets + alerts); runner/queue resiliency polish; blue/green auto‑rollback checks.
- **Intel v5.3:** disagreement clustering to surface hard cases; reviewer routing v2 (expertise + load + history); federation expansion to **35–40%** sample with isolation and cost caps; calibration monitoring.
- **Operational analytics:** exec snapshot including MTTC, auto‑approve %, cost/tenant, graph adoption, assistant acceptance.

**Stretch:**

- **Responder Copilot v0.5.1 (alpha):** guided next steps combining assistant + scenario overlays (read‑only).
- **SOAR dry‑run simulator:** per‑playbook cost/impact preview.
- **Graph remediation plans:** bulk export to SOAR tickets for top 3 gaps.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant playbooks; mobile clients; customer‑visible ABAC editor changes.

---

## 4) Team & Capacity (holiday‑adjusted)

- **Working days:** 9 (holiday Mon Feb 16).
- **Focus factor:** 0.8.
- **Nominal ~50 pts → Commit ≈ **36 pts** (+ up to 6 pts stretch).**

---

## 5) Backlog (Ready for Sprint)

### Epic BD — Policy Intelligence v1.5 — **12 pts**

- **BD1 — Proactive guardrails + UI** (5 pts)  
  _AC:_ pre‑merge suggestions; one‑click apply; acceptance telemetry.
- **BD2 — Example‑based explanations** (4 pts)  
  _AC:_ past incident links; blast radius preview; copy reviewed.
- **BD3 — Drift‑prevention tuning + exceptions** (3 pts)  
  _AC:_ reduce false blocks; exception flow with audit.

### Epic BE — Graph UI v2.3 — **10 pts**

- **BE1 — Risk overlays & control gaps** (4 pts)  
  _AC:_ exposure/criticality; missing controls; tooltips; export.
- **BE2 — Scenario sharing & perms** (4 pts)  
  _AC:_ share with team; permissions respected; audit trail.
- **BE3 — Performance/UX polish** (2 pts)  
  _AC:_ faster load; freshness banner; PNG/CSV export.

### Epic BF — SOAR v2.1 — **12 pts**

- **BF1 — Cost dashboard v1** (4 pts)  
  _AC:_ per‑action/vendor/tenant; budgets; alerts.
- **BF2 — Quota governance** (4 pts)  
  _AC:_ per‑tenant/action limits; breach handling; reports.
- **BF3 — Resiliency polish + blue/green auto‑rollback** (4 pts)  
  _AC:_ health checks; safe rollback; chaos tests.

### Epic BG — Intel v5.3 — **6 pts**

- **BG1 — Disagreement clustering + routing v2** (3 pts)  
  _AC:_ cluster hard cases; route to expert; SLA.
- **BG2 — Federation 35–40%** (3 pts)  
  _AC:_ isolation; PII filters; budget caps; canary → GA.

### Epic BH — Operational Analytics & Enablement — **2 pts**

- **BH1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 36 pts**, hold 4 pts buffer; + up to 6 pts stretch.

---

## 6) Dependencies & Assumptions

- CI gate active; approver groups defined; policy catalogs current.
- Graph identity/asset data fresh ≤ 24h; permission model enforced.
- Queue store supports idempotency; autoscaling quotas approved; cost telemetry sources wired.
- Partner legal/privacy approvals current; budget alerts set.

---

## 7) Timeline & Ceremonies (MT)

- **Tue Feb 17** — Planning & Kickoff; governance review (30m).
- **Fri Feb 20** — Mid‑sprint demo/checkpoint (30m).
- **Wed Feb 25** — Grooming for next sprint (45m).
- **Fri Feb 27** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policies/catalogs documented; datasets ready; flags/telemetry named.
- Cost telemetry mapped; quota policies reviewed; rollback plans drafted.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback verified.

---

## 10) QA & Validation Plan

- **Policy:** A/B acceptance; backtests; CI gate simulation; human review of top 20 guardrails.
- **Graph:** overlay correctness sampling; scenario sharing permission tests; control gap export to ticket/SOAR.
- **SOAR:** quota breach simulations; blue/green rollback drill; chaos on queues/runners; cost accuracy sampling.
- **Intel:** κ monitoring; override rate; reviewer SLA; budget/cost alerts.

---

## 11) Risk Register (RAID)

| Risk                                  | Prob. | Impact | Owner | Mitigation                                  |
| ------------------------------------- | ----- | -----: | ----- | ------------------------------------------- |
| Guardrails block legitimate changes   | Med   |    Med | BD3   | Previews; exception path; audit             |
| Scenario sharing leaks data           | Low   |   High | BE2   | Permissions; redaction; audit               |
| Cost telemetry inaccuracies           | Med   |    Med | BF1   | Reconciliation sampling; thresholds; alerts |
| Quota policies hinder urgent response | Low   |   High | BF2   | Break‑glass; escalation; monitoring         |
| Federation privacy/cost issues        | Low   |    Med | BG2   | Isolation; PII filters; budget caps         |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; assistant acceptance; auto‑approve rate; graph adoption; κ/Brier; SOAR cost.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege.
- No PII in model features; encryption in transit/at rest; retention limits.
- SOAR destructive steps always HITL; reasons required; blue/green rollouts.

---

## 14) Release & Rollback

- **Staged rollout:** Internal cohort → all analysts → selected tenants (if applicable).
- **Rollback:** Disable guardrails; hide overlays/sharing; revert to Queues v1; scale runners to baseline; pin intel to v5.2.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Mar 2–13, 2026)

- **Policy v1.6:** proactive prevention GA; change‑risk simulation at submit.
- **Graph v2.4:** scenario templates; control rollout tracking; exposure KPI pages.
- **SOAR v2.2:** dry‑run simulator GA; cost dashboard v1.1; quota policies by risk.
- **Intel v5.4:** semi‑supervised improvements; partner federation 50% target (guarded).

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
