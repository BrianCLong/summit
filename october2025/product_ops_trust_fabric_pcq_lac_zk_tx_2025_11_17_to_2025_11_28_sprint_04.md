# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)

**Cadence:** 2‑week sprint (Nov 17–Nov 28, 2025)  
**Ordinal:** Sprint 04 (workstream‑scoped)  
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)  
**Streams aligned:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE, Partner Success

---

## 0) TL;DR

Advance **v0.3 → v0.4 (RC)** with **always‑on verification, author‑friendly policy, and dual‑partner pilots**:

1. **PCQ v1.4**: continuous verification in prod via **sampled replays**, canary compare, **witness transparency log**.
2. **LAC v1.0 RC**: policy authoring UX, **policy linting & type checks**, staged rollouts, cross‑env drift guards.
3. **ZK‑TX v0.4**: dual‑partner pilots (A & B) with **≤k proofs + batch verify**, rate‑limit fairness, exportable audit bundles.

Ops: golden‑path **one‑click demo env**, error‑budget burn‑down, **ISO/SOC evidence packets** assembled for GA.

---

## 1) Closeouts & Carry‑Ins

**From Sprint 03:** Attestation + SBOM/SLSA, provenance DSL, graph‑aware policies + JIT approvals, ≤k/batch proofs, multi‑region DR, cost guardrails.  
**Carry‑ins:** finalize minimization transform coverage on two long‑tail views; refine batch verifier cache hit‑rate.

---

## 2) Sprint Goal & Non‑Negotiables

**Goal:**

> “Prove trust fabric **works unattended** at scale: perpetual verification, human‑grade policy UX, and two **real partner** flows with exportable evidence.”

**DoD (Sprint 04)**

- PCQ: **continuous verifier** (sampled) in stage & prod; witness writes to **transparency log**; canary deltas paged to on‑call.
- LAC: **policy studio** (lint, types, previews), registry promotions with **drift detection** across envs; enforce on Tier‑1 & Tier‑2.
- ZK‑TX: two partner pilots complete; audit bundles (proofs, envelopes, logs) generated and signed.
- Ops: one‑click demo env; burn‑rate alerts tuned; SOC/ISO evidence packet compiled.

---

## 3) OKRs (This Sprint)

- **O1: Continuous Integrity**  
  **KR1.1** PCQ sampled replays cover **≥ 5%** of prod jobs daily without SLO breach.  
  **KR1.2** Canary deltas triaged within **15 min MTTA**; false‑alarm rate **< 2%**.
- **O2: Policy Authoring & Safety**  
  **KR2.1** 100% policies pass lint/type checks; promotion with drift‑free guarantee across **dev→stage→prod**.  
  **KR2.2** Red‑team corpus expanded to **300** cases; **0 FN / ≤2% FP**.
- **O3: Partner‑Grade ZK**  
  **KR3.1** Both pilots run end‑to‑end with ≤k & batch; **p95 < 900ms**, error <0.2%.  
  **KR3.2** Exportable audit bundle produced; partner sign‑off received.
- **O4: Readiness for GA Evidence**  
  **KR4.1** SOC/ISO evidence packet **v0.9** assembled; gaps logged with owners & dates.  
  **KR4.2** One‑click demo env time **< 12 min** from zero.

---

## 4) Scope — Epics & Stories

### Epic L — PCQ v1.4 (Continuous + Transparency)

- **L1. Sampled Replay Controller**  
  _Stories:_ percentage‑based sampling, SLO‑aware backoff, replay queue isolation.  
  _AC:_ covers ≥5% of jobs/day; does not breach SLOs; pause/resume switches.
- **L2. Witness Transparency Log**  
  _Stories:_ append‑only public log (hash chain/Merkle); signed checkpoints; retention policy.  
  _AC:_ auditors can verify inclusion; CI links each build to log index.
- **L3. Canary Comparator + Paging**  
  _Stories:_ compare prod vs canary stack; emit severity; page on‑call on true deltas.  
  _AC:_ MTTA <15m in drill; false positive rate <2%.

### Epic M — LAC v1.0 RC (Policy Studio + Drift Guard)

- **M1. Policy Studio UX**  
  _Stories:_ lint/type checks, schema docks, safe previews, diff simulator, localized reason strings.  
  _AC:_ 10 policy authors complete tasks in <10m; SUS ≥ 80.
- **M2. Drift Detection & Promotions**  
  _Stories:_ compare policy graphs across envs; block promotions on drift; auto‑remediation PRs.  
  _AC:_ 100% promotions drift‑free or blocked with actionable output.
- **M3. Tier‑2 Enforcement & Minimization**  
  _Stories:_ extend enforcement & transforms to Tier‑2 domains; telemetry coverage maps.  
  _AC:_ coverage = 100%; no SLO regressions.

### Epic N — ZK‑TX v0.4 (Dual Pilots + Evidence)

- **N1. Pilot A Execution**  
  _Stories:_ scripted run, ≤k + batch flows, audit bundle export.  
  _AC:_ partner signs acceptance; bundle archived.
- **N2. Pilot B Execution**  
  _Stories:_ variant dataset skew; fairness guardrails; appeal drill.  
  _AC:_ acceptance signed; appeal SLA < 24h.
- **N3. Evidence Packaging**  
  _Stories:_ export proofs, envelopes, logs, configs with checksums; legal review.  
  _AC:_ bundle passes internal audit.

### Epic O — Ops/DevEx (Demo, Burn‑rate, Compliance)

- **O1. One‑Click Demo Env**  
  _Stories:_ single script/Make target; seeded data; smoke + golden tests.  
  _AC:_ <12 min ready; teardown clean.
- **O2. Burn‑Rate Tuning**  
  _Stories:_ alert windows, playbooks, load drills; SLO budgets for verifier & zk‑tx.  
  _AC:_ drills show proper paging/escalation.
- **O3. SOC/ISO Evidence Packet**  
  _Stories:_ controls mapping, runbook links, screenshots, logs, attestations.  
  _AC:_ packet v0.9 published with owners for remaining gaps.

---

## 5) Day‑by‑Day Plan

**W1 Mon–Tue**

- Sampled replay controller; baseline 3% sampling; transparency log schema.
- Policy Studio lint + type checks; drift detection scaffold.

**W1 Wed–Thu**

- Canary comparator wiring + pager tests; Studio previews + diffs; Tier‑2 coverage mapping.
- Pilot A rehearsal; evidence bundle format.

**W1 Fri**

- Expand red‑team corpus to 300; localization pass for reason strings.
- Demo env script v1; SOC/ISO packet outline.

**W2 Mon–Tue**

- Raise sampling to 5%; log checkpoints; on‑call drill MTTA.
- Promotions with drift guard; Tier‑2 enforce + minimization telemetry.

**W2 Wed–Thu**

- Pilot A/B execution; audit bundle exports; appeal drill.
- Burn‑rate tuning; compliance packet population.

**W2 Fri**

- Freeze v0.4 RC; full demo; retro; GA gap list & owners.

---

## 6) RACI

| Area                    | Driver (R)        | Approver (A)    | Consulted (C)        | Informed (I) |
| ----------------------- | ----------------- | --------------- | -------------------- | ------------ |
| Sampled replay & canary | DevEx Lead        | Chief Architect | Analytics, SRE       | All          |
| Transparency log        | DevEx Lead        | Security Lead   | Legal, Audit         | All          |
| Policy Studio & drift   | Platform Eng Lead | Security Lead   | Design, PM           | All          |
| Tier‑2 enforcement      | Platform Eng      | Security Lead   | Data Gov             | All          |
| Pilot A/B               | Security Lead     | CTO             | Partners, Legal      | All          |
| Demo env & burn‑rate    | SRE Lead          | CTO             | DevEx, Security      | All          |
| SOC/ISO packet          | PM (Elara)        | CTO             | Security, SRE, Legal | All          |

---

## 7) Ceremonies & Cadence

- **Daily Stand‑up:** 10:05–10:20 MT
- **Policy Windows:** Tue/Thu 13:00–14:00 MT
- **On‑call Drill:** Wed Nov 26, 14:00 MT
- **Review/Demo:** Fri Nov 28, 11:30 MT
- **Retro:** Fri Nov 28, 15:30 MT

---

## 8) Backlog — Sprint 04 (Committed)

**PCQ**

- [ ] Sampled replay controller (≥5% jobs/day).
- [ ] Transparency log with checkpoints.
- [ ] Canary comparator + paging.

**LAC**

- [ ] Policy Studio (lint, type, preview, diff).
- [ ] Drift detection + promotion guards.
- [ ] Tier‑2 enforce + minimization coverage.

**ZK‑TX**

- [ ] Pilot A & B executed with audit bundles.
- [ ] Fairness guardrails + appeal drill.
- [ ] Evidence packaging signed.

**Ops/DevEx**

- [ ] One‑click demo env <12m.
- [ ] Burn‑rate tuning & drills.
- [ ] SOC/ISO evidence packet v0.9.

---

## 9) Acceptance Packs

- **Continuous Verify:** sampling coverage, SLO graphs, on‑call drill logs.
- **Policy Studio:** author tasks completion, SUS survey results, promotion logs.
- **ZK Pilots:** signed partner acceptances; audit bundles with checksums.
- **Compliance:** SOC/ISO packet v0.9 with gap list & owners.

---

## 10) Test Strategy

- **Unit/Contract:** sampler math; log inclusion proofs; policy lints; drift diff.
- **E2E:** prod job sample → replay → witness log → alert; policy author → preview → promote → enforce; pilot run → bundle export.
- **Perf:** sampler overhead; Studio latency; pilot throughput under quotas.
- **Security:** transparency log tamper attempt; promotion spoof; fairness tests.

---

## 11) Architecture Deltas

- Add **Transparency Log** adjacent to Provenance Ledger (append‑only).
- Policy Studio front‑end + registry hooks; drift diff against env snapshots.
- Pilot evidence bundler exporting signed tarballs with manifests.

---

## 12) Risks & Mitigations

- **U1: Sampling impacts SLO.** → SLO‑aware backoff; off‑peak windows; caps.
- **U2: Policy Studio adoption lag.** → author training, templates, examples, SUS feedback loop.
- **U3: Partner data skew breaks proof targets.** → adaptive chunking; quotas; pre‑warming; escalate knobs.

---

## 13) Metrics & Dashboards (Targets)

- **PCQ:** ≥5% sampled; MTTA <15m; false alarm <2%.
- **LAC:** 100% linted/typed; drift‑free promotions; SUS ≥80.
- **ZK‑TX:** p95 <900ms; error <0.2%; 2 pilot sign‑offs.
- **Ops:** demo env <12m; compliance v0.9 done; error‑budget healthy.

---

## 14) Release Notes (Planned v0.4 RC)

- PCQ: continuous verification + transparency log + canary paging.
- LAC: Policy Studio + drift guards + Tier‑2 enforcement.
- ZK‑TX: dual pilots with evidence bundles.
- Ops: one‑click demo env, burn‑rate tuning, SOC/ISO evidence v0.9.

---

## 15) Communication Plan

- **On‑call drill invite** + runbook link; success criteria.
- **Policy Studio launch note** with quick‑start and examples.
- **Partner pilot updates** with acceptance checkpoints.
- **Compliance bulletin** enumerating remaining gaps & owners.

---

## 16) Templates & Scaffolding (Included)

- `pcq/sampler/config.yaml`
- `witness/transparency/README.md`
- `lac/policy-studio/README.md` + lints/types schema
- `lac/promotions/drift-guard.md`
- `zk-tx/pilot/evidence-bundle.spec.yaml`
- `ops/demo/one-click.sh`
- `compliance/SOC-ISO-evidence.md`

— **End of Workstream Packet (Sprint 04)** —
