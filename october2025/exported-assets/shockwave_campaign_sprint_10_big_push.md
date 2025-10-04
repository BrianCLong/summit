# ⚔️ SHOCKWAVE Campaign — Sprint 10 (BIG PUSH, Day 127–147)

**Start:** 2026‑02‑05  
**Duration:** 21 days (3‑week strike window)  
**Prime Directive:** Convert the machine we built into a **market‑crushing, regulator‑proof, partner‑magnet**. We do **not** rebuild S1–S9. We scale it, certify it, and cash it.

---
## Non‑Dup Boundary (inherits S1–S9)
Already delivered/in‑flight: provenance & universal receipts, verifier SDKs; authority lifecycle with OPA + formal proofs; ZTDP & sovereign/no‑egress; WORM/WORM+; ER‑XAI v5; Disclosure Bundler + reply/e‑file; GraphRAG + PiT + replay; Planner 3.3, hot‑path caches, p99 killbox; FinOps/billing/entitlements + overage/dunning; streaming/CDC 250k/min; offline kits + DR + A/A multi‑region; chaos/fuzz v2; SOC‑lite & auditor UX; adapter factory; predictive governance; blue/green per‑tenant; receipts everywhere. **Off‑limits to duplicate.**

---
## Campaign Objectives
1) **Regulator‑Grade Assurance:** independent verification packs (prov, policy proofs, privacy budgets, receipts, DR) signed and reproducible.  
2) **Million‑Node Hour:** sustained **scale trial** proving 1M new nodes/hour ingest with policy enforcement and deterministic replay.  
3) **Sub‑1s Everywhere:** copilot p95 <1.0s, graph reads p95 <700ms on the eval suite *and* two pilot tenants.  
4) **Partner Blitz:** 6 adapters from the factory with badges (License‑Safe, Deterministic Replay, WORM‑ready).  
5) **Sales‑Ready Evidence:** one‑click *Board Binder* and *Regulator Binder*, exportable and verifiable.

---
## Workstreams

### SW‑1 — Independent Assurance Pack (IAP v1)
**Lead:** @ops‑audit • **Areas:** `docs/`, `prov-ledger/`, `governance/`, `analytics/`, `RUNBOOKS/`
- [ ] Assemble third‑party‑consumable **Assurance Pack**: policy proofs, privacy budget ledgers, universal receipts samples, DR attestations, build→runtime chain, WORM receipts.  
- [ ] Verifier script bundle (TS/Go/Py) + reproducible dataset.  
- [ ] Auditor walkthrough script + read‑only persona.  
- **DoD:** Independent reviewer reproduces results on clean machine; 100% checks green.

### SW‑2 — Million‑Node Hour Trial (1MH)
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `data-pipelines/`, `storage/`, `graph-service/`, `finops/`
- [ ] Horizontal scale plan: sharded ingest queues, partitioned featurestore, batch receipts per shard.  
- [ ] Backpressure choreography + shed non‑critical paths; failure envelopes w/ replays.  
- [ ] Ten‑region parity sampling; license/TOS enforcement at sink with clause citations.  
- **DoD:** 1,000,000 nodes/hour sustained for 3 hours in staging; policy/receipt rates 100%; replay determinism across 2 regions.

### SW‑3 — Sub‑1s Everywhere (Perf Strike)
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `copilot/`, `cache/`, `planner/`
- [ ] Learned cardinality + **shape cache** for common subgraphs; plan hints surfaced to SDKs.  
- [ ] Answerability classifier + partial‑answer UX polish (no broken citations).  
- [ ] Tenant‑realistic evals: two pilot tenants mirrored with anonymized snapshots.  
- **DoD:** Copilot p95 <1.0s; graph reads p95 <700ms; citation integrity 100% on eval + pilots.

### SW‑4 — Partner Blitz (6 in 21)
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `contracts/`, `ci/`, `docs/`
- [ ] Adapter factory sprints: 6 target sources across two verticals.  
- [ ] Contract tests (license/throughput/DP) must pass; badges auto‑issued.  
- [ ] Examples + ROI snippets for each adapter.  
- **DoD:** 6 new adapters merged with badges; throughput ≥ target; replay proofs recorded.

### SW‑5 — Board & Regulator Binders (One‑Click)
**Lead:** @brief‑smith • **Areas:** `apps/web/`, `exports/`, `docs/`
- [ ] **Board Binder**: KPIs (SLOs, p95/p99, DR drills, cost/unit, NRR), receipts, and demo scripts.  
- [ ] **Regulator Binder**: policy proofs, privacy budgets, residency/retention logs, disclosure examples, selective‑reveal proofs.  
- [ ] Branding‑neutral PDFs with verifiable hashes; right‑to‑reply appendix.  
- **DoD:** Both binders export in <90s; external verifier passes; contents redaction‑safe.

### SW‑6 — Sovereign Hardening (Keys→Plans→Runtime)
**Lead:** @sre‑hawk • **Areas:** `deploy/`, `kms/`, `planner/`, `gateway/`
- [ ] Per‑tenant **plan cache** under KMS scope; cache receipts w/ plan‑hash.  
- [ ] Runtime attestation evidence embedded into receipts for hot paths.  
- [ ] No‑egress tenants blue/green with sealed build rotation proof.  
- **DoD:** Random sample receipts show key→plan→runtime chain; blue/green rotation for one sovereign tenant verified.

### SW‑7 — Casework Automation v4 (Throughput & Quality)
**Lead:** @brief‑smith • **Areas:** `workflows/`, `apps/web/`, `graph-xai/`
- [ ] SLA predictor + staffing suggestions; backlog burn simulator.  
- [ ] Reviewer assist: “Why not merged?” counter‑evidence fetcher; contradiction graph visual polish.  
- [ ] Cross‑border presets with residency/retention guardrails.  
- **DoD:** Median cycle‑time −25% vs S6; adjudication error rate −15%; analyst NPS +1.

### SW‑8 — Receipt‑First DevEx (Every PR Proves It)
**Lead:** @devrel • **Areas:** `ci/`, `examples/`, `sdks/`
- [ ] PR **artifact bundle**: fixtures, verifier output, receipts, perf deltas; bot enforces.  
- [ ] SE demo batteries v3 (1MH + PiT + sovereign).  
- [ ] Docs autogen from tests; permalinks to verifier runs.  
- **DoD:** 100% merged PRs have artifact bundles; demo battery p90 <12 min; docs publish with verifier links.

### SW‑9 — Trust‑at‑A‑Glance (Exec UI)
**Lead:** @ops‑audit • **Areas:** `apps/web/`, `analytics/`, `docs/`
- [ ] Single pane showing SLO burn, policy denies, privacy budgets, receipts velocity, DR posture.  
- [ ] "What changed?" diff across last 7 days with receipts.  
- **DoD:** Exec dashboard green → board ready; shareable snapshot with signed hash.

---
## Cross‑Cut Deliverables
- **C1. IAP Bundle** with third‑party verifier scripts and reproducible data.  
- **C2. 1MH Report** with receipts, costs, and replay proofs.  
- **C3. Sub‑1s Perf Board** for pilots + eval suite.  
- **C4. Adapter Blitz Badge Wall** showing 6 newly badged partners.  
- **C5. Board/Regulator Binders** one‑click exports + external verification links.

---
## Schedule & Cadence
- **D127–D129:** IAP scaffold; 1MH infra sharding; perf baselines; adapter picks; binder outlines.  
- **D130–D135:** 1MH dry‑run; shape cache + answerability; 3 adapters; sovereign plan cache; exec UI v1.  
- **D136–D142:** 1MH main event; sub‑1s polish; 3 more adapters; binders; receipts chain.  
- **D143–D147:** Hardening; third‑party verification; publish reports; board demo + regulator walkthrough.

---
## Acceptance Gates (Exit)
- ✅ Independent reviewer reproduces IAP on clean machine; all checks green.  
- ✅ **1,000,000 nodes/hour** sustained ×3h; determinism & license guard proved; costs recorded.  
- ✅ Copilot p95 <1.0s; graph p95 <700ms on eval + two pilot tenants; 0 broken citations.  
- ✅ 6 new adapters live with badges and ROI snippets.  
- ✅ One‑click **Board Binder** and **Regulator Binder** export and verify.  
- ✅ Sovereign receipts show key→plan→runtime link; blue/green sealed rotation proven.  
- ✅ Casework throughput ↑, errors ↓, NPS ↑ as specified.  
- ✅ Exec dashboard snapshot signed and archived.

---
## Risks & Mitigations
- **1MH instability** → pre‑shard, failure envelopes, staged load, auto‑shed non‑critical.  
- **Perf regression** → shape caches + plan hints + circuit breakers.  
- **Adapter quality variance** → factory tests + badges gate merges.  
- **Regulator pack scope creep** → time‑boxed v1 with strict checklists, punt extras to S11.  
- **Receipt chain fragility** → golden path tests + random-sample verification in CI.

**We don’t ask for trust. We deliver proof—at speed—and we weaponize it.**