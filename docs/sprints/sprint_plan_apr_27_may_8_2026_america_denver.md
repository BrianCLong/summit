# Sprint Plan — Apr 27–May 8, 2026 (America/Denver)

> **Context:** Ninth sprint of 2026. Convert Q1→Q2 concepts into first runnable alphas: unified **Policy Studio v2.0**, **Graph v3.0 Workspaces**, **SOAR v2.6** (marketplace + SLO/cost‑aware routing), and **Intel v6.0 Foundations** (active/online learning + trust calibration). Focus on safety, governance, and repeatability.

---

## 1) Sprint Goal (SMART)

Release **Policy Studio v2.0 (alpha)**, **Graph v3.0 Workspaces (alpha)**, **SOAR v2.6 (beta)** with vendor marketplace + SLO/cost‑aware routing, and **Intel v6.0 Foundations** (uncertainty & trust calibration + guarded online learning pipeline) to drive **MTTC P50 ≤ 5.2 min / P90 ≤ 13 min**, **auto‑approved low‑risk actions ≥ 63%** (false‑allow = 0), and **automation cost/action ↓ 20% vs March** — **by May 8, 2026**.

**Key outcomes**

- **Policy Studio v2.0 (alpha):** unified authoring + explainability + prevention with draft reviews, what‑if simulation, auto‑PR guardrails, and governance.
- **Graph v3.0 Workspaces (alpha):** investigation workspaces with graph search, evidence capture (hash + chain‑of‑custody), timelines, and shareable narratives.
- **SOAR v2.6 (beta):** vendor marketplace (EDR/email/proxy), SLO‑ & cost‑aware routing with health probes, and optimizer that learns from approvals (recommend‑only).
- **Intel v6.0 Foundations:** uncertainty quantification + trust calibration layer, guarded online learning pipeline (shadow + gated writes), reviewer dashboards.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 5.2 min**, **P90 ≤ 13 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy Studio adoption:** ≥ **70%** of policy changes authored via Studio alpha; prevention blocks **≥ 90%** of high‑risk in backtests; **0** critical authz escapes.  
  _Verify:_ Studio telemetry; CI gate logs; audit.
- **Automation & cost:** auto‑approve (low‑risk) **≥ 63%**; mean cost/action **↓ 20%** vs March; budget breaches **= 0**.  
  _Verify:_ SOAR logs; cost dashboard; alerts.
- **Graph effectiveness:** ≥ **80%** of P1/P2 investigations use Workspaces; evidence attached in **≥ 60%**; narrative exports in **≥ 40%**.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.86**; Brier **≤ 0.11** on canary; override rate **≤ 6.2%**; trust calibration reduces over‑confidence (reliability diagram slope ≤ 1.1).  
  _Verify:_ Eval reports; calibration plots.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Studio v2.0 (alpha):**
  - Draft workspace (versioned edits, diffs) with simulation preview + risk explanation and blast‑radius.
  - Auto‑PR guardrails from simulations; approver workflow; evidence links; kill‑switch.
  - Governance: roles/approvals; audit log; change history with credit for simulations.
- **Graph v3.0 Workspaces (alpha):**
  - Graph search (query builder + saved searches); entity drill‑downs.
  - Evidence capture: file/url/hash artifacts; SHA‑256 + timestamp; chain‑of‑custody.
  - Timeline + narrative export (PDF/markdown) with cited artifacts.
- **SOAR v2.6 (beta):**
  - Vendor marketplace adapters (EDR/email/proxy) with capability matrix + health checks.
  - SLO‑ & cost‑aware routing (latency/cost composite score); blue/green; failover drill.
  - Optimizer learns from approvals (recommend‑only; human approval required); simulation link.
- **Intel v6.0 Foundations:**
  - Uncertainty estimates (e.g., calibrated confidence intervals) + trust calibration layer surfaced to analysts.
  - Guarded online learning pipeline (shadow + gated writes; drift/quality gates; instant rollback).
  - Reviewer dashboard (disagreement, routing, SLA).
- **Operational analytics:** exec snapshot automation; Studio/Workspace/Auto‑approve/Cost/Calibration panels.

**Stretch:**

- **Responder Copilot v1.0 (design spec):** tie Studio policies + Workspace context for guided next steps (read‑only).
- **SOAR cost dashboard v1.2:** per‑action/vendor trends + optimizer “why” explanations.
- **Graph search language (DSL) draft:** advanced filters, path queries.

**Out‑of‑scope:**

- Destructive automation default‑on; cross‑tenant policy editing; customer‑visible Studio GA.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal); ~10% slack.

---

## 5) Backlog (Ready for Sprint)

### Epic CC — Policy Studio v2.0 (Alpha) — **12 pts**

- **CC1 — Drafting + diffs + simulation** (5 pts)  
  _AC:_ versioned edits; risk preview; examples; diff view.
- **CC2 — Auto‑PR guardrails + approvals** (5 pts)  
  _AC:_ PRs with evidence; approver quorum; kill‑switch; logs.
- **CC3 — Governance & audit** (2 pts)  
  _AC:_ roles; audit trail; change history with simulation credit.

### Epic CD — Graph v3.0 Workspaces (Alpha) — **10 pts**

- **CD1 — Graph search + saved queries** (4 pts)  
  _AC:_ query builder; drill‑downs; permissions.
- **CD2 — Evidence capture + chain‑of‑custody** (4 pts)  
  _AC:_ SHA‑256; timestamps; artifact links.
- **CD3 — Timeline + narrative export** (2 pts)  
  _AC:_ PDF/MD export; cited artifacts; share link.

### Epic CE — SOAR v2.6 (Beta) — **12 pts**

- **CE1 — Marketplace adapters & matrix** (4 pts)  
  _AC:_ EDR/email/proxy; health checks; fallbacks.
- **CE2 — SLO + cost‑aware routing** (5 pts)  
  _AC:_ scoring function; blue/green; failover drill; alarms.
- **CE3 — Optimizer learn‑from‑approvals (recommend‑only)** (3 pts)  
  _AC:_ savings estimate; simulation link; approval required.

### Epic CF — Intel v6.0 Foundations — **6 pts**

- **CF1 — Uncertainty + trust calibration** (3 pts)  
  _AC:_ reliability diagrams; UI surfacing; tests.
- **CF2 — Guarded online learning pipeline** (3 pts)  
  _AC:_ shadow; write gates; rollback; reviewer dashboard.

### Epic CG — Operational Analytics & Enablement — **2 pts**

- **CG1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- Policy catalogs current; approver groups staffed; CI gates active.
- Graph identity/asset data fresh ≤ 24h; permissions enforced; storage for artifacts with retention policy.
- Multi‑vendor credentials/quotas approved; latency/cost telemetry sources wired.
- Legal/privacy approvals for online learning pipeline; PII exclusions enforced; budget alerts set.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Apr 27** — Planning & Kickoff; Studio/Workspace safety review (30m).
- **Fri May 1** — Mid‑sprint demo/checkpoint (30m).
- **Wed May 6** — Grooming for next sprint (45m).
- **Fri May 8** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Studio feature list locked; risk factors/thresholds documented; datasets ready.
- Workspace artifact schemas defined; retention/chain‑of‑custody policy reviewed.
- Routing rules/weights drafted; rollback plans prepared; optimizer guardrails set.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Policy Studio:** backtests; CI simulations; auto‑PR diff review (20 samples); exception flow audit.
- **Graph Workspaces:** artifact hash verification; timeline/narrative correctness checks; permission tests.
- **SOAR:** routing decision sampling vs SLAs/cost; vendor failover drill; optimizer A/B with human reviewers.
- **Intel:** κ/Brier monitoring; trust calibration reliability plots; online‑learning gates; drift alert tests.

---

## 11) Risk Register (RAID)

| Risk                                     | Prob. | Impact | Owner | Mitigation                                 |
| ---------------------------------------- | ----- | -----: | ----- | ------------------------------------------ |
| Studio alpha enables risky edits         | Low   |   High | CC1   | Preview/simulation; approvals; kill‑switch |
| Evidence handling violates retention     | Low   |   High | CD2   | Policy checks; encryption; audits          |
| Routing misconfig increases latency/cost | Low   |   High | CE2   | Staged rollout; health checks; rollback    |
| Optimizer recommends unsafe savings      | Low   |   High | CE3   | Recommend‑only; human approval; simulator  |
| Online learning drifts                   | Low   |   High | CF2   | Shadow + gates; instant rollback           |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; Studio adoption; Workspace usage; auto‑approve %; cost/action; κ/Brier; vendor health.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- Artifact storage encrypted; retention respected; chain‑of‑custody logged.
- SOAR destructive steps always HITL; blue/green rollouts; reason codes required.

---

## 14) Release & Rollback

- **Staged rollout:** Internal → all analysts → selected tenants (if applicable).
- **Rollback:** Disable Studio alpha; hide Workspaces; revert to cost‑neutral routing; disable optimizer learning; pin intel to v5.7 static.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (May 11–22, 2026)

- **Policy Studio v2.0 (beta):** policy packs, change proposals, cross‑env promotion.
- **Graph v3.0 (beta):** workspace templates, graph DSL, evidence diffing.
- **SOAR v2.7:** optimizer online learning (guarded), vendor benchmarking & auto‑selection.
- **Intel v6.1:** calibrated ensembles, reviewer incentive metrics, federation 85% target.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
