# Sprint Plan — May 25–Jun 5, 2026 (America/Denver)

> **Context:** Eleventh sprint of 2026. U.S. **Memorial Day (Mon May 25)** reduces capacity. Convert April/May betas into GA‑ready systems with governance, performance, and cost/risk controls.

---

## 1) Sprint Goal (SMART)

Prepare **Policy Studio v2.0 for GA** (hardening + import/export + audit quality), advance **Graph v3.0 (beta2)** with **DSL v0.1** and **workspace sharing/case bundles**, ship **SOAR v2.8** (optimizer explanations **GA**, vendor marketplace contract/pricing integration), and deliver **Intel v6.2** (trust dashboards + reviewer routing incentives + federation **90%**) to achieve **MTTC P50 ≤ 4.8 min / P90 ≤ 12.0 min**, **auto‑approved low‑risk actions ≥ 66%** with **false‑allow = 0**, and **automation cost/action ↓ 23% vs March** — **by Jun 5, 2026**.

**Key outcomes**

- Policy Studio hardened with import/export, promotion safeguards, and improved audit readability.
- Graph DSL upgraded (path operators, filters), **workspace sharing**, and **case bundles** for repeatable investigations.
- SOAR optimizer provides **human‑readable “why” explanations**; vendor marketplace connects to contracts/pricing with approval gates.
- Intel trust dashboards surface calibration/uncertainty; reviewer incentives tuned; federation reaches **90%** (guarded).

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 4.8 min**, **P90 ≤ 12.0 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Policy Studio readiness:** **≥ 85%** of policy changes via Studio; promotion errors **= 0** in staging; audit readability score ↑ (time‑to‑understand −30%).  
  _Verify:_ Studio telemetry; promotion logs; time‑and‑motion study.
- **Automation & cost:** auto‑approve (low‑risk) **≥ 66%**; mean cost/action **↓ 23%** vs March; budget breaches **= 0**.  
  _Verify:_ SOAR logs; cost dashboards; alerts.
- **Graph adoption:** **≥ 84%** of P1/P2 investigations use Workspaces or DSL; **≥ 50%** attach case bundles; narrative exports in **≥ 46%**.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.87**; Brier **≤ 0.11**; override rate **≤ 5.9%**; trust reliability slope ≤ 1.1; **90% federation** stable (guarded).  
  _Verify:_ Eval reports; trust dashboard; drift monitors.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Studio v2.0 (GA prep):** import/export policy packs; promotion guardrails (pre‑commit sim, approvals, rollbacks); audit readability (structured diffs + evidence links); accessibility and performance polish.
- **Graph v3.0 (beta2):** DSL **v0.1** with path operators & advanced filters; **workspace sharing** (permissions/audit); **case bundles** (template + evidence + notes) with versioning; evidence diff polish.
- **SOAR v2.8:** optimizer **explanations GA** (drivers, savings, risk constraints); vendor marketplace connected to contract/pricing APIs; human approval for vendor switch; SLO/cost/risk routing refinements.
- **Intel v6.2:** trust dashboards (calibration, reliability plots, confidence bands); reviewer routing incentives (quality + SLA weight); **federation 90%** sample (guarded) with isolation, PII filters, and budget caps.
- **Operational analytics:** weekly exec snapshot; Studio/Workspace adoption; auto‑approve%; cost per action; calibration & reviewer metrics.

**Stretch:**

- Policy Studio **policy diff annotations** (auto‑summaries).
- Graph **DSL editor UX** (autocomplete/snippets).
- SOAR **budget planner** (forecast cost vs policy changes).
- Intel **uncertainty‑aware triage** (flag low‑confidence for human first).

**Out‑of‑scope:**

- Studio GA release (target next sprint); destructive automation default‑on; cross‑tenant policy editing; optimizer auto‑exec.

---

## 4) Team & Capacity (holiday‑adjusted)

- **Working days:** 9 (Memorial Day May 25).
- **Focus factor:** 0.8.
- **Nominal ~50 pts → Commit ≈ 36 pts** (+ up to 6 pts stretch).

---

## 5) Backlog (Ready for Sprint)

### Epic CM — Policy Studio v2.0 (GA Prep) — **12 pts**

- **CM1 — Import/export policy packs** (4 pts)  
  _AC:_ versioned; schema checks; audit trail.
- **CM2 — Promotion guardrails & rollbacks** (5 pts)  
  _AC:_ sim on submit; approvals; blue/green; rollback docs.
- **CM3 — Audit readability & perf/accessibility** (3 pts)  
  _AC:_ structured diffs; evidence links; a11y; latency targets.

### Epic CN — Graph v3.0 (Beta2) — **10 pts**

- **CN1 — DSL v0.1 (paths + filters)** (4 pts)  
  _AC:_ path ops; saved queries; perms; tests.
- **CN2 — Workspace sharing** (3 pts)  
  _AC:_ team/role perms; audit; share links.
- **CN3 — Case bundles + evidence diff polish** (3 pts)  
  _AC:_ versioned bundles; export; diff UX.

### Epic CO — SOAR v2.8 — **10 pts**

- **CO1 — Optimizer explanations GA** (4 pts)  
  _AC:_ driver list; savings; constraints; UI.
- **CO2 — Marketplace contracts/pricing integration** (4 pts)  
  _AC:_ API adapters; approval gate; audit.
- **CO3 — Routing refinements (SLO/cost/risk)** (2 pts)  
  _AC:_ weights; canary; alarms.

### Epic CP — Intel v6.2 — **6 pts**

- **CP1 — Trust dashboards** (3 pts)  
  _AC:_ calibration plots; confidence bands; export.
- **CP2 — Reviewer incentives + federation 90%** (3 pts)  
  _AC:_ quality/SLA scores; guarded ingest; calibration.

### Epic CQ — Operational Analytics & Enablement — **2 pts**

- **CQ1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 40 pts total — **commit 36 pts**, hold 4 pts buffer; + up to 6 pts stretch.

---

## 6) Dependencies & Assumptions

- CI gates active; approver groups staffed; policy catalogs current.
- Graph data fresh ≤ 24h; permissions enforced; artifact retention confirmed.
- Contract/pricing API access granted; budgets configured; routing telemetry wired.
- Partner privacy/legal approvals current; federation traffic isolated; cost alerts set.

---

## 7) Timeline & Ceremonies (MT)

- **Tue May 26** — Planning & Kickoff; GA readiness review (30m).
- **Fri May 29** — Mid‑sprint demo/checkpoint (30m).
- **Wed Jun 3** — Grooming for next sprint (45m).
- **Fri Jun 5** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Import/export specs; promotion flows documented; thresholds set.
- DSL v0.1 grammar drafted; sharing perms mapped.
- Marketplace contract/pricing endpoints; trust dashboard metrics defined.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Studio:** import/export round‑trip tests; promotion dry‑runs; audit readability sampling.
- **Graph:** DSL query correctness; sharing permission tests; bundle export checks.
- **SOAR:** optimizer explanation accuracy review; vendor switch approval flow; routing canary vs SLAs/cost.
- **Intel:** trust calibration plots; reviewer metric sanity; federation calibration & budget alerts.

---

## 11) Risk Register (RAID)

| Risk                                | Prob. | Impact | Owner | Mitigation                             |
| ----------------------------------- | ----- | -----: | ----- | -------------------------------------- |
| Import/export schema drift          | Med   |    Med | CM1   | Versioning; validators; fallbacks      |
| DSL query leakage via sharing       | Low   |   High | CN2   | Perms; redaction; audit                |
| Pricing API instability             | Med   |    Med | CO2   | Caching; retries; manual approval gate |
| Trust metrics misinterpreted        | Med   |    Med | CP1   | Tooltips; docs; training               |
| Memorial Day PTO reduces throughput | High  |    Med | PM    | Lower commit; strict WIP; daily triage |

---

## 12) Communications & Status

- **Channels:** #sprint‑room (daily), #analyst‑ops (enablement), Exec update (Fri).
- **Reports:** Burnup; MTTC; Studio/Workspace adoption; auto‑approve %; cost/action; calibration; vendor health.

---

## 13) Compliance/Security Guardrails

- Signed policy changes; immutable audit; least privilege; no PII in model features.
- Artifact storage encrypted; retention respected; chain‑of‑custody logged.
- SOAR destructive steps HITL; blue/green rollouts; reason codes required.

---

## 14) Release & Rollback

- **Staged rollout:** Internal → all analysts → selected tenants (if applicable).
- **Rollback:** Disable Studio import/export; restrict sharing/DSL; force manual vendor selection; pin intel to static v6.0 models.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Jun 8–19, 2026)

- **Policy Studio v2.0 GA** + policy pack marketplace (internal).
- **Graph v3.0 (GA prep):** workspace sharing GA; DSL v0.2; evidence retention tooling.
- **SOAR v2.9:** optimizer exploration (guarded), contract‑aware budgeting, SLA‑aware auto‑selection.
- **Intel v6.3:** trust‑aware triage ordering; federation 95% target (guarded).

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
