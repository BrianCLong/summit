# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)

**Cadence:** 2‑week sprint (Feb 2–Feb 13, 2026)
**Ordinal:** Sprint 09 (v1.2 release → v1.3 scope)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Aligned Streams:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success, Compliance/Legal

---

## 0) TL;DR

Harden the **v1.2 PSI path**, expand partner capacity, and deepen **explainability** for policies & provenance:

1. **ZK‑TX v1.3**: PSI prototype → **pilot‑grade** with guardrails, quota shaping v2, and proof explainers; raise sustained throughput to **550 RPS**.
2. **LAC v1.3**: **root‑cause insights** for failed promotions (policy↔data diffs), **policy drift auto‑merge** with safeguards, and **author coaching** hints.
3. **PCQ v1.9**: **lineage‑aware anomaly explorer**, **cross‑job suppression rules** for known safe deltas, and exportable **tenant health rollups**.

Ops: **multi‑tenant fairness SLO**, **on‑call gameday #2**, and partner rollout toolkit for PSI pilots.

---

## 1) Inputs & Carry‑Ins

- From Sprint 08: PSI/PSI‑CA prototype, 500 RPS perf rig success, auto‑remediation PRs, streaming provenance, game‑day completed, v1.2 notes drafted.
- Carry‑ins: sign‑off follow‑ups from Legal/Privacy, triage thresholds, two backfill tails.

---

## 2) Sprint Goal & Non‑Negotiables

**Goal:**

> “Graduate PSI to **pilot‑grade**, boost throughput to **550 RPS**, and make trust events **explainable** to humans and auditors.”

**DoD (Sprint 09):**

- ZK‑TX PSI flows run with partner sandbox under **pilot controls** (feature flags, quotas, audits); perf soak **550 RPS** p95 < 900ms, error < 0.25%; proof explainer artifacts attached to bundles.
- LAC explains failed promotions with **root‑cause deltas**; safe auto‑merge resolves low‑risk drift; Studio shows **coaching hints**; revert rate reduced.
- PCQ anomaly explorer ties deltas to lineage; cross‑job suppression rules reduce repetitive benign pages; tenant health rollups exported weekly.
- Ops/SRE: fairness SLO formalized, on‑call gameday #2 complete, partner PSI rollout toolkit published.

---

## 3) OKRs

- **O1: PSI Pilot‑Grade**  
  **KR1.1** Privacy/Legal **pilot MOU** signed; logs verified clean of selectors.  
  **KR1.2** Sustained **550 RPS** for 45 min, p95 < 900ms, error < 0.25%.  
  **KR1.3** Proof explainer attached to **100%** PSI bundles.
- **O2: Policy Explainability & Velocity**  
  **KR2.1** 80% of failed promotions receive **root‑cause insight** automatically; time‑to‑fix **< 20 min** median.  
  **KR2.2** Auto‑merge clears **70%** of low‑risk drift with zero regressions.
- **O3: Anomaly Signal Quality**  
  **KR3.1** Suppression rules reduce repetitive benign pages by **≥40%** with no missed true positives.  
  **KR3.2** Tenant health rollups sent weekly with **>95% open/read** by owners.
- **O4: Fairness & Readiness**  
  **KR4.1** Fairness Gini **≤ 0.16** at 550 RPS; gameday yields zero SLO breaches.  
  **KR4.2** PSI pilot toolkit adopted by Partner Success; two partners scheduled for pilots.

---

## 4) Scope — Epics & Stories

### Epic AF — ZK‑TX v1.3 (PSI Pilot + 550 RPS + Explainability)

- **AF1. PSI Pilot Controls**  
  _Stories:_ feature flags, per‑tenant scopes, audit redaction, opt‑out toggles, MOU template.  
  _AC:_ pilot MOU signed; sandbox runs pass; controls verified.
- **AF2. Throughput to 550 RPS**  
  _Stories:_ batch planner v2 (predictive grouping), cache pre‑seed, quotas tuned, burst smoothing.  
  _AC:_ 550 RPS 45‑min soak; fairness Gini ≤ 0.16; error <0.25%.
- **AF3. Proof Explainers**  
  _Stories:_ human‑readable rationale, inputs provenance, constraint statement; export with bundles.  
  _AC:_ 100% PSI bundles include explainer; audit acceptance.

### Epic AG — LAC v1.3 (Explain + Auto‑Merge + Coach)

- **AG1. Root‑Cause Insights**  
  _Stories:_ compare policy graph + data snapshots; highlight failing constraints; suggest mitigations.  
  _AC:_ 80% failed promotions include insights; time‑to‑fix median <20m.
- **AG2. Safe Auto‑Merge for Drift**  
  _Stories:_ classify low‑risk drift; synthesize PRs with tests & rollback; require review.  
  _AC:_ 70% of low‑risk drift cleared; zero regressions on red‑team.
- **AG3. Coaching Hints**  
  _Stories:_ Studio tooltips & checklists for common errors; links to templates.  
  _AC:_ revert rate −20% vs Sprint 08; SUS ≥ 84.

### Epic AH — PCQ v1.9 (Anomaly Explorer + Suppression + Rollups)

- **AH1. Lineage‑Aware Explorer**  
  _Stories:_ tie anomalies to code/image/policy lineage; clickable paths; export CSV.  
  _AC:_ on‑call can trace root in ≤5 clicks.
- **AH2. Cross‑Job Suppression Rules**  
  _Stories:_ scoped, time‑boxed rules for known benign deltas; approval flow; audit trail.  
  _AC:_ benign pages −40%; no missed true positives in drills.
- **AH3. Tenant Health Rollups**  
  _Stories:_ weekly digest per tenant; KPIs (verify pass, policy blocks, ZK proofs, SLOs); archives.  
  _AC:_ >95% readership; action items tracked.

### Epic AI — Ops/Partner (Fairness SLO + Gameday + Toolkit)

- **AI1. Fairness SLO**  
  _Stories:_ codify target, dashboards, alerts, runbooks; exec sign‑off.  
  _AC:_ SLO document published; alert tests pass.
- **AI2. On‑Call Gameday #2**  
  _Stories:_ simulate quota contention + network jitter + policy drift; postmortem.  
  _AC:_ zero SLO breach; MTTA <10m.
- **AI3. PSI Pilot Toolkit**  
  _Stories:_ partner brief, runbook, support workflows, evidence checklist.  
  _AC:_ toolkit used by Partner Success; two pilots scheduled.

---

## 5) Day‑by‑Day Plan

**W1 Mon–Tue**

- PSI pilot controls & MOU; predictive batch planner; root‑cause insights scaffolding.  
  **W1 Wed–Thu**
- Proof explainer generator; suppression rules engine; fairness SLO draft; toolkit outline.  
  **W1 Fri**
- Perf run 520–540 RPS; Studio coaching hints; anomaly explorer MVP.

**W2 Mon–Tue**

- Soak at 550 RPS; MOU sign‑offs; auto‑merge pipeline; gameday prep.  
  **W2 Wed–Thu**
- Gameday #2; tenant health rollups automation; finalize toolkit; alert drills.  
  **W2 Fri**
- Freeze v1.3 scope; publish artifacts/demos; retro; seed Sprint 10 backlog.

---

## 6) RACI

| Area                    | Driver (R)        | Approver (A)    | Consulted (C)            | Informed (I) |
| ----------------------- | ----------------- | --------------- | ------------------------ | ------------ |
| PSI pilot & throughput  | Security Lead     | CTO             | Legal, SRE, Partners     | All          |
| Proof explainers        | Security Lead     | PM              | Audit, Docs              | All          |
| Root‑cause & auto‑merge | Platform Eng Lead | Security Lead   | PM, Data Gov             | All          |
| Coaching hints          | Platform Eng      | PM              | Design                   | All          |
| Explorer & suppression  | DevEx Lead        | Chief Architect | SRE, Analytics           | All          |
| Fairness SLO & gameday  | SRE Lead          | CTO             | Security, Finance Eng    | All          |
| PSI toolkit             | PM (Elara)        | CTO             | Partner Success, Support | All          |

---

## 7) Ceremonies & Cadence

- **Daily Stand‑up:** 10:05–10:20 MT
- **Change Windows:** Tue/Thu 13:00–14:00 MT
- **Gameday #2:** Thu Feb 12, 14:00 MT
- **Review/Demo:** Fri Feb 13, 11:30 MT
- **Retro:** Fri Feb 13, 15:30 MT

---

## 8) Backlog — Sprint 09 (Committed)

**ZK‑TX**

- [ ] PSI pilot controls + explainer + 550 RPS soak.  
       **LAC**
- [ ] Root‑cause insights; auto‑merge for low‑risk drift; coaching hints.  
       **PCQ**
- [ ] Anomaly explorer; suppression rules; tenant rollups.  
       **Ops/Partner**
- [ ] Fairness SLO; gameday #2; PSI pilot toolkit.

---

## 9) Acceptance Packs

- **PSI:** signed pilot MOU; soak test report; explainer examples; log scans.
- **Policy:** insights screenshots; auto‑merge PRs; revert rate delta.
- **Provenance:** explorer demo; suppression rule audit log; rollup snapshots.
- **Ops:** SLO doc; gameday postmortem; toolkit PDF.

---

## 10) Test Strategy

- **Unit/Contract:** PSI control flags; explainer composition; drift classifier; suppression ACLs.
- **E2E:** policy promotion fail→insight→fix; PSI proof→bundle→explainer; anomaly→explorer→suppression; fairness alerts.
- **Perf:** 550 RPS soak; Gini monitoring; Studio latency with hints.
- **Security:** PSI leakage attempts; auto‑merge spoof; suppression misuse.

---

## 11) Risks & Mitigations

- **S9.1: 550 RPS instability.** → Warm caches, staged ramp, circuit breakers; roll back to 500.
- **S9.2: Auto‑merge misclassification.** → Human review gates, canary merges, rollback script.
- **S9.3: Suppression overuse.** → Time‑box + approvals; weekly audit of rules.

---

## 12) Release Notes (Planned v1.3)

- PSI pilot‑grade with explainers, 550 RPS throughput, fairness SLO.
- LAC explainability & auto‑merge; author coaching.
- PCQ anomaly explorer, cross‑job suppression, tenant rollups.

---

## 13) Templates & Scaffolding

- `zk-tx/psi/pilot-controls.yaml`
- `zk-tx/psi/explainer.md`
- `lac/studio/insights/root-cause.md`
- `lac/promotions/auto-merge-policy.md`
- `pcq/explorer/README.md`
- `pcq/suppression/rules.yaml`
- `ops/fairness/slo.md`
- `ops/gameday2/runbook.md`
- `partners/psi/toolkit.md`

— **End of Workstream Packet (Sprint 09 • v1.3 scope)** —
