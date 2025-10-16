# Sprint Plan — May 11–22, 2026 (America/Denver)

> **Context:** Tenth sprint of 2026. Mature April alphas/betas into stable betas with stronger governance, performance, and cost/risk controls.

---

## 1) Sprint Goal (SMART)

Release **Policy Studio v2.0 (beta)**, **Graph v3.0 Workspaces (beta)**, **SOAR v2.7** (optimizer online‑learning _guarded_ + vendor auto‑selection + SLO/cost/risk routing), and **Intel v6.1** (calibrated ensembles + reviewer incentive metrics + federation **85%**) to reach **MTTC P50 ≤ 5.0 min / P90 ≤ 12.5 min**, **auto‑approved low‑risk actions ≥ 65%** with **false‑allow = 0**, and **automation cost/action ↓ 22% vs March** — **by May 22, 2026**.

**Key outcomes**

- **Policy Studio v2.0 (beta):** policy packs, change proposals, cross‑environment promotion with approvals; end‑to‑end governance and what‑if simulation.
- **Graph v3.0 Workspaces (beta):** workspace templates, **graph DSL** for advanced queries, evidence diffing, and case linkage.
- **SOAR v2.7:** optimizer online learning (guarded) improves recommendations; **vendor benchmarking & auto‑selection** per action; routing considers SLO, cost, and risk.
- **Intel v6.1:** calibrated ensembles + trust calibration; reviewer incentive metrics (quality, SLA); partner federation **85%** (guarded) with cost/privacy caps.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 5.0 min**, **P90 ≤ 12.5 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy Studio adoption:** **≥ 75%** of policy changes via Studio; prevention blocks **≥ 90%** of high‑risk in backtests; **0** critical authz escapes.  
  _Verify:_ Studio telemetry; CI logs; audit.
- **Automation & cost:** auto‑approve (low‑risk) **≥ 65%**; mean cost/action **↓ 22%** vs March; budget breaches **= 0**.  
  _Verify:_ SOAR logs; cost dashboards; alerts.
- **Graph effectiveness:** **≥ 82%** of P1/P2 investigations use Workspaces/templates or DSL; evidence diffs attached in **≥ 55%**; narrative exports in **≥ 45%**.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.87**; Brier **≤ 0.11**; override rate **≤ 6.0%**; calibration reliability slope ≤ 1.1.  
  _Verify:_ Eval reports; calibration plots.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Studio v2.0 (beta):**
  - **Policy packs & proposals:** bundle related rules; propose changes; collect reviews; simulation preview with risk explanation.
  - **Cross‑env promotion:** dev → staging → prod with approvals, gates, and audit.
  - Governance & audit polish; change history with simulation credit.
- **Graph v3.0 Workspaces (beta):**
  - **Workspace templates** for top incident types; permissions; versioning.
  - **Graph DSL (v0):** path queries, filters; saved searches; permission checks.
  - **Evidence diffing** (before/after artifacts); case linkage to tickets.
- **SOAR v2.7:**
  - **Optimizer online learning (guarded):** recommend‑only; learns from approvals/denials; drift/cost gates.
  - **Vendor benchmarking + auto‑selection** per action with capability/price/SLO matrix; human approval for vendor switch.
  - **Routing policy:** SLO + cost + risk composite; blue/green and failover drill.
- **Intel v6.1:**
  - **Calibrated ensembles** with trust layer; reliability diagrams in UI.
  - **Reviewer incentive metrics** (quality, throughput, SLA) surfaced to leads.
  - **Federation 85%** sample (guarded) with isolation, PII filters, budget caps; weekly eval.
- **Operational analytics:** exec snapshot; Studio/Workspace adoption; auto‑approve%; cost per action; calibration panels.

**Stretch:**

- **Responder Copilot v1.0 (alpha)**: guided next steps across Studio + Workspaces (read‑only).
- **Graph DSL editor UX**: autocomplete + snippets.
- **SOAR optimizer “why” explanations**: surface drivers of cheaper/vendor choice.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant policy editing; Studio/Workspace GA; optimizer auto‑exec.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal); ~10% slack.

---

## 5) Backlog (Ready for Sprint)

### Epic CH — Policy Studio v2.0 (Beta) — **12 pts**

- **CH1 — Policy packs & proposals + simulation** (5 pts)  
  _AC:_ bundle rules; reviews; risk preview; examples; diffs.
- **CH2 — Cross‑env promotion (dev→stg→prod)** (5 pts)  
  _AC:_ approvals; gates; audit; rollback plan.
- **CH3 — Governance & history polish** (2 pts)  
  _AC:_ role checks; simulation credit; reports.

### Epic CI — Graph v3.0 Workspaces (Beta) — **10 pts**

- **CI1 — Workspace templates** (4 pts)  
  _AC:_ versioned; permissions; freshness banner.
- **CI2 — Graph DSL v0** (4 pts)  
  _AC:_ path queries; filters; saved queries; perms.
- **CI3 — Evidence diffing + case linkage** (2 pts)  
  _AC:_ artifact diffs; ticket links; export.

### Epic CJ — SOAR v2.7 — **12 pts**

- **CJ1 — Optimizer online learning (guarded)** (4 pts)  
  _AC:_ learn from approvals; drift gates; recommend‑only.
- **CJ2 — Vendor benchmarking + auto‑selection** (5 pts)  
  _AC:_ capability/price/SLO matrix; approval to switch; audit.
- **CJ3 — Routing policy (SLO+cost+risk)** (3 pts)  
  _AC:_ composite score; failover drill; alarms.

### Epic CK — Intel v6.1 — **6 pts**

- **CK1 — Calibrated ensembles + trust UI** (3 pts)  
  _AC:_ reliability plots; confidence bands; tests.
- **CK2 — Reviewer metrics + federation 85%** (3 pts)  
  _AC:_ quality/SLA dashboards; isolated ingest; calibration.

### Epic CL — Operational Analytics & Enablement — **2 pts**

- **CL1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- Policy catalogs current; CI gates active; approver groups staffed.
- Graph data fresh ≤ 24h; permissions enforced; storage for artifacts with retention.
- Multi‑vendor creds/quotas approved; telemetry for latency/cost; budget alerts configured.
- Partner legal/privacy approvals current; federation traffic isolated.

---

## 7) Timeline & Ceremonies (MT)

- **Mon May 11** — Planning & Kickoff; Studio/Workspace/Optimizer safety review (30m).
- **Fri May 15** — Mid‑sprint demo/checkpoint (30m).
- **Wed May 20** — Grooming for next sprint (45m).
- **Fri May 22** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Studio feature list locked; thresholds documented; datasets ready.
- Workspace templates scoped; DSL v0 grammar drafted.
- Routing weights drafted; optimizer guardrails set; rollback plans prepared.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Studio:** backtests; CI simulations; promotion dry‑runs; review cycle timing.
- **Workspaces:** template usefulness survey; DSL query correctness sampling; evidence diff export checks.
- **SOAR:** vendor benchmarking A/B; routing decision sampling vs SLAs/cost; optimizer recommendation accuracy (human review).
- **Intel:** κ/Brier monitoring; calibration reliability plots; reviewer SLA dashboards.

---

## 11) Risk Register (RAID)

| Risk                                            | Prob. | Impact | Owner | Mitigation                              |
| ----------------------------------------------- | ----- | -----: | ----- | --------------------------------------- |
| Studio beta allows risky changes                | Low   |   High | CH1   | Simulation; approvals; kill‑switch      |
| DSL queries leak data                           | Low   |   High | CI2   | Permissions; redaction; audit           |
| Auto‑selection picks unstable vendor            | Low   |   High | CJ2   | Health checks; staged rollout; fallback |
| Calibrated ensembles over/under‑confident       | Med   |    Med | CK1   | Reliability tuning; holdout eval        |
| Reviewer metrics incentivize speed over quality | Med   |    Med | CK2   | Counter‑metrics; sampling reviews       |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; Studio/Workspace adoption; auto‑approve %; cost/action; κ/Brier; vendor health.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- Artifact storage encrypted; retention respected; chain‑of‑custody logged.
- SOAR destructive steps HITL; blue/green rollouts; reason codes required.

---

## 14) Release & Rollback

- **Staged rollout:** Internal → all analysts → selected tenants (if applicable).
- **Rollback:** Disable Studio beta; disable DSL; force manual vendor selection; pin intel to v5.7 static.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (May 25–Jun 5, 2026)

- **U.S. Memorial Day (Mon May 25)** — reduced capacity.
- **Policy Studio v2.0 (GA prep):** policy packs/promotion hardening; audit quality; import/export.
- **Graph v3.0 (beta2):** DSL v0.1 with path operators; workspace sharing; case bundles.
- **SOAR v2.8:** optimizer explanations GA; vendor marketplace contracts/pricing integration.
- **Intel v6.2:** trust dashboards; reviewer routing incentives tuning; federation 90% target.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
