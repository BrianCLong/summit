# ⚡️ Shock & Awe Sprint — Gap‑Closure Plan (IntelGraph)

> **Objective (14 days, start: 2025‑10‑02):** Close the highest‑risk product gaps blocking Council end‑state with *zero* duplication of work already shipped or queued. Ship hard, ship verifiable, and lock governance by design.

---
## Ground Rules (No‑Dup Gate)
- **Golden Path first:** If `make up`, `make up-ai`, or `make smoke` fails → fix before feature work.
- **Duplication kill‑switch:** Before starting any ticket, run the repo search checklist:
  - `ripgrep` for keywords across `graph-xai/`, `governance/`, `data-pipelines/`, `connectors/`, `prov-ledger/`, `featurestore/`, `ga-*`, `RUNBOOKS/`, `docs/`.
  - Check open PRs labeled `ready`, `ga-graphai`, `prov`, `governance`, `ops`. If  >70% overlap, **join** the existing effort.
- **Acceptance > promises:** Every story has explicit DoD + demo script + reproducible fixtures.
- **Ethics rail is law:** Declined asks remain declined; only defensive alternatives allowed.

---
## Sprint Framing
- **Theme:** *Provenance + Policy + Explainability* — ship the scaffolding that makes everything else credible.
- **Workstreams:** 10 parallel lanes with named leads, crisp outputs, and blocking risks called out.
- **Cadence:** Daily war room; Wed/Sat burn‑down; end‑of‑sprint evidence bundle + demo.

---
## WS‑1 — Provenance & Claim Ledger (Productionize)
**Lead:** @prov‑capt | **Areas:** `prov-ledger/`, `graph-service/`, `gateway/`, `docs/`

**Goal:** Turn the proto ledger into a first‑class service: evidence registration → claim graph → verifiable export bundle.

**Backlog (no‑dup aware):**
- [ ] **Service boundary**: split ledger API (`/claims`, `/evidence`, `/manifest`) behind `gateway` with auth scopes.
- [ ] **Hash chain**: content‑hash + transform chain per exhibit; Merkle manifest build on export.
- [ ] **Contradiction graph**: store `supports/contradicts` edges; expose diff API for briefs.
- [ ] **Verifier CLI**: `prov verify <bundle>` checks hashes + chain‑of‑custody.
- [ ] **Docs & demo**: mini‑case with 5 exhibits; show export→verify end‑to‑end.

**DoD:** Exported bundle reproducibly verifies on clean machine; API load test @ 200 RPS (p95<150ms) with 0 integrity failures.

**Risks:** Graph hot‑path latency; fix with write‑behind queue + backpressure.

---
## WS‑2 — Authority Binding & Warrant Registry (Governance Core)
**Lead:** @policy‑czar | **Areas:** `governance/`, `gateway/`, `feature-flags/`, `clients/cos-policy-fetcher/`

**Goal:** Tag every query/action with **legal basis**; block/allow via OPA; log reason‑for‑access.

**Backlog:**
- [ ] **Authority model**: `Authority{id, basis, scope, expiry, tenant}` + link to cases/users.
- [ ] **Query annotation**: middleware stamps `authorityId` + `purpose` on incoming GraphQL/REST calls.
- [ ] **OPA policies**: examples for selector minimization, export class, retention windows.
- [ ] **Warrant registry UI**: minimal CRUD + attestation upload + expiry alerts.
- [ ] **Appeal path**: event → ombuds queue; decision logged and searchable.

**DoD:** Blocked actions show human‑readable reason; simulation mode diff vs. last 30d queries; audit search returns who/what/why/when.

**Risks:** Over‑blocking; ship **policy simulator** toggle and canary tenants.

---
## WS‑3 — ER Explainability & Adjudication (ER‑XAI v1)
**Lead:** @er‑wright | **Areas:** `graph-service/`, `featurestore/`, `graph-xai/`, `apps/*`

**Goal:** Deterministic + probabilistic ER with **scorecards** and human adjudication.

**Backlog:**
- [ ] **Signals**: name/alias, phonetic, transliteration, geo/time co‑occurrence, doc signatures, device/browser, image **perceptual** hash (no biometric ID).
- [ ] **Explain API**: `/er/explain?idA&idB` returns features + weights + sample evidence.
- [ ] **Adjudication queue**: reversible merges/splits; override reason captured.
- [ ] **Confidence decay**: time‑based downgrades on stale merges.
- [ ] **UI panel**: “Why merged?” with feature bars + override history.

**DoD:** ROC‑AUC ≥0.8 on golden set; 100% merges have reproductions; undo/redo works; latency p95<300ms explain.

**Risks:** Feature drift; add drift monitors in `featurestore/`.

---
## WS‑4 — Disclosure Bundler (Chain‑of‑Custody Exports)
**Lead:** @brief‑smith | **Areas:** `apps/web/`, `gateway/`, `prov-ledger/`

**Goal:** One‑click **Disclosure Pack**: exhibits + manifest + license terms.

**Backlog:**
- [ ] **Packager**: zip with exhibits, `manifest.json`, license notices, redaction map.
- [ ] **Right‑to‑reply** fields scaffolded in brief.
- [ ] **Export class enforcement** via OPA rules (ties to WS‑2).
- [ ] **Verifiable PDFs**: hash stamps on figures and captions.

**DoD:** External verifier passes; ombuds template included; license violations blocked with reason.

---
## WS‑5 — GraphRAG with Path Rationales (Evidence‑First Copilot)
**Lead:** @rag‑marshal | **Areas:** `copilot/`, `graph-xai/`, `gateway/`, `apps/web/`

**Goal:** Natural‑language queries that return **subgraphs + citations**; every answer traces to paths.

**Backlog:**
- [ ] **Retriever**: subgraph slice by time/geo/policy labels.
- [ ] **Rationale builder**: path sets with costs; inline citations with provenance tooltips.
- [ ] **Redaction‑aware chunks**: block sensitive nodes/edges by policy at retrieval time.
- [ ] **UX**: diff view “AI vs manual query.”

**DoD:** 100% answers include resolvable citations; sandbox preview of generated Cypher; failure → graceful “insufficient evidence.”

---
## WS‑6 — Cost Guard & SLO Telemetry (FinOps + SRE)
**Lead:** @sre‑hawk | **Areas:** `grafana/`, `alerts/`, `gateway/`, `graph-service/`, `finops/`

**Goal:** Kill runaway queries and make performance visible.

**Backlog:**
- [ ] **Budgets** per tenant; query planner cost estimates; slow‑query killer with hints.
- [ ] **SLOs**: p95 graph query <1.5s (N=3 hops, 50k nodes); ingest E2E <5m for 10k docs.
- [ ] **Dashboards**: latency heatmaps; saturation; per‑connector health.
- [ ] **Chaos drill**: pod/broker kill script + playbook.

**DoD:** Two redlines caught in staging; burn alerts route to on‑call; monthly chaos drill passes.

---
## WS‑7 — Telemetry Sanity & Poisoning Defense
**Lead:** @signals‑sentry | **Areas:** `data-pipelines/`, `featurestore/`, `alerts/`

**Goal:** Catch bad sensors/feeds before they contaminate the graph.

**Backlog:**
- [ ] **Schema drift** alarms; **outlier windows**; honeypot source tagging.
- [ ] **Quarantine loop** for suspected poison; analyst adjudication UI.
- [ ] **Golden traces** replay job to track drift over time.

**DoD:** Simulated noisy feed → <2% triage false positives; all quarantines have rationales.

---
## WS‑8 — License/TOS Enforcement & Connector Manifests
**Lead:** @ingest‑warden | **Areas:** `connectors/`, `data-pipelines/`, `contracts/`, `docs/`

**Goal:** Every connector ships with license manifest + mapping + rate limits; exports obey source terms.

**Backlog:**
- [ ] **License registry** with per‑source policy.
- [ ] **Connector template**: mapping contracts, sample dataset, golden IO tests.
- [ ] **Export blocker**: reasons surfaced to UI with appeal path.

**DoD:** 10 top connectors upgraded; blocked export shows exact clause + owner; tests green in CI.

---
## WS‑9 — Offline/Edge Kit v1 (CRDT Sync)
**Lead:** @edge‑ops | **Areas:** `apps/web/`, `gateway/`, `sync/*`, `deploy/`

**Goal:** Degraded/offline operation for field kits with **cryptographic resync** on reconnect.

**Backlog:**
- [ ] **Local vault** per case; sealed secrets; tamper‑evident logs.
- [ ] **CRDT merges** for notes/annotations; divergence report.
- [ ] **Sync window**: opportunistic, signed; operator approvals.

**DoD:** Demo on laptop‑only scenario; resync produces zero conflicts on scripted run; signed sync logs archived.

---
## WS‑10 — Abuse Detection & Guardrails (Prompt‑Injection Watch)
**Lead:** @redteam | **Areas:** `copilot/`, `graph-xai/`, `alerts/`, `docs/`

**Goal:** Detect model abuse, prompt‑injection, and selector misuse; quarantine + report.

**Backlog:**
- [ ] **Heuristics** for jailbreak/PII exfil prompts; capture and redact safely.
- [ ] **Selector misuse** detector (multi‑tenant patterns) feeding ombuds queue.
- [ ] **Red‑team corpus** + replay harness; publish model cards + limits.

**DoD:** 10 deliberately malicious prompts caught in CI; ombuds queue populated with full context; postures documented.

---
## Cross‑Cutting Deliverables (Sprint Exit Criteria)
- **E1. Evidence Bundle:** Repo‑checked `examples/prov-demo/*` case with five exhibits and a passing `prov verify` run.
- **E2. Demo Script:** Playbook exercising all 10 lanes in 12 minutes (recorded + script committed).
- **E3. Docs:** Updated `docs/README.md`, operator OPSEC guide, and three “Hello World” connector recipes.
- **E4. SLO Board:** Grafana dashboard link + two live breach alerts acknowledged.

---
## Resourcing & Sequencing
- **Day 0–1:** No‑Dup Gate runs; smoke tests; align on design seams for WS‑1/2/3.
- **Day 2–5:** Parallel builds kick; seeds for fixtures/golden datasets created; dashboards scaffolded.
- **Day 6–10:** Integrations across WS‑1↔WS‑4↔WS‑5↔WS‑2; policy simulation canaries; chaos drill.
- **Day 11–14:** Hardening, docs, demo polish; package disclosure bundle; finalize acceptance checks.

---
## Risks & Mitigations
- **Latency regressions** → budget hints + sampled caches + result size caps.
- **Over‑zealous policy blocks** → simulator + canary tenants + emergency break‑glass with audit.
- **ER brittleness** → drift monitors + adjudication queue SLA.
- **Connector license ambiguity** → default‑deny + owner contact path + clear override workflow.

---
## Out‑of‑Scope (explicit to avoid duplication)
- Computer‑vision/ASR model training; face/biometric identification features (ethics & legal risk).
- New UI chrome/branding work; only panels needed for WS‑1/2/3/4/5.
- Net‑new runbooks beyond what’s needed for demonstrations.

---
## Tracking & Labels
- `sprint:shock‑awe`, `area:prov`, `area:governance`, `area:graph‑xai`, `area:finops`, `type:harden`, `acceptance:strict`.

**We play for keeps. Measure twice, ship once, verify always.**

