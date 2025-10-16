# Sprint Plan — Jun 8–19, 2026 (America/Denver)

> **Context:** Twelfth sprint of 2026. Convert May betas into durable **GA** experiences with strong governance, performance, and cost/risk controls.

---

## 1) Sprint Goal (SMART)

Release **Policy Studio v2.0 (GA)** with an **internal Policy Pack Marketplace**, advance **Graph v3.0 (GA prep)** with **DSL v0.2**, **workspace sharing GA**, and **evidence retention tooling**, ship **SOAR v2.9** (optimizer **exploration** mode _guarded_, **contract‑aware budgeting**, **SLA‑aware auto‑selection**), and deliver **Intel v6.3** (trust‑aware triage ordering + **federation 95%**) to achieve **MTTC P50 ≤ 4.6 min / P90 ≤ 11.8 min**, **auto‑approved low‑risk actions ≥ 67%** with **false‑allow = 0**, and **automation cost/action ↓ 24% vs March** — **by Jun 19, 2026**.

**Key outcomes**

- Studio GA: unified authoring → simulation → governance → promotion; marketplace for internal policy packs with moderation + telemetry.
- Graph GA prep: DSL v0.2 (path operators, filters), workspace sharing **GA**, case bundle retention/immutability.
- SOAR v2.9: optimizer **exploration** (guarded A/B) + contract‑aware budgets + SLA‑aware vendor/region auto‑selection.
- Intel v6.3: trust‑aware **triage ordering** prioritizes low‑confidence/high‑impact first; federation scaled to **95%** (guarded) with calibration.

---

## 2) Success Metrics & Verification

- **Incident response:** MTTC **P50 ≤ 4.6 min**, **P90 ≤ 11.8 min** (7‑day rolling).  
  _Verify:_ Incident dashboard; weekly export.
- **Studio adoption & quality:** **≥ 85%** of policy changes via Studio; promotion errors **= 0** in staging; audit readability ↑ (time‑to‑understand −30%).  
  _Verify:_ Studio telemetry; promotion logs; time‑and‑motion study.
- **Automation & cost:** auto‑approve (low‑risk) **≥ 67%**; mean cost/action **↓ 24%** vs March; budget breaches **= 0**.  
  _Verify:_ SOAR logs; cost dashboards; alerts.
- **Graph effectiveness:** **≥ 85%** of P1/P2 investigations use Workspaces/DSL; **≥ 55%** attach case bundles; workspace sharing used in **≥ 50%** of cases.  
  _Verify:_ UI telemetry; ticket linkage.
- **Intel quality:** κ **≥ 0.87**; Brier **≤ 0.11**; override rate **≤ 5.8%**; triage ordering lifts MTTC by **≥ 5%** vs control.  
  _Verify:_ Eval reports; calibration plots; A/B dashboard.

---

## 3) Scope

**Must‑have (commit):**

- **Policy Studio v2.0 (GA):**
  - GA rollout plan (staged cohorts, kill‑switch), accessibility/performance polish, governance checks (roles/approvals), and change history with simulation credit.
  - **Policy Pack Marketplace (internal):** pack submission → moderation → versioning; import/export; telemetry; security scans.
  - Promotion safeguards (pre‑commit sim, approvals, blue/green; rollback docs).
- **Graph v3.0 (GA prep):**
  - **DSL v0.2** (path operators, advanced filters) with saved queries + permissions.
  - **Workspace sharing GA** (team/role perms, share links, audit trail).
  - **Evidence retention tooling:** retention schedules, immutable bundle option, export with chain‑of‑custody.
- **SOAR v2.9:**
  - **Optimizer exploration (guarded):** A/B candidates; recommend‑only; human approval; drift/cost gates.
  - **Contract‑aware budgeting:** enforce vendor/tenant budgets using contract/pricing APIs; approval on breach.
  - **SLA‑aware auto‑selection:** choose vendor/region by composite (SLO + cost + risk); canary + failover drill.
- **Intel v6.3:**
  - **Trust‑aware triage ordering:** prioritize items by (impact × uncertainty) with analyst controls; dashboards.
  - **Federation 95% (guarded):** isolation; PII filters; budget caps; calibration monitoring.
- **Operational analytics:** exec weekly snapshot; Studio/Workspace adoption; auto‑approve%; cost/action; calibration/triage ordering panels.

**Stretch:**

- **Studio Marketplace: rating & search** (internal).
- **Graph DSL editor UX** (autocomplete/snippets).
- **SOAR budget planner** (forecast cost vs policy changes).
- **Intel uncertainty‑aware alert throttling (shadow).**

**Out‑of‑scope:**

- Customer‑visible Studio marketplace; destructive automation default‑on; cross‑tenant policy editing; optimizer auto‑exec.

---

## 4) Team & Capacity

- Same roster; **10 working days**; focus factor **0.8** → **commit 40 pts** (≈50 nominal); ~10% slack.

---

## 5) Backlog (Ready for Sprint)

### Epic CR — Policy Studio v2.0 (GA) — **12 pts**

- **CR1 — GA rollout & governance** (5 pts)  
  _AC:_ staged cohorts; a11y/perf; approvals; kill‑switch; audit.
- **CR2 — Policy Pack Marketplace (internal)** (5 pts)  
  _AC:_ submit/moderate/version; import/export; telemetry; scans.
- **CR3 — Promotion safeguards & docs** (2 pts)  
  _AC:_ pre‑commit sim; blue/green; rollback; runbooks.

### Epic CS — Graph v3.0 (GA prep) — **10 pts**

- **CS1 — DSL v0.2 (paths + filters)** (4 pts)  
  _AC:_ operators; saved queries; perms; tests.
- **CS2 — Workspace sharing GA** (3 pts)  
  _AC:_ team/role perms; share links; audit.
- **CS3 — Evidence retention tooling** (3 pts)  
  _AC:_ retention schedules; immutable option; export CoC.

### Epic CT — SOAR v2.9 — **12 pts**

- **CT1 — Optimizer exploration (guarded)** (4 pts)  
  _AC:_ A/B candidates; recommend‑only; gates; logs.
- **CT2 — Contract‑aware budgeting** (4 pts)  
  _AC:_ enforce budgets; approvals; reports.
- **CT3 — SLA‑aware auto‑selection** (4 pts)  
  _AC:_ composite score; canary; failover drill; alarms.

### Epic CU — Intel v6.3 — **6 pts**

- **CU1 — Trust‑aware triage ordering** (3 pts)  
  _AC:_ (impact × uncertainty) sort; toggles; dashboard.
- **CU2 — Federation 95% (guarded)** (3 pts)  
  _AC:_ isolation; PII filters; budget caps; calibration.

### Epic CV — Operational Analytics & Enablement — **2 pts**

- **CV1 — Exec snapshot + dashboards** (2 pts)  
  _AC:_ weekly PDF/email; KPIs; drill‑downs.

> **Planned:** 42 pts total — **commit 40 pts**, hold ~2 pts buffer.

---

## 6) Dependencies & Assumptions

- CI gates active; approver groups staffed; policy catalogs current.
- Graph data fresh ≤ 24h; permissions enforced; artifact retention policy approved.
- Contract/pricing API access stable; budget thresholds defined; routing telemetry wired.
- Partner privacy/legal approvals current; federation traffic isolated.

---

## 7) Timeline & Ceremonies (MT)

- **Mon Jun 8** — Planning & Kickoff; GA readiness review (30m).
- **Fri Jun 12** — Mid‑sprint demo/checkpoint (30m).
- **Wed Jun 17** — Grooming for next sprint (45m).
- **Fri Jun 19** — Demo (45m) + Retro (45m) + Release cut.

---

## 8) Definition of Ready (DoR)

- Marketplace moderation policy drafted; thresholds documented; datasets ready.
- DSL v0.2 grammar drafted; sharing perms mapped; retention schedules defined.
- Budget limits configured; SLA targets set; optimizer guardrails drafted.

## 9) Definition of Done (DoD)

- Tests pass; dashboards live; audits wired; approvals enforced.
- Runbooks updated; enablement notes posted; rollback paths tested.

---

## 10) QA & Validation Plan

- **Studio:** GA dry‑runs; import/export round‑trips; moderation tests; audit readability sampling.
- **Graph:** DSL query correctness; sharing permission tests; retention/immutability checks; CoC export verification.
- **SOAR:** routing decision sampling vs SLAs/cost; budget breach simulations; optimizer A/B (recommend‑only).
- **Intel:** κ/Brier monitoring; triage ordering A/B; federation calibration; budget alerts.

---

## 11) Risk Register (RAID)

| Risk                                     | Prob. | Impact | Owner | Mitigation                       |
| ---------------------------------------- | ----- | -----: | ----- | -------------------------------- |
| Marketplace introduces low‑quality packs | Med   |    Med | CR2   | Moderation; ratings; telemetry   |
| DSL v0.2 complexity confuses users       | Med   |    Med | CS1   | Editor UX; docs; examples        |
| SLA‑aware auto‑selection misroutes       | Low   |   High | CT3   | Canary; alarms; quick rollback   |
| Triage ordering biases priorities        | Low   |    Med | CU1   | Analyst overrides; audit; review |
| Budget API instability                   | Med   |    Med | CT2   | Caching; retries; approval gates |

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
- **Rollback:** Disable Studio marketplace; restrict DSL; force manual vendor selection; pin intel to static v6.1.
- **Docs:** Release notes; analyst changelog; change tickets.

---

## 15) Next Sprint Seeds (Jun 22–Jul 3, 2026)

- **Studio v2.0 (post‑GA):** pack marketplace curation; public docs; policy import from legacy.
- **Graph v3.0 (GA):** shareable workspace links, DSL v0.3 operators, retention dashboards.
- **SOAR v3.0 concept:** optimizer exploration GA; policy‑driven budget/SLA governance.
- **Intel v6.4:** uncertainty‑aware alert throttling GA; federation 98% target.

---

_Prepared by: Covert Insights — last updated Sep 11, 2025 (America/Denver)._
