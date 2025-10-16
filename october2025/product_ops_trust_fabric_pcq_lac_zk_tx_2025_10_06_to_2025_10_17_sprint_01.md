# 🚀 Workstream Packet — Product Ops • Trust Fabric (PCQ • LAC • ZK‑TX)

**Cadence:** 2‑week sprint (Oct 6–Oct 17, 2025)
**Ordinal:** Sprint 01 (workstream‑scoped)
**Role:** Product Operations / Program & Scrum Mastery (Elara Voss)
**Streams aligned:** Graph Core, Copilot/XAI, Security & Governance, DevEx/Tooling, Infra/Helm

---

## 0) TL;DR

We will ship **verifiable trust primitives** to move the platform from _spec’d_ to _operational_:

1. **Proof‑Carrying Queries (PCQ)** end‑to‑end with an **external verifier** & golden fixtures.
2. **License/Authority Compiler (LAC)** gatekeeping queries/exports by policy, with **dry‑run simulator**.
3. **Zero‑Knowledge Trust Exchange (ZK‑TX)** MVP for cross‑tenant **deconfliction proofs** (no PII egress).

This sprint closes critical gaps in provenance integrity, compliance‑by‑construction, and alliance‑safe collaboration. All deliverables are **green tests, docs, and demo paths**.

---

## 1) Gap Assessment (Repo & Active Sprints)

**Observed gaps** (from docs/backlog/infra structure & previous sprint intents):

- **PCQ**
  - a) Verifier exists as proto but **no reproducible golden path** (fixtures + CLI + CI gate).
  - b) **Model metadata** (hyperparams/seed) not uniformly embedded in manifests.
  - c) **Cross‑language determinism** for graph metrics not locked; tolerance windows undefined.
- **LAC** (License/Authority Compiler)
  - d) Policy specs exist, but **bytecode intercepts** aren’t in the query planner hot path.
  - e) **Policy simulation** (diff vs. historical access) lacks UI & regression corpus.
  - f) **Reason‑for‑access prompts** not wired to audit envelopes.
- **ZK‑TX**
  - g) Hashing/pepper protocols defined, but **ZK range/set proofs** not integrated with tenancy boundary.
  - h) **False‑positive insurance / appeal flow** unspecified; partner handshake playbook missing.
- **Ops/DevEx**
  - i) **One‑command demo** (dev → stage) not repeatable; Helm charts lack smoke test hooks.
  - j) **Chaos/DR drills** not scripted for trust fabric services; no SLO dashboards pinned.

**Dependencies/risks**

- Shared schemas (provenance manifest & policy objects) are **version‑drifting** across services.
- Query planner & Copilot have **incomplete guardrail bindings** (LAC must block at parse & plan).
- Cross‑tenant messaging bus for ZK‑TX needs **isolated broker + audit sink**.

---

## 2) Sprint Goal & Non‑Negotiables

**Sprint Goal:**

> “Stand up **Trust Fabric v0.1**: verifiable results, executable policies, and safe alliance checks—**demo‑able, documented, and CI‑enforced**.”

**Definition of Done (DoD) — This Sprint**

- All three pillars (PCQ, LAC, ZK‑TX) have: runnable service(s) + CLI + API + **green test packs** + docs + **demo script**.
- CI gates: **PCQ replay** must pass; **LAC policy gate** must block unsafe queries; **ZK‑TX** must produce/verify proofs.
- Helm values + smoke tests enable **one‑command ephemeral env** for the demo.

**Out of Scope (but staged):** PCA for federated simulators, advanced narrative proofing, partner legal templates.

---

## 3) Objectives & Key Results (OKRs)

- **O1: Ship verifiable queries**  
  **KR1.1** External verifier reproduces 5 golden cases ≤ 60s each with numeric tolerance windows.  
  **KR1.2** 100% of materialized analytics include model card hashes & seeds in provenance.
- **O2: Enforce policy by construction**  
  **KR2.1** LAC blocks 100% of unsafe ops on a 50‑case policy corpus (no false negatives).  
  **KR2.2** Policy diff simulator generates impact reports in < 5s for 1k historical queries.
- **O3: Enable alliance‑safe deconfliction**  
  **KR3.1** ZK‑TX MVP proves overlap/no‑overlap across two tenants with zero raw PII transfer.  
  **KR3.2** Partner handshake runbook + appeal path published; demo completes in < 10 min.

---

## 4) Scope — Epics, Stories, Acceptance

### Epic A — Proof‑Carrying Queries (PCQ)

- **A1. Provenance Manifest v1.1**  
  _Stories:_ unify schema, embed model hyperparams, RNG seed, data hashes.  
  _AC:_ every result bundle validates via JSON Schema; missing fields fail build.
- **A2. External Verifier CLI**  
  _Stories:_ `prov-verify run --fixtures <case>`; deterministic replay; tolerance config per metric.  
  _AC:_ 5 goldens pass locally & in CI; failure surfaces diff of inputs/transforms/versions.
- **A3. Repro Tolerance Windows**  
  _Stories:_ define tolerances for centrality, K‑shortest paths, community metrics.  
  _AC:_ doc table published; CI uses same thresholds.

### Epic B — License/Authority Compiler (LAC)

- **B1. Planner Hook‑in**  
  _Stories:_ parse policies → compile → inject into query planner; unsafe ops un‑executable.  
  _AC:_ blocked queries show actionable reason; audit writes policy/authority ID.
- **B2. Policy Diff Simulator**  
  _Stories:_ dry‑run a policy change vs. historical queries; produce dashboard & CSV export.  
  _AC:_ 50‑case corpus simulated under 3 policy variants < 5s each.
- **B3. Reason‑for‑Access Prompting**  
  _Stories:_ UX modal + API; reason captured, signed, and bound to audit record.  
  _AC:_ 100% coverage on sensitive views; audit search by reason substring works.

### Epic C — Zero‑Knowledge Trust Exchange (ZK‑TX) MVP

- **C1. Pepper & Salt Protocols**  
  _Stories:_ per‑tenant salts; rotating pepper; envelope format; key rotation doc.  
  _AC:_ cryptographic review checklist passes; rotation demoed.
- **C2. Set/Range Proof Service**  
  _Stories:_ build service for overlap/no‑overlap proofs; REST + gRPC; rate‑limit & audit.  
  _AC:_ two‑tenant demo passes with real proofs; logs contain no raw selectors.
- **C3. Partner Handshake & Appeals**  
  _Stories:_ write runbook: onboarding, FP insurance pool, appeal workflow.  
  _AC:_ tabletop exercise performed; artifacts published.

---

## 5) Plan — Tasks by Day (Targeted)

**W1 Mon–Tue**

- Lock provenance schema v1.1; implement manifest emitters (Graph Core, Analytics).
- LAC compiler adapter for planner; stub simulator API.

**W1 Wed–Thu**

- Verifier CLI skeleton + 2 golden fixtures; CI job `pcq-replay`.
- ZK‑TX service scaffold; tenant salts/pepper rotation; audit envelopes.

**W1 Fri**

- Reason‑for‑access UX + API integration; demo script v0.1; Helm smoke tests.

**W2 Mon–Tue**

- Add 3 more golden fixtures; tolerance docs; failure diff UX.
- Policy diff simulator perf pass; CSV exports.

**W2 Wed–Thu**

- Two‑tenant ZK‑TX live demo; appeals runbook; failure injection tests.
- Observability dashboards (SLOs) & alerts for trust services.

**W2 Fri**

- Freeze, cut **v0.1**; run full demo; publish artifacts; retro.

---

## 6) Team • RACI

| Area                   | Driver (R)        | Approver (A)    | Consulted (C)       | Informed (I) |
| ---------------------- | ----------------- | --------------- | ------------------- | ------------ |
| PCQ schema & emitters  | Analytics Lead    | Chief Architect | Graph Core, Copilot | All          |
| Verifier CLI & CI gate | DevEx Lead        | Chief Architect | QA, Analytics       | All          |
| LAC planner hook       | Platform Eng Lead | Security Lead   | Copilot, Frontend   | All          |
| Policy diff simulator  | Platform Eng Lead | Security Lead   | Data Gov, PM        | All          |
| Reason‑for‑access UX   | Design Lead       | Security Lead   | Platform, Audit     | All          |
| ZK‑TX service          | Security Lead     | CTO             | Tenancy, Ops        | Partners     |
| Helm/demo env          | DevOps Lead       | CTO             | Security, QA        | All          |

---

## 7) Ceremonies & Cadence

- **Daily Stand‑up:** 10:05–10:20 MT (Slack huddle + Jira board walk).
- **Backlog Grooming:** Tue 15:00 MT.
- **Sprint Review/Demo:** Fri Oct 17, 11:30 MT (recorded, timeboxed to 20 min).
- **Retro:** Fri Oct 17, 15:30 MT (Start/Stop/Continue + 1 risk burn‑down).

---

## 8) Backlog — Sprint 01 (Committed)

**PCQ**

- [ ] Manifest v1.1 (model card hash, RNG seed, data checksum tree).
- [ ] Verifier CLI with 5 golden fixtures; CI gate.
- [ ] Tolerance table & docs (centrality/path/community).

**LAC**

- [ ] Parser → compiler → planner intercepts.
- [ ] Policy diff simulator + dashboard & CSV.
- [ ] Reason‑for‑access prompting bound to audit.

**ZK‑TX**

- [ ] Pepper/salt protocols + rotation demo.
- [ ] Set/range proof microservice + REST/gRPC.
- [ ] Partner handshake/appeals runbook.

**Ops/DevEx**

- [ ] Helm smoke tests; ephemeral env script.
- [ ] SLO dashboards (p95 query <1.5s; proof gen <2s; verifier ≤60s/case).
- [ ] Chaos drill: fail proof‑service; auto‑degrade to cached attestations.

---

## 9) Acceptance Packs

- **PCQ Golden Fixtures:** 5 labeled cases covering link/path/community metrics with expected manifests.
- **LAC Corpus:** 50 historical queries with mixed policy outcomes; expected block/allow & reason strings.
- **ZK‑TX Demo:** Two tenants, 1 overlap, 1 no‑overlap scenario; audit log review checklist.

---

## 10) Test Strategy

- **Unit/Contract:** manifest validation, compiler bytecode, proof APIs.
- **E2E:** ingest → analyze → PCQ verify → policy block/allow → ZK‑TX outcome.
- **Load:** verifier on 10 parallel cases; proof service QPS spikes.
- **Security:** secret hygiene, pepper rotation, authz on proof endpoints.
- **Chaos:** intentional proof‑service outage; verify graceful degradation and alerting.

---

## 11) Architecture (ASCII Sketch)

```
[Client/Copilot]
    |  (queries with policy context)
[Query Planner] --(policy bytecode)--> [LAC Gate]
    | allowed plans
[Analytics Engine] --(manifests)--> [Provenance Ledger]
    | results + manifests
[Verifier CLI/CI] <----- fixtures -----> [Replay DAG]

[Tenants A,B] --(salted selectors)--> [ZK‑TX Service] --(proofs)--> [Audit Sink]
```

---

## 12) Risks & Mitigations

- **R1: Determinism drift across platforms.**  
  _Mitigation:_ tolerance windows, seed control, pinned libs; doc exact deltas.
- **R2: Policy false positives blocking valid work.**  
  _Mitigation:_ diff simulator + appeal path; staged ‘monitor’ mode before ‘enforce’.
- **R3: ZK‑TX crypto misconfig.**  
  _Mitigation:_ checklist, key ceremonies, rotation demo; external review.
- **R4: Demo fragility.**  
  _Mitigation:_ ephemeral env script, seeded data, smoke tests on deploy.

---

## 13) Metrics & Dashboards

- **PCQ:** % artifacts with manifests; verifier pass rate; avg replay time.
- **LAC:** policy blocks vs. allows; false positive rate; simulator latency.
- **ZK‑TX:** proofs generated/day; FP appeals; time‑to‑resolution.
- **Ops:** SLOs (p95 latency), error budgets, cost per insight.

---

## 14) Release Notes (Planned v0.1)

- PCQ manifests v1.1 + external verifier CLI.
- LAC planner enforcement + diff simulator + reason‑for‑access UX.
- ZK‑TX MVP (set/range proofs) + partner runbook.
- Helm smoke + ephemeral demo env; SLO dashboards; chaos drill #1.

---

## 15) Communication Plan

- **Kickoff deck & demo script** in /docs/sprints/trust‑fabric‑v0.1
- **Weekly note** in #eng‑announcements: status, risks, next steps.
- **Partner brief** (2‑pager) on ZK‑TX MVP & FP insurance/appeals.

---

## 16) PRD Snapshot (Attached within packet)

**Vision:** Auditable intelligence where every result is verifiable, every action lawful by construction, and every alliance safe by default.  
**Success:** Green tests, CI gates, demo; measurable SLOs; partner‑ready ZK‑TX MVP.

---

## 17) Appendices

- **DOR/DoD Checklists**
  - _DOR:_ schema agreed, acceptance written, fixtures ready, owner assigned.
  - _DoD:_ tests green, docs updated, dashboards live, demo recorded.
- **Templates & Scaffolding**
  - `prov-manifest.schema.json` v1.1
  - `pcq-fixture/` folder convention
  - `lac-policy.example.yaml` + diff sim CLI
  - `zk-tx/handshake.md` + checklist
  - Helm values for trust services + smoke tests

— **End of Workstream Packet** —
