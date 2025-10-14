# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)
**Cadence:** 2‑week sprint (Feb 16–Feb 27, 2026)
**Ordinal:** Sprint 10 (v1.3 release → v1.4 scope)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Aligned Streams:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success, Compliance/Legal

---

## 0) TL;DR
Convert PSI pilots into **limited GA**, expand **trust explainability**, and raise **reliability ceilings**:
1) **ZK‑TX v1.4**: PSI/PSI‑CA **limited GA** behind allowlist; per‑tenant **privacy budgets**; throughput target **600 RPS**.  
2) **LAC v1.4**: **explainability timeline** for policies (before/after impacts), **typed policy macros**, and **author guard‑rails** (lint‑as‑you‑type).  
3) **PCQ v2.0**: **causal lineage drill‑down**, **scenario replay** (what‑if manifests), and **tenant SLA conformance** dashboards.

Ops: fairness SLO automation, **golden canary** track, quarterly compliance snapshot, and partner rollout guides for limited GA.

---

## 1) Inputs & Carry‑Ins
- Sprint 09: PSI pilot controls, proof explainers, 550 RPS soak, root‑cause insights + auto‑merge, PCQ anomaly explorer, suppression rules, fairness SLO, gameday #2.
- Carry‑ins: finalize two partner MOUs; suppression rule audits; open items on Studio coaching copy.

---

## 2) Sprint Goal & Non‑Negotiables
**Goal:**
> “Graduate PSI to **limited GA**, make policies and provenance **narratively explainable**, and keep reliability green at **600 RPS**.”

**DoD (Sprint 10):**
- ZK‑TX: PSI **limited GA** (allowlist + budgets + quotas); **600 RPS** sustained p95 < 900ms, error < 0.25%; evidence bundles include explainer & privacy budget receipts.  
- LAC: policy **timeline explainers** ship; typed **macros** in Studio; guard‑rails enforce lint‑as‑you‑type; revert rate shrinks again.  
- PCQ: **causal drill‑down** ties deltas to upstream code/data/policy; **what‑if replay** for 3 templates; tenant **SLA dashboards** live.  
- Ops/Partner: golden canary lane active; fairness SLO alerts automated; compliance snapshot vQ1 prepared; partner rollout kit for limited GA.

---

## 3) OKRs
- **O1: PSI Limited GA**  
  **KR1.1** Two partners enabled on limited GA; **privacy budgets** enforced with dashboards.  
  **KR1.2** Sustained **600 RPS** for 60 min; p95 < 900ms; error < 0.25%; fairness Gini ≤ 0.15.
- **O2: Narrative Explainability**  
  **KR2.1** 90% of policy changes show **timeline diffs** with human‑readable reasons.  
  **KR2.2** PCQ **causal drill‑down** reduces MTTR by **30%** in on‑call drills.  
- **O3: Author Velocity & Safety**  
  **KR3.1** 70% of new policies use **typed macros**; lint‑as‑you‑type cuts author errors by **40%**.  
  **KR3.2** Revert rate **−15%** vs Sprint 09, SUS ≥ 85.
- **O4: Operational Confidence**  
  **KR4.1** Golden canary detects true deltas with **<1%** false alarms; automated fairness alerts page within **5 min**.  
  **KR4.2** Compliance Q1 snapshot complete; zero outstanding P0 gaps.

---

## 4) Scope — Epics & Stories
### Epic AJ — ZK‑TX v1.4 (Limited GA + Budgets + 600 RPS)
- **AJ1. Limited GA Controls**  
  *Stories:* allowlist, per‑tenant toggles, contract flags, API headers; evidence bundle updates.  
  *AC:* two partners live; bundles include budget receipts.
- **AJ2. Privacy Budgets**  
  *Stories:* per‑tenant epsilon/queries counters (conceptual, non‑DP hard); alerts & resets; UI in portal.  
  *AC:* budget bars visible; alerts tested; audit trail maintained.
- **AJ3. Throughput to 600 RPS**  
  *Stories:* planner v3, adaptive cache, cold‑start warmers, shard balancing.  
  *AC:* 600 RPS x 60 min, p95 <900ms, error <0.25%; fairness Gini ≤0.15.

### Epic AK — LAC v1.4 (Timelines + Macros + Guard‑Rails)
- **AK1. Policy Timeline Explainers**  
  *Stories:* visualize before/after impacts, affected datasets/users, minimization deltas.  
  *AC:* 90% promotions show timeline; links in audit logs.
- **AK2. Typed Policy Macros**  
  *Stories:* reusable typed macros for residency, graph caps, minimization; versioned & tested.  
  *AC:* 70% new policies via macros; lint catches mis‑types early.
- **AK3. Lint‑as‑You‑Type Guard‑Rails**  
  *Stories:* instant checks in Studio; severity badges; quick‑fixes.  
  *AC:* author errors −40%; SUS ≥85.

### Epic AL — PCQ v2.0 (Causal + What‑If + SLA)
- **AL1. Causal Drill‑Down**  
  *Stories:* map delta → code/library/policy/input change; clickable causal chain.  
  *AC:* drill‑down resolves root cause in ≤5 clicks.
- **AL2. Scenario Replay (What‑If)**  
  *Stories:* templated replays (library pin, seed change, policy tweak); produce manifests for comparison.  
  *AC:* 3 templates available; HTML diff attached to CI.
- **AL3. Tenant SLA Dashboards**  
  *Stories:* per‑tenant verify rate, replay latency, incident MTTA/MTTR; SLO burn‑rate.  
  *AC:* dashboards live; exec view weekly.

### Epic AM — Ops/Partner/Compliance (Golden Canary + Alerts + Snapshot)
- **AM1. Golden Canary Track**  
  *Stories:* dedicated environment with shadow traffic; delta comparators; pager policies.  
  *AC:* <1% false alarms; true deltas page within 5 min.
- **AM2. Fairness Alert Automation**  
  *Stories:* alert rules from SLO; escalation ladder; playbooks.  
  *AC:* synthetic skew triggers; MTTA <5m.
- **AM3. Q1 Compliance Snapshot**  
  *Stories:* collect artifacts (SBOMs, logs, proofs, policies), generate report; partner‑facing summary.  
  *AC:* packet delivered; zero P0 gaps.
- **AM4. Limited GA Rollout Kit**  
  *Stories:* contracts checklist, budget settings guide, support workflows, FAQs.  
  *AC:* used for both partners; feedback logged.

---

## 5) Day‑by‑Day Plan
**W1 Mon–Tue**  
- Allowlist & flags; timeline explainers scaffold; causal drill‑down mapping; canary env baseline.  
**W1 Wed–Thu**  
- Privacy budgets UI; typed macros; what‑if replay template #1; fairness alerts wiring.  
**W1 Fri**  
- Perf run 570–590 RPS; Studio quick‑fixes; SLA dashboards skeleton; compliance snapshot outline.

**W2 Mon–Tue**  
- Push to 600 RPS; bundle receipts; macros usage tracking; drill‑down polish; canary drill.  
**W2 Wed–Thu**  
- Partner enablement; what‑if templates #2/#3; dashboards live; snapshot assembly.  
**W2 Fri**  
- Freeze v1.4 scope; publish artifacts; retro; backlog seed for Sprint 11.

---

## 6) RACI
| Area | Driver (R) | Approver (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| Limited GA & budgets | Security Lead | CTO | Legal, Partners, SRE | All |
| Throughput & fairness | Security Lead | CTO | SRE, Finance Eng | All |
| Timelines & macros | Platform Eng Lead | Security Lead | PM, Data Gov | All |
| Guard‑rails UX | Platform Eng | PM | Design | All |
| Causal/What‑If/SLA | DevEx Lead | Chief Architect | Analytics, SRE | All |
| Golden canary & alerts | SRE Lead | CTO | Security | All |
| Compliance snapshot | PM (Elara) | CTO | Security, Legal, Audit | All |

---

## 7) Ceremonies & Cadence
- **Daily Stand‑up:** 10:05–10:20 MT  
- **Change Windows:** Tue/Thu 13:00–14:00 MT  
- **Canary Drill:** Thu Feb 26, 14:00 MT  
- **Review/Demo:** Fri Feb 27, 11:30 MT  
- **Retro:** Fri Feb 27, 15:30 MT

---

## 8) Backlog — Sprint 10 (Committed)
**ZK‑TX**  
- [ ] Limited GA + privacy budgets + 600 RPS.  
**LAC**  
- [ ] Timelines, typed macros, lint‑as‑you‑type.  
**PCQ**  
- [ ] Causal drill‑down, what‑if replays, SLA dashboards.  
**Ops/Partner/Compliance**  
- [ ] Golden canary, fairness alerts, Q1 snapshot, rollout kit.

---

## 9) Acceptance Packs
- **ZK:** enablement proofs, budget receipts, 600 RPS report, fairness snapshots.  
- **LAC:** timelines screenshots, macro usage stats, author error deltas.  
- **PCQ:** causal path demo, what‑if diffs, SLA dashboards.  
- **Ops:** canary alarm stats, compliance packet, rollout kit PDF.

---

## 10) Test Strategy
- **Unit/Contract:** allowlist flags; budget counters; macro typing; causal mapping; alert rules.  
- **E2E:** PSI GA flow→bundle receipt; authoring→lint→macro→promotion; replay→what‑if→diff; canary→page.  
- **Perf:** soak at 600 RPS; fairness Gini; Studio latency under lint.  
- **Security:** budget abuse, macro injection, canary tamper.

---

## 11) Risks & Mitigations
- **S10.1: Budget semantics confusion.** → Clear docs, warnings, safe defaults, hard caps.  
- **S10.2: 600 RPS instability.** → Shard balancing, pre‑warmers, staged ramps, circuit breakers.  
- **S10.3: Lint noise.** → Severity tuning, suppressions with expiry, author telemetry.

---

## 12) Release Notes (Planned v1.4)
- PSI limited GA with privacy budgets and 600 RPS capacity.  
- Policy timelines, typed macros, lint‑as‑you‑type guard‑rails.  
- PCQ causal drill‑down, what‑if replay templates, tenant SLA dashboards.  
- Golden canary, automated fairness alerts, Q1 compliance snapshot.

---

## 13) Templates & Scaffolding
- `zk-tx/ga/allowlist.yaml`  
- `zk-tx/privacy/budgets.md`  
- `lac/studio/timelines/README.md`  
- `lac/macros/catalog.ts`  
- `pcq/causal/README.md`  
- `pcq/what-if/templates/`  
- `ops/canary/runbook.md`  
- `compliance/Q1-snapshot/checklist.md`  
- `partners/limited-ga/rollout-kit.md`

— **End of Workstream Packet (Sprint 10 • v1.4 scope)** —

