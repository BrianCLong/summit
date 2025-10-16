# Sprint Plan — Apr 13–24, 2026 (America/Denver)

> **Context:** Eighth sprint of 2026. Convert Q1 capabilities into durable, governed, and cost‑efficient operations. Push toward incentives for risk reduction and GA for learning systems under strict safety.

---

## 1) Sprint Goal (SMART)

Deliver **Policy Intelligence v1.9** (explainability analytics + policy debt burndown + _safe_ auto‑PR merges), **Graph UI v2.7** (risk budgets → incentives/OKR integration + scenario bundle catalog), **SOAR v2.5** (Cost Optimizer v1.1 GA + latency‑ & cost‑aware routing + multi‑vendor abstraction), and **Intel v5.7** (online learning **GA, guarded** + federation **80%**) to achieve **MTTC P50 ≤ 5.5 min / P90 ≤ 14 min**, **auto‑approved low‑risk actions ≥ 62%** with **false‑allow = 0**, and **automation cost/action ↓ 18%** — **by Apr 24, 2026**.

**Key outcomes**

- Policy: explainability analytics identify top drivers; policy **debt burndown** plan executed; low‑risk **auto‑PR merges** with safeguards.
- Graph: risk budgets translate to **team incentives/OKRs**; **scenario bundle catalog** standardizes investigations; rollout tracking persists.
- SOAR: Cost Optimizer v1.1 learns from approvals; **latency+cost‑aware routing**; **multi‑vendor abstraction** for EDR/email/proxy.
- Intel: **online learning GA** behind gates; **80% federation** (guarded) with calibration monitoring and instant rollback capability.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 5.5 min**, **P90 ≤ 14 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy efficacy:** Prevention backtests block **≥ 90%** of high‑risk changes; assistant acceptance **≥ 75%**; policy debt burndown **≥ 25%** completed.  
  _Verify:_ CI logs; audit; burndown report.
- **Automation adoption & safety:** **≥ 62%** of eligible actions auto‑approved (low‑risk only); **false‑allow = 0** in prod.  
  _Verify:_ SOAR logs; simulation.
- **Cost governance:** Mean cost per automated action **↓ 18%** vs prior month; cost attribution **≥ 98%**; budget breach alerts **= 0**.  
  _Verify:_ Cost dashboard; invoice reconciliation.
- **Graph adoption:** **≥ 85%** of P1/P2 investigations use budgets/incentives or bundles; remediation exports in **≥ 64%**.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.86**; Brier **≤ 0.11** on canary; override rate **≤ 6.3%**; online learning passes guardrails.  
  _Verify:_ Eval reports; drift monitors.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Intelligence v1.9:**
  - **Explainability analytics:** aggregate top risk factors; reliability diagrams; team dashboards.
  - **Policy debt burndown:** catalog risky/legacy rules; fix ≥ 25%; track via tickets and SLA.
  - **Safe auto‑PR merges:** for low‑risk guardrails with green CI + approver quorum; evidence attached; kill‑switch.
- **Graph UI v2.7:**
  - **Budgets → incentives/OKR:** map risk budgets to team OKRs with targets and quarterly roll‑ups.
  - **Scenario bundle catalog:** curated templates for top incident types; versioned; permissions respected.
  - **Rollout tracking:** persist control rollouts with SLA timers and success metrics; export.
- **SOAR v2.5:**
  - **Cost Optimizer v1.1 GA:** learn from prior approvals; improved savings estimates; policy knobs.
  - **Latency & cost‑aware routing:** choose region/vendor by composite score; health/latency probes.
  - **Multi‑vendor abstraction layer:** adapters for EDR, email, proxy; capability matrix; fallbacks.
- **Intel v5.7:**
  - **Online learning GA (guarded):** gated by drift/quality monitors; manual approval for model writes; instant rollback.
  - **Federation 80% (guarded):** isolation; PII filters; budget caps; calibration monitoring; weekly eval.
- **Operational analytics:** exec snapshot automation; policy/automation/cost/OKR panels.

**Stretch:**

- **Responder Copilot v0.9 (alpha):** guided next steps using bundles + incentives context (read‑only).
- **SOAR vendor benchmarking:** pick cheapest viable vendor per action with safety bounds.
- **Graph OKR exports:** monthly PDF/email to team leads.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant playbooks; external policy editor changes.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal); ~10% slack.

---

## 5) Backlog (Ready for Sprint)

### Epic BX — Policy Intelligence v1.9 — **12 pts**

- **BX1 — Explainability analytics & dashboards** (5 pts)  
  _AC:_ factor importances; reliability plots; team views.
- **BX2 — Policy debt burndown (≥ 25%)** (5 pts)  
  _AC:_ ticketed fixes; SLA; before/after report.
- **BX3 — Safe auto‑PR merges** (2 pts)  
  _AC:_ low‑risk only; quorum approvals; evidence; kill‑switch.

### Epic BY — Graph UI v2.7 — **10 pts**

- **BY1 — Budgets → OKR integration** (4 pts)  
  _AC:_ targets; roll‑ups; alerts; export.
- **BY2 — Scenario bundle catalog** (4 pts)  
  _AC:_ versioned templates; permissions; freshness banner.
- **BY3 — Rollout tracking polish** (2 pts)  
  _AC:_ SLA timers; success metrics; CSV/PDF.

### Epic BZ — SOAR v2.5 — **12 pts**

- **BZ1 — Cost Optimizer v1.1 GA** (4 pts)  
  _AC:_ learned weights; savings estimate; simulator; audit.
- **BZ2 — Latency + cost‑aware routing** (5 pts)  
  _AC:_ scoring function; probes; failover; blue/green.
- **BZ3 — Multi‑vendor abstraction** (3 pts)  
  _AC:_ capability matrix; adapters; fallback rules.

### Epic CA — Intel v5.7 — **6 pts**

- **CA1 — Online learning GA (guarded)** (3 pts)  
  _AC:_ gates; approvals; rollback; registry v5.7.
- **CA2 — Federation 80%** (3 pts)  
  _AC:_ isolation; PII filters; cost caps; calibration.

### Epic CB — Operational Analytics & Enablement — **2 pts**

- **CB1 — Exec snapshot + OKR dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- CI gates active; approver groups staffed; policy catalogs current.
- Graph identity/asset data fresh ≤ 24h; OKR system integration endpoints available.
- Multi‑vendor credentials and quotas approved; routing telemetry wired; cost sources verified.
- Partner privacy/legal approvals current; federation traffic isolated; budget alerts set.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Apr 13** — Planning & Kickoff; governance review (30m).
- **Fri Apr 17** — Mid‑sprint demo/checkpoint (30m).
- **Wed Apr 22** — Grooming for next sprint (45m).
- **Fri Apr 24** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Policy debt list prioritized; risk factors/thresholds documented; datasets ready.
- OKR targets set; template catalog drafted; permissions mapped.
- Vendor adapters scoped; routing rules defined; rollback plans drafted.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Policy:** A/B acceptance; backtests; auto‑PR merge audit; burndown report.
- **Graph:** OKR mapping accuracy; bundle usefulness survey; rollout tracker e2e; exports.
- **SOAR:** routing decision sampling vs SLAs/cost; vendor failover drill; optimizer A/B.
- **Intel:** κ/Brier monitoring; guarded learning gates; federation calibration; budget alerts.

---

## 11) Risk Register (RAID)

| Risk                                     | Prob. | Impact | Owner | Mitigation                                     |
| ---------------------------------------- | ----- | -----: | ----- | ---------------------------------------------- |
| Auto‑PR merges create noisy changes      | Med   |    Med | BX3   | Thresholds; approver quorum; kill‑switch       |
| OKR incentives lead to metric gaming     | Med   |    Med | BY1   | Clear definitions; audits; counter‑metrics     |
| Routing misconfig increases latency      | Low   |   High | BZ2   | Staged rollout; health checks; rollback        |
| Online learning drifts                   | Low   |   High | CA1   | Strict gates; human approval; instant rollback |
| Vendor abstraction hides failure details | Med   |    Med | BZ3   | Rich telemetry; adapter health SLOs            |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; auto‑approve rate; cost per action; OKR status; κ/Brier; vendor health.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege across adapters.
- No PII in model features; encryption in transit/at rest; retention respected.
- SOAR destructive steps HITL only; reason codes required; blue/green rollouts with approvals.

---

## 14) Release & Rollback

- **Staged rollout:** Internal → all analysts → selected tenants (if applicable).
- **Rollback:** Disable auto‑PR merges; revert budget/OKR mapping; force single‑vendor/single‑region; pin intel to v5.6.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Apr 27–May 8, 2026)

- **Policy v2.0 concept:** unified policy studio (authoring + explainability + prevention) with governance.
- **Graph v3.0 concept:** investigation workspaces; graph search; attach evidence; shareable narratives.
- **SOAR v2.6:** optimizer learns user utility; vendor marketplace; SLO‑aware routing.
- **Intel v6.0 concept:** active/online learning foundation; trust calibration; human‑in‑the‑loop dashboards.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
