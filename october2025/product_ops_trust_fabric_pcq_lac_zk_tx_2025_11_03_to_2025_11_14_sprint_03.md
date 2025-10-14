# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)
**Cadence:** 2‑week sprint (Nov 3–Nov 14, 2025)  
**Ordinal:** Sprint 03 (workstream‑scoped)  
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)  
**Streams aligned:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/SRE

---

## 0) TL;DR
Advance **v0.2 → v0.3** with **attested supply‑chain, graph‑aware policy, and partner‑grade ZK flows**:
1) **PCQ v1.3**: remote attestation for verifier + witness, **provenance DSL**, fixture quarantine burn‑down to zero.  
2) **LAC v0.3**: graph‑aware policies (cardinality, component size, path‑length), **Just‑In‑Time access** with approvals, data‑minimization transforms.  
3) **ZK‑TX v0.3**: bounded‑cardinality proofs (≤k overlap), **batch proofs**, partner sandbox → **pilot readiness**.

Ops upgrades: multi‑region DR rehearsal, SBOM/SLSA provenance for all services, cost/SLO guardrails.

---

## 1) Prior Closeouts & Carry‑Ins
**From Sprint 02:** Fixture generator, witness service + signed CI artifacts; LAC registry + ABAC adapters + enforce on Tier‑1; ZK‑TX 300 RPS; HPA + burn‑rate + DR drill.  
**Carry‑ins:** expand red‑team queries for graph leak patterns; refine diff reporter UX on large fixtures.

---

## 2) Sprint Goal & Non‑Negotiables
**Goal:**
> “Certify trust from build to proof: **attest the pipeline**, **reason over graph‑native risk**, and **ship partner‑ready ZK pilots** with measurable guardrails.”

**DoD (Sprint 03)**
- All trust‑fabric services emit **SBOM + SLSA provenance**; verifier/witness use **remote attestation**.  
- LAC supports **graph‑aware** constraints and **JIT approvals** on sensitive scopes.  
- ZK‑TX provides **≤k overlap proofs** and **batch verification**, demoed with partner sandbox data.  
- Multi‑region failover demo complete; docs, runbooks, green tests, and recorded demo shipped.

---

## 3) OKRs (This Sprint)
- **O1: Supply‑chain & Replay Integrity**  
  **KR1.1** 100% services publish SBOM + SLSA provenance to artifact registry.  
  **KR1.2** Verifier + witness pass **remote attestation** preflight in CI & stage.  
  **KR1.3** Fixture flaky rate **0%**; quarantine queue **= 0** by end of sprint.
- **O2: Graph‑Aware Guardrails**  
  **KR2.1** LAC evaluates 3 graph constraints (component size, path‑length, degree cap) with p95 overhead **<7ms**.  
  **KR2.2** JIT approvals median time **< 4 min** with dual‑approver option; audit linkage 100%.
- **O3: Partner‑Ready ZK**  
  **KR3.1** ≤k overlap proofs (k configurable) verified in **< 900ms p95** for batches of 100.  
  **KR3.2** Pilot checklist signed by Security + Legal; **no PII egress** confirmed via log scans.
- **O4: Resilience & Cost**  
  **KR4.1** Multi‑region failover RTO **≤ 20m**; RPO **≤ 10m**.  
  **KR4.2** Cost per 1k proofs **−15%** vs v0.2 at equal SLOs.

---

## 4) Scope — Epics & Stories
### Epic H — PCQ v1.3 (Attestation + DSL + Stability)
- **H1. Remote Attestation**  
  *Stories:* integrate enclave/TEE attestation (simulated if hardware unavailable); CI preflights; reject un‑attested runs.  
  *AC:* attestation evidence stored with CI artifact; failure blocks merge.
- **H2. Provenance DSL**  
  *Stories:* author queries in a minimal DSL (`prov{ source->transform->metric }`), compile to manifests.  
  *AC:* 10 examples documented; schema validation passes; generated manifests equal hand‑written.
- **H3. Fixture Stability Program**  
  *Stories:* flake detector, auto‑quarantine, seed pinning; root‑cause templates.  
  *AC:* quarantine queue hits 0; weekly report published.

### Epic I — LAC v0.3 (Graph‑Aware + JIT + Minimization)
- **I1. Graph Constraints**  
  *Stories:* policies for component size ≤N, path‑length ≤L, node degree ≤D; planner cost model hooks.  
  *AC:* 60‑case corpus passes; overhead <7ms p95.
- **I2. JIT Approvals**  
  *Stories:* approval workflow (dual approvers, expiry, reason binding), Slack/Email actions; retries & SLAs.  
  *AC:* median approval <4m; audit links from query → approvals.
- **I3. Data Minimization Transforms**  
  *Stories:* masking, bucketing, top‑k limits; policy‑driven redaction.  
  *AC:* redaction coverage on Tier‑1 views = 100%; diff simulator shows minimized outputs.

### Epic J — ZK‑TX v0.3 (≤k & Batch)
- **J1. ≤k Overlap Proofs**  
  *Stories:* prove overlap does not exceed **k** without revealing members; REST/gRPC endpoints.  
  *AC:* batch of 100 proofs p95 <900ms; correctness validated vs. ground truth in sandbox.
- **J2. Batch Proof Verification**  
  *Stories:* vectorized verify; amortized overhead; proof caching; quotas.  
  *AC:* CPU utilization < 70% at 300 RPS; error rate <0.2% under chaos.
- **J3. Pilot Readiness**  
  *Stories:* partner sandbox playbook v1.2; appeal path SLA; business controls.  
  *AC:* signed pilot checklist; demo recording.

### Epic K — Ops/DevEx (SLSA, DR, FinOps)
- **K1. SBOM + SLSA Provenance**  
  *Stories:* generate SBOMs (build time); sign & publish; provenance links in release notes.  
  *AC:* registry shows SBOM for 100% of artifacts; verification job green.
- **K2. Multi‑Region DR Drill**  
  *Stories:* async replication, traffic shift, audit continuity; stage failover exercise.  
  *AC:* RTO ≤20m, RPO ≤10m in drill; runbook updated.
- **K3. Cost Guardrails**  
  *Stories:* SLO/cost dashboards; alerts on cost/SLO regression; perf knobs documented.  
  *AC:* −15% cost/1k proofs at equal SLOs; report published.

---

## 5) Day‑by‑Day Plan
**W1 Mon–Tue**  
- Attestation preflights in CI; SBOM pipeline scaffold.  
- Graph‑aware policy evaluators (component size, path‑length) prototype.

**W1 Wed–Thu**  
- Provenance DSL compiler + examples; flake detector + quarantine.  
- ≤k proof design + batch verify scaffolding; partner pilot checklist draft.

**W1 Fri**  
- JIT approvals MVP with Slack actions; data minimization transforms; cost dashboard baseline.

**W2 Mon–Tue**  
- Batch proofs perf tuning; DSL docs; fixture queue to zero.  
- Enforce graph constraints in planner; shadow logs + thresholds.

**W2 Wed–Thu**  
- Multi‑region DR drill; finalize pilot artifacts; red‑team pass on graph leaks.  
- Cut release candidates; verify SBOM/SLSA for all images.

**W2 Fri**  
- Freeze v0.3; end‑to‑end demo; publish notes; retro & next‑sprint backlog.

---

## 6) RACI
| Area | Driver (R) | Approver (A) | Consulted (C) | Informed (I) |
|---|---|---|---|---|
| Attestation & SBOM | DevEx Lead | CTO | SRE, Security | All |
| Provenance DSL | Analytics Lead | Chief Architect | PM, QA | All |
| Graph policies | Platform Eng Lead | Security Lead | Graph Core | All |
| JIT approvals | Platform Eng | Security Lead | Design, Legal | All |
| ≤k & Batch proofs | Security Lead | CTO | Partners, SRE | All |
| DR & FinOps | SRE Lead | CTO | DevEx, Security | All |

---

## 7) Ceremonies & Cadence
- **Daily Stand‑up:** 10:05–10:20 MT  
- **Policy Windows:** Tue/Thu 13:00–14:00 MT  
- **DR Drill:** Thu Nov 13, 14:00 MT  
- **Review/Demo:** Fri Nov 14, 11:30 MT  
- **Retro:** Fri Nov 14, 15:30 MT

---

## 8) Backlog — Sprint 03 (Committed)
**PCQ**  
- [ ] Remote attestation in CI + stage.  
- [ ] Provenance DSL + 10 examples.  
- [ ] Flake detector + quarantine burn‑down to 0.

**LAC**  
- [ ] Graph‑aware constraints (size, path, degree).  
- [ ] JIT approvals + audit linkage.  
- [ ] Data minimization transforms on Tier‑1 views.

**ZK‑TX**  
- [ ] ≤k overlap proofs + batch verify.  
- [ ] Pilot checklist signed; demo recorded.  
- [ ] Perf targets met at 300 RPS.

**Ops/DevEx**  
- [ ] SBOM + SLSA for 100% artifacts.  
- [ ] Multi‑region DR drill RTO/RPO met.  
- [ ] Cost guardrail report (−15%/1k proofs).

---

## 9) Acceptance Packs
- **Supply‑chain Evidence:** SBOMs + SLSA provenance, verification logs.  
- **Policy Evidence:** red‑team corpus results; simulator diffs; approval audit links.  
- **ZK Evidence:** perf report (batch size, latency, error); sandbox verification logs.  
- **Resilience Evidence:** DR drill timings; runbook updates; dashboard snapshots.

---

## 10) Test Strategy
- **Unit/Contract:** attestation token checks; DSL compile/validate; policy evaluator outputs; proof APIs.  
- **E2E:** query→plan→LAC→minimize→execute→manifest→verify→witness→attest→audit.  
- **Perf:** batch proofs (100/200/500); graph constraints overhead; JIT approval latency under load.  
- **Security:** tamper with attestation; policy bypass attempts; leak‑pattern queries.

---

## 11) Architecture Deltas
- CI includes **attestation preflight**; artifacts signed with provenance references.  
- Planner calls **graph‑aware evaluators** before finalize; emits reason codes.  
- ZK‑TX supports **≤k proofs** + **batch verification** with caching.

---

## 12) Risks & Mitigations
- **T1: Hardware attestation unavailable in env.** → Sim mode with clear label; escalate to infra for HW lanes.  
- **T2: Graph policy overhead balloons.** → Pre‑compute hints; cap constraints; cache; fallback to monitor mode.  
- **T3: Batch proofs skewed inputs.** → Adaptive chunking; back‑pressure; circuit breakers; quotas.

---

## 13) Metrics & Dashboards (Targets)
- **PCQ:** 0 flaky; 100% attested; replay ≤60s p95.  
- **LAC:** overhead <7ms p95; JIT median <4m; 0 FN on graph leaks corpus.  
- **ZK‑TX:** batch p95 <900ms (100 proofs); error <0.2%; cost −15%.  
- **Ops:** DR RTO ≤20m, RPO ≤10m; burn‑rate healthy.

---

## 14) Release Notes (Planned v0.3)
- PCQ: remote attestation, provenance DSL, zero‑flake fixtures.  
- LAC: graph‑aware policies, JIT approvals, minimization transforms.  
- ZK‑TX: ≤k overlap proofs, batch verification, pilot‑ready sandbox.  
- Ops: SBOM/SLSA, multi‑region DR, cost guardrails.

---

## 15) Communication Plan
- **Supply‑chain bulletin** with SBOM/SLSA instructions & links.  
- **Policy window notices** for JIT go‑live; runbooks shared with on‑call.  
- **Partner pilot brief** (2‑pager) + demo link; checklist sign‑off.

---

## 16) Templates & Scaffolding (Included)
- `ci/attest-preflight.yaml`  
- `prov-dsl/README.md` + examples  
- `lac/policies/graph-constraints.example.yaml`  
- `lac/jit-approvals/README.md`  
- `zk-tx/batch/README.md` + load scripts  
- `ops/runbooks/dr-multiregion.md`  
- `ops/dashboards/cost-slo.json`

— **End of Workstream Packet (Sprint 03)** —

