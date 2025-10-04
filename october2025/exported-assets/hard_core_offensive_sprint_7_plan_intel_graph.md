# ☠️ HARdCORE Offensive — Sprint 7 (Day 85–98)

**Start:** 2025‑12‑25  
**Duration:** 14 days  
**Prime Directive:** Break the ceiling. Formalize what’s implicit, prove what’s claimed, and harden the blast‑doors. Nothing duplicated from S1–S6 — this is the **pain cave** where weak links die.

---
## Non‑Dup Boundary (inherits S1–S6)
Hands off re‑implementing: provenance/attestation + verifier SDKs, authority lifecycle & OPA packs, ER‑XAI v3, Disclosure Bundler + reply/e‑file, GraphRAG + caching + Planner 3.2, FinOps/billing/entitlements, streaming/CDC + 200k/min ingest, offline kits + DR + multi‑region A/A, chaos GameDays, SOC‑lite/auditor UX, partner adapters, tenant scale‑out, brief factory, auditor auto‑packs, ZTDP, i18n, compliance automation, self‑serve growth.

---
## Sprint Objectives
1) **Provably Correct Policy**: machine‑checked policies + proofs wired into releases.  
2) **Sovereign Deploys**: region‑sealed builds, no‑egress tenants, and air‑gapped disclosure workflows.  
3) **Irreversible Evidence**: tamper‑evident storage with write‑once semantics and cryptographic receipts.  
4) **Zero‑Downtime Upgrades**: schema evolution + rolling index changes at scale.  
5) **Mean‑Time‑to‑Mitigate**: automated IR from alert → containment → attestations.

---
## Workstreams

### HC‑1 — Policy Formal Methods (OPA→Rego‑IR + Proofs)
**Lead:** @policy‑czar • **Areas:** `governance/`, `opa/`, `ci/`
- [ ] Rego policy compilation to IR + **SMT‑checkable constraints** (safety/liveness for selectors, exports).  
- [ ] Counterexample generator feeding simulator UI.  
- [ ] CI gate: reject merges without model‑checked proofs for changed policies.  
- **DoD:** 3 core packs (retention, export‑class, minimization) ship with proofs; counterexamples render in UI; CI blocks unsafe diffs.

### HC‑2 — Sovereign & No‑Egress Tenants
**Lead:** @sre‑hawk • **Areas:** `deploy/`, `gateway/`, `storage/`
- [ ] No‑egress network policy per tenant + scoped artifact mirrors.  
- [ ] **Region‑sealed builds**: signed, pinned base images; provenance receipts.  
- [ ] Air‑gapped **Disclosure Station**: offline brief creation + QR/USB manifest transfer with verify‑on‑ingest.  
- **DoD:** Tenant with no external egress operates normally; disclosure station round‑trip verified; build seals auditable.

### HC‑3 — Write‑Once Evidence & Receipts (WORM‑ish)
**Lead:** @prov‑capt • **Areas:** `prov-ledger/`, `storage/`, `docs/`
- [ ] WORM layer (time‑boxed immutability + admin escrow) for exhibits/manifests.  
- [ ] **Receipt trees**: per‑batch Merkle branches stored separate from content.  
- [ ] Legal hold + purge attestation entries with dual‑control.  
- **DoD:** Attempts to mutate within lock window blocked with explainable deny; receipts validate end‑to‑end; dual‑control audited.

### HC‑4 — Zero‑Downtime Schema/Index Evolution
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `migrations/`, `cache/`
- [ ] Online schema migration framework (shadow writes + backfill + cutover).  
- [ ] Rolling index builds with traffic shadowing + cache warmers.  
- [ ] Canary verifiers for query plans + cache key stability.  
- **DoD:** Two breaking changes shipped with **zero downtime**; p95 doesn’t regress during cutovers; verifiers catch plan drift.

### HC‑5 — Autonomic Incident Response (IR‑Auto)
**Lead:** @ops‑audit • **Areas:** `alerts/`, `RUNBOOKS/`, `finops/`
- [ ] Playbooks to **actions**: budget burn → auto‑throttle; poisoning suspicion → quarantine + ombuds ticket; latency spike → query caps + hint injection.  
- [ ] IR attestation bundle: who/what/when/actions + policy hashes.  
- [ ] Status page hooks with redaction rules.  
- **DoD:** Three live incidents auto‑contained within SLO; attestation bundles published; comms clean.

### HC‑6 — ER‑XAI v4 (Cold‑Start + Adversarial)
**Lead:** @er‑wright • **Areas:** `graph-xai/`, `featurestore/`, `apps/web/`
- [ ] **Cold‑start entity** handling (few‑shot priors + conservative thresholds).  
- [ ] Adversarial merges/splits detection (feature constraint violations).  
- [ ] Explain panel shows constraint checks + priors.  
- **DoD:** F1 +2pp on long‑tail entities; ≥90% adversarial tests flagged; explanations cite violated constraints.

### HC‑7 — Graph Compaction & Aging Policies
**Lead:** @ingest‑warden • **Areas:** `storage/`, `graph-service/`, `governance/`
- [ ] Time‑tiered nodes/edges with **age‑aware traversal** (bias fresh; archive cold).  
- [ ] Evidence aging policies tied to residency/retention.  
- [ ] Compaction jobs with receipts and rollback.  
- **DoD:** 25% storage reduction with no precision loss on eval; traversal latency −10% from age bias; audit shows compaction receipts.

### HC‑8 — Black‑Box Fuzzing & Fault Injection v2
**Lead:** @redteam • **Areas:** `chaos/`, `gateway/`, `copilot/`
- [ ] Protocol fuzzing against gateway + copilot request schemas.  
- [ ] Multi‑fault scenario injection (cache thrash + broker partition + policy stale).  
- [ ] Coverage dashboard + auto‑filed bugs with receipts.  
- **DoD:** 30+ unique crashes/violations reduced to 0 critical; dashboard live; bugs linked to commits.

### HC‑9 — DevEx: Deterministic Sandboxes & Golden Cases
**Lead:** @devrel • **Areas:** `examples/`, `sdks/`, `ci/`
- [ ] Golden casepacks (fraud/safety/diligence) with fixed seeds and reproducible outputs.  
- [ ] Sandbox reset button → known‑good state; **time‑travel** fixtures for regression hunts.  
- [ ] Docs: “Run the whole demo in 10 minutes” script.  
- **DoD:** Casepacks reproduce byte‑for‑byte; reset works in <30s; demo script p90 <10m.

---
## Cross‑Cut Deliverables
- **H1. Policy Proof Pack:** IR + proofs + simulator counterexamples.  
- **H2. Sovereign Ops Guide:** no‑egress patterns, sealed builds, disclosure station SOP.  
- **H3. WORM Receipts:** immutability attestations + dual‑control logs.  
- **H4. Zero‑Downtime Playbook:** schema/index cookbook + verifiers.  
- **H5. IR Evidence Bundle:** incident timeline, actions, SLO impact, receipts.

---
## Schedule & Cadence
- **D85–D87:** Formal methods scaffolding; no‑egress tenant; WORM design; migration framework baseline.  
- **D88–D92:** Proofs on three policy packs; air‑gapped disclosure station; online index build; IR automation.  
- **D93–D96:** ER‑XAI cold‑start/adversarial; compaction + age‑aware traversal; fuzzing multi‑fault.  
- **D97–D98:** Hardening; receipts; docs; demo that breaks things on purpose—and survives.

---
## Acceptance Gates (Exit)
- ✅ 3 policy packs ship with machine‑checked proofs; CI blocks unsafe diffs.  
- ✅ One no‑egress tenant + sealed builds; air‑gapped disclosure round‑trip verified.  
- ✅ WORM layer blocks mutation; receipts validate; dual‑control logged.  
- ✅ Two breaking schema/index changes shipped **zero downtime**; p95 stable.  
- ✅ Three incidents auto‑contained with attestation bundles.  
- ✅ ER‑XAI +2pp on long tail; ≥90% adversarial flagged.  
- ✅ Storage −25% with no precision loss; traversal −10%.  
- ✅ Fuzzing v2: 0 criticals; dashboard live; bugs closed with receipts.

---
## Risks & Mitigations
- **Proof brittleness** → scope to high‑value policies first; human‑readable counterexamples.  
- **Sovereign friction** → prefab artifacts mirrors; operator training.  
- **WORM compliance edge cases** → admin escrow + narrow exception SOP with receipts.  
- **Migration hazards** → shadow writes, backfills, and auto‑verifiers before cutover.  
- **IR automation overreach** → conservative guardrails + human‑in‑the‑loop on escalation.

**This is the breaker bar. We don’t hope it’s secure—we *prove* it. And we keep receipts.**

