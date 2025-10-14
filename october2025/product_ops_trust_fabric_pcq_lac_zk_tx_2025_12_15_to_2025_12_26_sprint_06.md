# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)
**Cadence:** 2‑week sprint (Dec 15–Dec 26, 2025)
**Ordinal:** Sprint 06 (post‑GA stabilization → v1.1)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Aligned Streams:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success, Compliance

---

## 0) TL;DR
Post‑GA hardening and v1.1 groundwork:
1) **PCQ v1.6**: adaptive sampling (goal **10–12%**), **delta triage workbench**, and **provenance backfill** for legacy artifacts.
2) **LAC v1.1**: policy efficacy analytics, **change‑risk model v2**, deeper **data‑minimization presets**, and **author templates**.
3) **ZK‑TX v1.1**: **self‑serve partner onboarding**, fairness monitors, **quota shaping**, and **regression guardrails**.

Ops: Support SLOs, incident retros baked, cost/SLO budgets tuned, **SDKs + quickstarts** for dev adoption.

---

## 1) Inputs
- GA release complete (Sprint 05).  
- Feedback from pilots, on‑call drills, and policy authors.  
- Compliance packet v1.0 submitted; gap list is empty.

---

## 2) Sprint Goal
> “Stabilize GA in the wild and seed v1.1: scale continuous verification, measure and improve policy impact, and make partner onboarding self‑serve.”

**DoD (Sprint 06):**
- PCQ sampler stable at **≥10%** average without SLO breach; delta workbench used in two real incidents; legacy provenance backfilled ≥ 85%.
- LAC analytics dashboard online (block/allow rates, FP/FN trends, minimization coverage); **risk model v2** shipping; author templates available.
- ZK‑TX self‑serve onboarding flow live (invite, keys, quotas); fairness monitors running; guardrail tests protect GA endpoints.
- SDKs (CLI + Python/TS) updated; docs and quickstarts live; cost & SLO budgets green.

---

## 3) OKRs
- **O1: Integrity at Scale**  
  **KR1.1** PCQ sampling **10–12%** p50; no SLO regressions; false‑positive pages **<0.8%**.  
  **KR1.2** Delta triage workbench reduces MTTR by **25%** vs GA baseline.  
  **KR1.3** Legacy provenance backfill coverage **≥85%** of eligible artifacts.
- **O2: Safer, Faster Policy Evolution**  
  **KR2.1** Policy efficacy dashboard adopted by 5 teams; **0 FN** on expanded **400‑case** corpus; FP **≤2%**.  
  **KR2.2** Change‑risk model v2 correlates with post‑promotion deltas (AUC **≥0.75**).
- **O3: Partner Scale & Fairness**  
  **KR3.1** Self‑serve onboarding time **< 30 min**; two new partners onboarded.  
  **KR3.2** Fairness monitors show **Gini ≤ 0.2** for throttling across tenants.
- **O4: Dev Adoption & Cost**  
  **KR4.1** SDK quickstarts complete in **<15 min** by 8/8 new users.  
  **KR4.2** Cost per 1k proofs **−10%** vs GA with SLO constant.

---

## 4) Scope — Epics & Stories
### Epic T — PCQ v1.6 (Adaptive + Workbench + Backfill)
- **T1. Adaptive Sampler 10–12%**  
  *Stories:* dynamic target bands, SLO‑aware throttle, maintenance windows, per‑tenant caps.  
  *AC:* stable ≥10% avg; no SLO breach over 5‑day soak.
- **T2. Delta Triage Workbench**  
  *Stories:* UI for diff clustering, root‑cause hints, playbook links; export incident bundle.  
  *AC:* used in ≥2 incidents; MTTR −25% vs baseline.
- **T3. Provenance Backfill**  
  *Stories:* batch replays to emit manifests for legacy artifacts; idempotent; progress tracker.  
  *AC:* ≥85% backfilled; report exported.

### Epic U — LAC v1.1 (Efficacy, Risk v2, Minimization)
- **U1. Policy Efficacy Dashboard**  
  *Stories:* block/allow trends, FP/FN markers, author drill‑downs, coverage map for minimization transforms.  
  *AC:* 5 teams adopt; weekly report auto‑posts.
- **U2. Change‑Risk Model v2**  
  *Stories:* features from historical diffs, author history, affected datasets; calibrated risk bands.  
  *AC:* AUC ≥0.75; release notes show risk + rollback plan.
- **U3. Minimization Presets & Templates**  
  *Stories:* policy snippets for masking, bucketing, top‑k; Studio templates in multiple locales.  
  *AC:* presets cover 90% of Tier‑1/2 use; lints enforce usage.

### Epic V — ZK‑TX v1.1 (Self‑Serve + Fairness + Guards)
- **V1. Partner Onboarding Flow**  
  *Stories:* invite → key exchange → quota defaults → evidence bundle preview → acceptance.  
  *AC:* two partners complete <30m with checklist.
- **V2. Fairness Monitors**  
  *Stories:* per‑tenant throughput Gini, burst credit accrual, alerting on skew.  
  *AC:* dashboards live; Gini ≤ 0.2 under load.
- **V3. Regression Guardrails**  
  *Stories:* golden proof suite; contract tests; error taxonomy checks in CI.  
  *AC:* CI gate red on taxonomy regressions; GA endpoints stable.

### Epic W — DevEx/Enablement (SDKs, Docs, Cost)
- **W1. SDK Updates & Quickstarts**  
  *Stories:* CLI + Python/TS wrappers for PCQ/LAC/ZK‑TX; runnable examples; copy‑paste snippets.  
  *AC:* 8/8 new users complete quickstart <15m; feedback loop added.
- **W2. FinOps Guardrails**  
  *Stories:* cost vs SLO dashboards; optimization playbook (caching, batching, quotas).  
  *AC:* −10% cost/1k proofs at equal SLO.
- **W3. Support SLOs & Bug Bash**  
  *Stories:* tiered support SLOs; triage labels; bug bash focused on authoring & portal UX.  
  *AC:* SLO doc published; 25 issues triaged/closed.

---

## 5) Day‑by‑Day Plan
**W1 Mon–Tue**  
- Adaptive sampler controls; start provenance backfill; efficacy dashboard skeleton.  
**W1 Wed–Thu**  
- Delta workbench MVP; risk model v2 features; partner onboarding flow scaffold; SDK quickstarts draft.  
**W1 Fri**  
- Golden proof suite; fairness metrics; bug‑bash planning; cost baseline capture.

**W2 Mon–Tue**  
- Sampler tuning to 10–12%; workbench UX pass; dashboard adoption sessions; quickstarts usability test.  
**W2 Wed–Thu**  
- Partner self‑serve rehearsal; CI contract tests wired; FinOps playbook enacted; backfill report.  
**W2 Fri**  
- Freeze v1.1 seed; demo; retro; roll over remaining backfill to background jobs.

---

## 6) RACI
| Area | Driver (R) | Approver (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| Adaptive sampler & workbench | DevEx Lead | Chief Architect | SRE, Analytics | All |
| Provenance backfill | DevEx | PM | SRE | All |
| Policy analytics & risk v2 | Platform Eng Lead | Security Lead | PM, Data Gov | All |
| Minimization presets | Platform Eng | Security Lead | Design, Locales | All |
| Self‑serve onboarding | Security Lead | CTO | Partners, Legal | All |
| Fairness monitors & guards | Security Lead | CTO | SRE | All |
| SDKs & quickstarts | DevEx Lead | PM | Design, Docs | All |
| FinOps guardrails | SRE Lead | CTO | Finance Eng | All |

---

## 7) Ceremonies & Cadence
- **Daily Stand‑up:** 10:05–10:20 MT  
- **Policy Window:** Tue/Thu 13:00–14:00 MT  
- **Bug Bash:** Thu Dec 18, 14:00 MT  
- **Review/Demo:** Fri Dec 26, 11:30 MT  
- **Retro:** Fri Dec 26, 15:30 MT

---

## 8) Backlog — Sprint 06 (Committed)
**PCQ**  
- [ ] Adaptive sampling 10–12%; workbench; backfill ≥85%.

**LAC**  
- [ ] Efficacy dashboard; risk v2; minimization presets & templates.

**ZK‑TX**  
- [ ] Self‑serve onboarding; fairness monitors; regression guardrails.

**DevEx/Ops**  
- [ ] SDK updates + quickstarts; FinOps −10%; support SLOs; bug bash.

---

## 9) Acceptance Packs
- **PCQ:** sampling & SLO graphs; two incident bundles; backfill report.  
- **LAC:** dashboard screenshots; AUC report; template library.  
- **ZK‑TX:** onboarding checklist; fairness dashboards; CI guardrail logs.  
- **DevEx/Ops:** quickstart survey, cost report, SLO doc; bug bash tally.

---

## 10) Test Strategy
- **Unit/Contract:** sampler logic; diff clustering; risk model outputs; quota/fairness checks.  
- **E2E:** prod sample→workbench→playbook; authoring→promotion with risk v2; partner self‑serve→quota/fairness.  
- **Perf:** sampler overhead; portal/workbench p95; proof QPS steady‑state.  
- **Security:** guardrail regressions, onboarding key exchange, minimization lints.

---

## 11) Risks & Mitigations
- **W1: Backfill cost spikes.** → Throttle windows; reserve capacity; pause switch.  
- **W2: Risk v2 overfits.** → Cross‑validation; monotonic constraints; human overrides.  
- **W3: Self‑serve confusion.** → Guided checklists; inline help; fallback concierge.

---

## 12) Release Notes (Planned v1.1 Seed)
- PCQ: adaptive sampling to 10–12%, delta workbench, legacy backfill.  
- LAC: efficacy analytics, change‑risk v2, minimization presets & templates.  
- ZK‑TX: self‑serve onboarding, fairness monitors, regression guardrails.  
- DevEx/Ops: SDKs, quickstarts, FinOps guardrails, support SLOs.

---

## 13) Templates & Scaffolding
- `pcq/workbench/README.md`  
- `pcq/backfill/runner.yaml`  
- `lac/analytics/dashboards.json`  
- `lac/policies/templates/`  
- `zk-tx/onboarding/checklist.md`  
- `zk-tx/tests/golden/`  
- `sdk/quickstarts/python.md`, `sdk/quickstarts/typescript.md`  
- `ops/finops/playbook.md`, `ops/support/SLOs.md`

— **End of Workstream Packet (Sprint 06 • v1.1 seed)** —

