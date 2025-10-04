# 🔥 Relentless Advance — Sprint 2 (Day 15–28)

**Start:** 2025‑10‑16  
**Duration:** 14 days  
**Prime Directive:** Convert the Sprint‑1 scaffolding into **operational muscle**: scale, federate, and field‑prove. No rework. No drag. **Exploit what we just shipped.**

---
## Non‑Dup Boundary (inherits Sprint‑1)
We **do not** rebuild: provenance ledger core, authority/warrant registry MVP, ER‑XAI v1, Disclosure Bundler, GraphRAG path rationales MVP, Cost Guard/SLO baseline, poisoning defense baseline, license/TOS enforcement MVP, Offline/Edge Kit v1, abuse guardrails MVP. We build **on** them.

---
## Sprint Objectives
1) **Federate & scale** provenance + policy across tenants and regions.  
2) **Operationalize adjudication** with active learning + quality loops.  
3) **Prove fieldworthiness**: pilot kits, DR, and performance budgets under load.  
4) **Compliance‑ready** posture: audit trails, SOC‑lite controls, export hygiene.

---
## Workstreams

### WS‑A — Provenance Federation & Attestation Chains
**Lead:** @prov‑capt • **Areas:** `prov-ledger/`, `gateway/`, `docs/`
- [ ] Cross‑tenant provenance export/import with trust anchors (x‑org Merkle roots).  
- [ ] Attestation chain format v0.2 (issuer, purpose, scope, expiry).  
- [ ] External verifier SDK (Go + TS).  
- **DoD:** Verify third‑party bundle created in Tenant A from Tenant B data; CLI passes on clean machine; docs include threat model.

### WS‑B — Authority Lifecycle Automation (OPA Packs)
**Lead:** @policy‑czar • **Areas:** `governance/`, `opa/`, `alerts/`
- [ ] Policy packs: retention, export‑class, selector minimization, break‑glass.  
- [ ] Auto‑expiry & renewal flows with alerts + simulation diffs.  
- [ ] Policy provenance stamping into audit log.  
- **DoD:** 3 canary tenants run packs; expiring authority auto‑blocks with human‑readable reason; audits show policy hash.

### WS‑C — ER‑XAI v2 (Active Learning + Golden Tasks)
**Lead:** @er‑wright • **Areas:** `graph-xai/`, `featurestore/`, `apps/web/`
- [ ] Human‑in‑the‑loop queues choose **hard pairs** via margin sampling.  
- [ ] Label propagation with confidence decay; override replay tests.  
- [ ] Golden‑task harness (10 canonical merges/splits) for CI gates.  
- **DoD:** +4pp F1 over v1 on golden set; training data lineage recorded in prov‑ledger; adjudication SLA <24h.

### WS‑D — Disclosure Bundler Integrations (E‑Filing & Reply)
**Lead:** @brief‑smith • **Areas:** `apps/web/`, `exports/`
- [ ] Right‑to‑Reply flow: notify, collect, appendenda ledger entry.  
- [ ] E‑filing adapters (pluggable; mock two targets).  
- [ ] Evidence diff visualizer (supports/contradicts view).  
- **DoD:** Demo pack includes reply addendum and verifiable diff; e‑filing mock returns receipt ID and hash.

### WS‑E — GraphRAG Reliability & Caching
**Lead:** @rag‑marshal • **Areas:** `copilot/`, `gateway/`, `cache/`
- [ ] Deterministic retrieval cache keyed by **query + policy slice + time window**.  
- [ ] Failure taxonomy + retry/backoff; insufficiency explainer templates.  
- [ ] Eval harness: 25 question set with exact‑match, coverage, and citation validity.  
- **DoD:** 0 hallucination claims on eval; cache hit ≥40% with identical answers + identical citations.

### WS‑F — FinOps Auto‑Tuning & Query Planner v2
**Lead:** @sre‑hawk • **Areas:** `finops/`, `graph-service/`, `grafana/`
- [ ] Cost hints feed back into planner (cardinality + hop caps).  
- [ ] Per‑tenant budgets auto‑throttle; user‑visible hints.  
- [ ] Cost regression guard in CI (reject PRs >20% cost).  
- **DoD:** 2 runaway queries auto‑stopped in staging; planner lowers p95 by 15% on standard suite.

### WS‑G — Streaming & CDC Connectors
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `data-pipelines/`
- [ ] Debezium‑style CDC template + sample pipeline.  
- [ ] Source license manifest v1.1 (rate/term enforcement at sink).  
- [ ] Golden IO tests for 3 top connectors; backfill replay scripts.  
- **DoD:** 50k events/min sustained ingest in staging without policy violations; replay determinism proven.

### WS‑H — Field Kit Pilot & DR Drill
**Lead:** @edge‑ops • **Areas:** `sync/`, `deploy/`, `RUNBOOKS/`
- [ ] Pilot with 3 kits: auth bootstrapping, sealed vault rotation, operator approvals.  
- [ ] DR: snapshot, restore, and **cross‑region failover** rehearsal with RTO<30m, RPO<5m.  
- **DoD:** Scripted offline capture → resync → disclosure pack; DR run on calendar with signed attestation.

### WS‑I — Abuse/Threat Red‑Team & Telemetry Hardening
**Lead:** @redteam • **Areas:** `copilot/`, `alerts/`, `docs/`
- [ ] Prompt‑injection corpus v2 (cross‑tenant exfil attempts).  
- [ ] Selector‑misuse detector feeding ombuds metrics.  
- [ ] Public “limits & commitments” doc v0.9.  
- **DoD:** 90%+ attack scenarios detected/blocked in replay; metrics dashboard live.

### WS‑J — Compliance Lift (SOC‑lite + Audit UX)
**Lead:** @ops‑audit • **Areas:** `governance/`, `docs/`, `apps/web/`
- [ ] Access review workflow (quarterly), evidence of control operation.  
- [ ] Immutable audit timeline per case/user.  
- [ ] Minimal auditor view (read‑only, scoped).  
- **DoD:** 12 control artifacts produced; external auditor persona can reconstruct one case end‑to‑end.

---
## Cross‑Cuts & Deliverables
- **D1. Evidence of Improvement:** Perf & cost deltas vs Sprint‑1 on standard suite.  
- **D2. Field Pilot Report:** Ops notes, issues, and signed DR attestation.  
- **D3. Eval Pack:** GraphRAG+ER‑XAI evals, golden tasks, and CI gates.  
- **D4. Policy Packs:** Versioned OPA bundles with examples and simulator outputs.  
- **D5. Docs & Training:** Operator OPSEC v1.1; “how we verify” handbook; SDK quickstarts.

---
## Schedule & Cadence
- **D15–D16:** Kick, no‑dup audit, perf baselines, fixture generation.  
- **D17–D21:** Core builds (A–G) in parallel; pilot prep; red‑team corpus expansion.  
- **D22–D25:** Integrations & load; DR drill; eval/cost regressions wired to CI.  
- **D26–D28:** Hardening; docs; demo; auditor walkthrough; sign‑offs.

---
## Acceptance Gates (Sprint Exit)
- ✅ External bundle verified across tenants.  
- ✅ GraphRAG eval: zero broken citations; cache hit ≥40%.  
- ✅ ER‑XAI +4pp F1 over v1; adjudication SLA <24h.  
- ✅ DR: RTO<30m, RPO<5m proven.  
- ✅ Cost p95 down ≥15%; PR cost guard active.  
- ✅ Policy packs live in 3 tenants with simulator diffs.  
- ✅ Auditor persona reproduces a case using only audit artifacts.

---
## Risks & Mitigations
- **Federation trust mismatch** → strong attestation spec + cross‑org keys + revoke.  
- **Cache staleness** → policy/time‑bounded keys + invalidation hooks.  
- **Pilot churn** → tight SOPs, ROE, and rollback script.  
- **Cost regressions** → CI guard + planner hints.  
- **Over‑blocking policy** → simulator‑first + canaries + appeal path.

**March fast. Verify everything. Leave receipts.**

