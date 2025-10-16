# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)

**Cadence:** 2‑week sprint (Oct 20–Oct 31, 2025)
**Ordinal:** Sprint 02 (workstream‑scoped)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Streams aligned:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/Helm

---

## 0) TL;DR

We promote **Trust Fabric v0.1 → v0.2** by hardening, scaling, and expanding guardrails:

1. **PCQ v1.2**: deterministic replays at scale, **witness service** + diff visualizer; fixture generator.
2. **LAC v0.2**: policy‑as‑code registry, **monitor→enforce cutover**, ABAC context adapters; red‑team corpus.
3. **ZK‑TX v0.2**: throughput upgrades, **streaming set proofs**, MPC fallback plan; partner sandbox tenant.

All deliverables are **production‑leaning**: autoscaling, SLO burn‑rate alerts, DR playbooks, and signed release artifacts.

---

## 1) Backward‑Looking: Closeouts & Carry‑Ins

**Done from Sprint 01:** PCQ manifests v1.1, Verifier CLI + goldens; LAC planner gate + diff sim; ZK‑TX MVP proofs; Helm smoke; SLO dashboards.

**Carry‑ins:**

- Expand PCQ golden set for graph community metrics under pathological graphs.
- Finish LAC reason‑for‑access text templates for multi‑locale.
- ZK‑TX partner appeal tabletop v1 → finalize artifacts.

---

## 2) Sprint Goal & Non‑Negotiables

**Goal:**

> “Harden Trust Fabric for real traffic: **scale the verifier**, **graduate LAC to enforce on tier‑1 datasets**, and **prove ZK‑TX performance** under burst while preserving zero‑leak guarantees.”

**DoD — Sprint 02**

- PCQ witness service online; **10×** fixture replay scale; visual diffs baked into CI reports.
- LAC enforce mode on **Tier‑1** domains (P0/P1 data classes) with zero known false negatives on red‑team set.
- ZK‑TX hits **p95 proof < 1.2s** at 300 RPS in sandbox; partner sandbox tenant provisioned with audit sinks.
- Ops: autoscaling + HPA targets, burn‑rate SLO alerts, DR runbook validated.

---

## 3) OKRs (This Sprint)

- **O1: Deterministic & Observable PCQ**  
  **KR1.1** Replay **50** fixtures in parallel ≤ 60s each; **no flaky** outcomes across runners.  
  **KR1.2** Witness service signs **100%** of CI verifications; diff UI attached to artifacts.
- **O2: Mature Policy Enforcement**  
  **KR2.1** LAC enforce on Tier‑1 domains with **0 FN / ≤3% FP** on 200‑case red‑team corpus.  
  **KR2.2** Policy registry backs versioned rollouts with canary AUDIT only → ENFORCE switch in < 1 min.
- **O3: High‑Throughput ZK‑TX**  
  **KR3.1** Maintain **300 RPS**, p95 **<1.2s** proofs, error rate < 0.2%.  
  **KR3.2** Partner sandbox + appeal workflow operational with signed checklists.

---

## 4) Scope — Epics & Stories

### Epic D — PCQ v1.2 (Scale + UX)

- **D1. Fixture Generator**  
  _Stories:_ CLI `pcq-fixture gen` to synthesize graphs (power‑law, bipartite, star) with expected metrics.  
  _AC:_ 30 synthetic + 20 curated real fixtures; metadata embedded.
- **D2. Witness Service**  
  _Stories:_ service signs verifier outputs; stores Merkle root in provenance ledger; expose `/attest` API.  
  _AC:_ CI attaches witness envelope; local tamper test fails as expected.
- **D3. Diff Visualizer**  
  _Stories:_ HTML report with metric deltas, tolerance bands, and stack trace collapse/expand.  
  _AC:_ published as CI artifact; accessible via job link; retained 30 days.

### Epic E — LAC v0.2 (Registry + Enforcement)

- **E1. Policy Registry & Promotions**  
  _Stories:_ Git‑backed registry; semantic versioning; canary labels; audit‑only vs enforce modes.  
  _AC:_ promote policy in < 60s; rollback in < 60s; history queries available.
- **E2. ABAC Context Adapters**  
  _Stories:_ adapters for on‑call role, geo, data residency, customer tier; cache + TTL.  
  _AC:_ latency overhead < 5ms p95; correctness verified with shadow logs.
- **E3. Red‑Team Corpus & Telemetry**  
  _Stories:_ 200 crafted queries (injection, inference, join leakage); block/allow expected; dashboards.  
  _AC:_ 0 FN; FP ≤ 3%; reasons actionable & localized.

### Epic F — ZK‑TX v0.2 (Perf + Resilience)

- **F1. Streaming Set Proofs**  
  _Stories:_ chunked commitments; windowed proofs; back‑pressure; quotas per tenant.  
  _AC:_ sustain 300 RPS in perf rig; no raw selectors logged.
- **F2. MPC Fallback Plan (Design)**  
  _Stories:_ design doc for MPC‑based join as fallback under extreme skew; policy gates intact.  
  _AC:_ approved ADR; not implemented this sprint.
- **F3. Partner Sandbox Tenant**  
  _Stories:_ isolated broker, audit sinks, rate‑limiters, appeal playbook v1.1.  
  _AC:_ end‑to‑end demo script; checklists signed by Security & Legal.

### Epic G — Ops/DevEx (Production Readiness)

- **G1. Autoscaling (HPA)**  
  _Stories:_ CPU/QPS‑driven HPA for verifier, zk‑tx; surge/burst configs; pod disruption budgets.  
  _AC:_ soak test passes; SLOs respected under chaos.
- **G2. Burn‑Rate Alerts**  
  _Stories:_ windowed error‑budget burn alerts (2h/6h); pager policies; runbook links.  
  _AC:_ synthetic breaches fire alerts; MTTA < 5m via on‑call.
- **G3. DR & Backups**  
  _Stories:_ backup attestations; encrypted key vault rotation; restore drill.  
  _AC:_ RPO ≤ 15m; RTO ≤ 30m demonstrated.

---

## 5) Day‑by‑Day Plan

**W1 Mon–Tue**

- Build fixture generator; seed 10 synthetic cases.
- Stand up policy registry; set up canary channel.

**W1 Wed–Thu**

- Witness service + CI envelope wiring; HTML diff reporter MVP.
- ABAC adapters (on‑call, geo); shadow logs.

**W1 Fri**

- Red‑team corpus v0.9 crafted & labeled; perf rig scaffold for zk‑tx; HPA initial configs.

**W2 Mon–Tue**

- Expand fixtures to 50; attach witness to CI; diff reporter UX pass.
- Enforce on Tier‑1 datasets behind feature flag; monitor → enforce cutover rehearsal.

**W2 Wed–Thu**

- ZK‑TX perf tuning to 300 RPS; streaming proofs; partner sandbox wiring; burn‑rate alert tests.
- DR drill (restore + rotate keys); publish runbook.

**W2 Fri**

- Freeze v0.2; E2E demo; release notes; retro; backlog triage for v0.3.

---

## 6) RACI

| Area                      | Driver (R)        | Approver (A)    | Consulted (C)     | Informed (I) |
| ------------------------- | ----------------- | --------------- | ----------------- | ------------ |
| PCQ fixtures & witness    | DevEx Lead        | Chief Architect | Analytics, QA     | All          |
| Diff reporter             | DevEx Lead        | PM (Elara)      | Design, QA        | All          |
| Policy registry & enforce | Platform Eng Lead | Security Lead   | Copilot, Frontend | All          |
| ABAC adapters             | Platform Eng      | Security Lead   | SRE               | All          |
| Red‑team corpus           | Security Eng      | CTO             | PM, Legal         | All          |
| ZK‑TX perf & sandbox      | Security Lead     | CTO             | Partners, Ops     | All          |
| HPA, burn‑rate, DR        | SRE Lead          | CTO             | Security, DevEx   | All          |

---

## 7) Ceremonies & Cadence

- **Daily Stand‑up:** 10:05–10:20 MT
- **Policy Change Window:** Tue/Thu 13:00–14:00 MT (registry promotions)
- **Perf Drill:** Wed Oct 29, 14:30 MT
- **Review/Demo:** Fri Oct 31, 11:30 MT
- **Retro:** Fri Oct 31, 15:30 MT

---

## 8) Backlog — Sprint 02 (Committed)

**PCQ**

- [ ] Fixture generator & 50 fixtures.
- [ ] Witness service + signing + ledger.
- [ ] Diff visualizer attached to CI.

**LAC**

- [ ] Policy registry with canary/promote/rollback.
- [ ] ABAC adapters (on‑call, geo, residency, tier).
- [ ] Red‑team corpus tests (0 FN, ≤3% FP).

**ZK‑TX**

- [ ] Streaming set proofs @ 300 RPS, p95 < 1.2s.
- [ ] Partner sandbox tenant + appeal v1.1.
- [ ] ADR for MPC fallback.

**Ops/DevEx**

- [ ] HPA & PDBs; soak tests.
- [ ] Burn‑rate alerts; pager runbooks.
- [ ] DR backup/restore drill.

---

## 9) Acceptance Packs

- **CI Artifacts:** witness envelopes + HTML diff reports stored 30d.
- **Policy Promotions:** registry logs proving canary→enforce transitions & rollbacks.
- **Perf Evidence:** load test report (QPS, latency, error rate), Grafana snapshots.
- **DR Drill:** signed checklist with RPO/RTO timing.

---

## 10) Test Strategy

- **Unit/Contract:** fixture generator determinism, witness signatures, ABAC adapters.
- **E2E:** audit‑bound reason strings through planner→LAC→logs; PCQ verify at scale; zk‑tx overlap/no‑overlap.
- **Perf:** 300 RPS soak 30 min; step load; chaos (pod kill) during load.
- **Security:** red‑team queries, header tamper tests, key rotation.

---

## 11) Architecture Deltas

- Add **Witness svc** between Verifier and Ledger; expose `/attest` & `/prove`.
- Introduce **Policy Registry** (git‑backed) with webhooks to planner caches.
- ZK‑TX supports **chunked commitments**; back‑pressure via tokens.

---

## 12) Risks & Mitigations

- **S1: FP spikes when switching to ENFORCE.**  
  _Mitigation:_ canary + shadow logs + rapid rollback path; localized reason copy.
- **S2: Proof latency under burst.**  
  _Mitigation:_ HPA, quotas, back‑pressure; pre‑warmed caches; circuit‑breaker to cached attestations.
- **S3: Diff UX overwhelms users.**  
  _Mitigation:_ collapse defaults, severity badges, actionable links.

---

## 13) Metrics & Dashboards (Targets)

- **PCQ:** 50 fixtures replayed/sprint; 100% witnessed; flaky rate 0%.
- **LAC:** 0 FN; ≤3% FP; promotion MTTR < 60s.
- **ZK‑TX:** 300 RPS; p95 <1.2s; error <0.2%.
- **Ops:** burn‑rate alerts within 2h/6h windows; DR RTO ≤30m.

---

## 14) Release Notes (Planned v0.2)

- PCQ witness service + diff reporter; fixture generator.
- LAC policy registry, ABAC adapters; red‑team corpus; enforce on Tier‑1.
- ZK‑TX streaming proofs + partner sandbox.
- Autoscaling, burn‑rate alerts, DR drill.

---

## 15) Communication Plan

- **Change windows** announced in #eng‑announcements with policy IDs & canary labels.
- **Perf drill** invite with dashboards; post‑mortem template pre‑created.
- **Partner sandbox** kickoff note + checklist for access.

---

## 16) Templates & Scaffolding (Included)

- `pcq-fixture.config.yaml` + generator CLI usage.
- `witness/adr-0001-witness-attestations.md`
- `policy-registry/registry.toml` + promotion script.
- `lac-redteam/README.md` with 200 cases skeleton.
- `zk-tx/perf-rig/README.md` with k6 scripts.
- `ops/runbooks/dr-restore.md`, `ops/runbooks/burn-rate.md`.

— **End of Workstream Packet (Sprint 02)** —
