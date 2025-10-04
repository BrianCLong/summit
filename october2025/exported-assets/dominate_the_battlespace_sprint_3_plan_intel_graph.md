# 💣 Dominate the Battlespace — Sprint 3 (Day 29–42)

**Start:** 2025‑10‑30  
**Duration:** 14 days  
**Prime Directive:** Convert the federated, governed core into a **GA‑ready operating product**. Hard scale, multi‑region trust, airtight ops. No duplication of Sprint‑1 or Sprint‑2—this is exploitation and finish.

---
## Non‑Dup Boundary (inherits prior sprints)
We **do not** re‑implement: provenance/attestation core, authority lifecycle, ER‑XAI v2 + golden tasks, Disclosure Bundler + reply flow, GraphRAG caching/evals, FinOps planner v2/budget guards, streaming/CDC connectors, field kit + DR, red‑team v2, SOC‑lite & auditor UX. We build **on** them to earn GA.

---
## Sprint Objectives
1) **GA Readiness:** SLAs/SLOs locked, on‑call runbooks, and incident response rehearsed.  
2) **Scale & Region:** Multi‑region active/active + tenant isolation proofs.  
3) **Privacy‑Preserving Analytics:** ship k‑anonymity + DP options for aggregate insights.  
4) **Casework Acceleration:** reusable brief/templates, repeatable workflows.  
5) **Vendor/Partner Integrations:** two concrete partner adapters with license‑safe flows.

---
## Workstreams

### WS‑α — Multi‑Region Active/Active + Isolation Proofs
**Lead:** @sre‑hawk • **Areas:** `deploy/`, `gateway/`, `graph-service/`, `sync/`
- [ ] Dual‑region write quorum with conflict policy (CRDT for notes; last‑writer for idempotent ops).  
- [ ] **Blast radius** tests: per‑tenant network policy, per‑region keying, traffic shadowing.  
- [ ] Regional fail‑forward runbook + health‑based router.  
- **DoD:** Tenant isolation penetration test **passes**; failover/fail‑forward demo with zero data loss beyond RPO; shadow traffic parity ≥99.5%.

### WS‑β — GA SLOs, Error Budgets, & IR Drills
**Lead:** @ops‑audit • **Areas:** `RUNBOOKS/`, `alerts/`, `grafana/`
- [ ] SLOs: API p95 < 800ms (read), <1.8s (3‑hop graph), ingest E2E < 3m @ 10k docs.  
- [ ] **Error budget** burn alerts + weekly review ritual documented.  
- [ ] Pager playbooks: severity matrix, comms templates, RCAs (5‑Why + timeline), status page hooks.  
- **DoD:** Two live IR drills: (1) hot‑path latency spike, (2) connector poisoning—both closed with RCAs merged.

### WS‑γ — Privacy‑Preserving Analytics (PPA v1)
**Lead:** @policy‑czar • **Areas:** `governance/`, `analytics/`, `opa/`
- [ ] **Aggregate endpoints** (counts, co‑occurrence) with policy‑aware row filters.  
- [ ] k‑anonymity guard (k≥10) with suppression, and **optional ε‑DP** noise on aggregates.  
- [ ] Privacy budget ledger per tenant + per analyst.  
- **DoD:** Aggregates respect policy slices; k‑anon violations blocked with human‑readable reasons; DP ledger exportable.

### WS‑δ — Casework Templates & Workflow Engine
**Lead:** @brief‑smith • **Areas:** `apps/web/`, `workflows/`, `docs/`
- [ ] Case template pack: fraud, safety, due‑diligence, public‑interest.  
- [ ] **Workflow states** (triage → analysis → adjudication → disclosure) with entry/exit criteria.  
- [ ] SLA timers + escalations; per‑state checklists; evidence completeness meter.  
- **DoD:** Two case types completed E2E with measurable cycle‑time reduction ≥25% vs ad‑hoc.

### WS‑ε — ER‑XAI v3 (Open‑World & Decay Policies)
**Lead:** @er‑wright • **Areas:** `graph-xai/`, `featurestore/`, `apps/web/`
- [ ] Open‑world entity creation thresholds tuned with policy gates.  
- [ ] **Time‑decay** and region‑specific signals; explain panel shows decay factors.  
- [ ] Active‑learning replay safeguards (no catastrophic override).  
- **DoD:** +3pp F1 over v2 on rolling golden set; no regression on fairness slices; every merge shows decay rationale.

### WS‑ζ — Partner Integrations (2 Targets)
**Lead:** @ingest‑warden • **Areas:** `connectors/`, `contracts/`, `exports/`
- [ ] Adapter A: secure pull with rate/term enforcement; signed receipts into prov‑ledger.  
- [ ] Adapter B: push webhooks with license classification on arrival.  
- [ ] Export adapters honoring **export‑class** policy; receipts + right‑to‑reply thread IDs.  
- **DoD:** Both partners complete sandbox flows; compliance checks green; receipts resolvable in audit.

### WS‑η — Query Planner v3 + Hot‑Path Caching
**Lead:** @rag‑marshal • **Areas:** `graph-service/`, `cache/`, `copilot/`
- [ ] Cardinality estimation learned from telemetry; hint surface to clients.  
- [ ] Hot‑path materialized subgraphs with TTL + invalidation hooks from policy events.  
- [ ] Copilot latency guardrails (token + hop budgeting surfaced to UX).  
- **DoD:** p95 graph read down 20% vs Sprint‑2; copilot median latency < 800ms on eval set; zero stale‑cache policy breaches.

### WS‑θ — Chaos Engineering & Fault‑Isolation
**Lead:** @redteam • **Areas:** `chaos/`, `deploy/`, `alerts/`
- [ ] Fault injection: broker partition, cache thrash, stale policy, partial region outage.  
- [ ] **GameDays** with scorecards and replay artifacts.  
- **DoD:** 4 faults injected; auto‑recovery for 3; one manual runbook executed within SLA; all artifacts committed.

### WS‑ι — Docs, SDKs, and Enablement
**Lead:** @devrel • **Areas:** `docs/`, `sdks/ts,go,py`, `examples/`
- [ ] SDKs: provenance verify; authority simulator; GraphRAG with path rationales.  
- [ ] **Tutorial triad:** “Verify a bundle”, “Adjudicate a merge”, “File a disclosure + reply”.  
- [ ] Example sandboxes with deterministic fixtures.  
- **DoD:** All SDKs publishable; quickstarts <10 min; examples pass CI.

---
## Cross‑Cut Deliverables
- **G1. GA Checklist** (SLOs, backups, DR, on‑call, runbooks, security review, DPA/ToS, data map).  
- **G2. External Verifier SDKs** (TS/Go/Py) + CLI parity.  
- **G3. Privacy Budget Ledger** with auditor export.  
- **G4. GameDay Pack**: scripts, results, and RCAs.  
- **G5. Two Partner Reference Implementations** end‑to‑end.

---
## Schedule & Cadence
- **D29–D31:** Baselines, capacity tests, IR handbook, partner sandbox creds.  
- **D32–D36:** Core builds (α, γ, δ, η); privacy ledger; templates; caches.  
- **D37–D40:** Multi‑region drills, partner flows, chaos GameDay #1.  
- **D41–D42:** Hardening; docs; GA checklist sign‑off; demo + receipts.

---
## Acceptance Gates (Exit)
- ✅ Multi‑region fail‑forward within SLA; isolation tests pass.  
- ✅ GA SLOs met for 7 consecutive days in staging.  
- ✅ PPA endpoints enforce k‑anon and DP budgets; audits exportable.  
- ✅ Case templates reduce cycle time ≥25%.  
- ✅ +3pp ER‑XAI F1 over v2 with documented decay factors.  
- ✅ Copilot median <800ms; p95 graph read −20%.  
- ✅ Two partner flows completed with receipts and compliant exports.  
- ✅ GameDay pack complete with RCAs committed.

---
## Risks & Mitigations
- **Cross‑region consistency vs. latency** → selective CRDTs + idempotent ops + per‑region caches.  
- **DP/k‑anon usability** → toggles + clear error messages + preflight preview.  
- **Partner SLA surprises** → traffic shaping + graceful backoff + offline queuing.  
- **On‑call maturity** → rehearse, rehearse, rehearse—then automate.

**No mercy for toil. Make it boring to operate—and impossible to break without leaving tracks.**

