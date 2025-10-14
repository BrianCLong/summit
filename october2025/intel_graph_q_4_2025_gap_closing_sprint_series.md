# IntelGraph Q4 2025 Gap‑Closing Sprint Series

## Overview
A four‑sprint, two‑week cadence to close gaps across the Wishbook (Final Product, Expanded/Exhaustive, Vol II–IV) and reach a GA‑ready Core with auditable autonomy, provenance, governance, and tri‑pane UX. Scope focuses on **Near‑Term (Q3–Q4 2025)** deliverables, acceptance criteria patterns, and ops SLOs, while laying hooks for Vol II–IV IP (proof‑carrying analytics, zero‑copy federation, dialectic agents, etc.).

**Timeline (America/Denver):**
- **Sprint 1:** Wed **Oct 1 → Oct 14, 2025**
- **Sprint 2:** **Oct 15 → Oct 28, 2025**
- **Sprint 3:** **Oct 29 → Nov 11, 2025**
- **Sprint 4:** **Nov 12 → Nov 25, 2025**

## Cadence & Ceremony
- Daily stand‑up, Story‑Owner sync (rotating), mid‑sprint demo check, E2E test gate every Friday, sprint review & retro on last day.
- Branching: trunk‑based with protected `main`; feature branches `feature/<epic>-<short>`; PRs require 2 approvals, green CI (unit, contract, e2e, k6 smoke), and security checks (SAST, secrets).

## Cross‑Cutting Definition of Ready (DoR)
- User story has mapped **authority/license** & **purpose** tags; DPIA impact noted.
- Acceptance criteria explicit; test fixtures attached; telemetry plan (metrics + logs + traces) defined.
- Performance budget declared (latency / throughput / $/insight).

## Cross‑Cutting Definition of Done (DoD)
- All acceptance tests pass; **provenance/lineage** captured; **audit** events emitted.
- XAI/guardrail card rendered where AI present; **policy reasoner** messages human‑readable.
- Docs: user guide page + API snippet + runbook (if applicable); demo dataset wired.
- Observability: OTEL traces, Prom metrics, log fields validated; Grafana panel updated.
- Security: RBAC/ABAC checks; permission tests; secrets from vault; SBOM refreshed.
- Cost guard: query budget or cache path implemented; dashboard updated.

## Risk & Mitigation (Global)
- **Data license conflicts:** enforce license tags at ingest; block/appeal path in UI.
- **Query cost blowups:** enable cost guard + slow‑query killer; k6 load tests per epic.
- **Model drift / red‑team:** activate adversarial eval job nightly; quarantine on regressions.
- **Offline/merge conflicts:** CRDT merge tests with conflict resolver UIs.

## Environments & Release Train
- `dev` (ephemeral previews per PR) → `stage` (nightly) → `prod` (end of Sprint 4). Canary + auto‑rollback; schema migration gates.

---

# Sprint 1 — Foundation & Compliance Rails (Oct 1–14)
**Theme:** Ship the guardrails that make everything else safe to integrate.

### Epics & Key Stories
1. **Authority/License Compiler (LAC) v0.9**
   - Compile case policies (licenses, warrants, DPAs) into query bytecode; block unsafe ops.
   - Stories: policy DSL schema; compiler & simulator; query‑time enforcer; UI reason panel; appeal workflow stub.
   - Acceptance: 100% policy hit rate on test corpus; diff simulator shows impact of policy changes.
2. **Provenance & Claim Ledger (β)**
   - Evidence registration, hash trees, transform chains; export manifests + external verifier CLI.
   - Stories: claim model; ingest hooks; export manifest generator; verifier CLI; selective disclosure stubs.
   - Acceptance: manifest verifies deterministically; tamper diff produces fail with readable cause.
3. **ABAC/RBAC + Step‑Up Auth**
   - OIDC/JWKS; attribute tags (origin, sensitivity, legal basis); WebAuthn for high‑risk actions.
   - Acceptance: 4‑eyes required flows; reason‑for‑access prompts land in audit.
4. **Ingest Wizard & ETL Assistant v1**
   - Schema mapper w/ AI suggestions; PII classifier; DPIA checklist; redaction presets; license tagging.
   - Acceptance: map CSV→canonical in ≤10 min on golden sample; PII/blocked fields show policy reasons.

### QA/Perf/Obs
- k6 smoke for LAC & ledger paths; OTEL spans on policy decisions; Grafana: policy hits/misses, manifest verify time.

### Deliverables
- LAC service + UI panel; Prov‑Ledger β with CLI; ABAC/RBAC/Step‑Up; Ingest Wizard v1; Docs & demo.

---

# Sprint 2 — Analyst Surface & Analytics Core (Oct 15–28)
**Theme:** Make the platform usable end‑to‑end by analysts.

### Epics & Key Stories
1. **Tri‑Pane UX (graph/timeline/map) v1**
   - Synchronized brushing; pinboards; provenance tooltips; confidence opacity; undo/redo.
   - Acceptance: user completes labeled workflow 30% faster vs. baseline; A11y checks pass.
2. **NL → Cypher (Glass‑Box) v0.9**
   - Prompt→generated Cypher preview; cost/row estimates; sandbox execution; rollback.
   - Acceptance: ≥95% syntactic validity on test prompts; user can diff vs. manual query.
3. **Analytics Pack v1**
   - Shortest/K‑shortest; Louvain/Leiden; betweenness/eigenvector; bridge/broker; explain panels.
   - Acceptance: reproduce benchmark metrics within tolerance; XAI panes cite features/paths.
4. **Pattern Miner (starter)**
   - Temporal motifs; co‑travel/co‑presence; financial fan‑in/out; param panels; save/share.
   - Acceptance: 10+ templates with fixtures; provenance on outputs.

### QA/Perf/Obs
- p95 graph query < 1.5s on 50k nodes/3‑hop paths; latency heatmap; query cost guard thresholds.

### Deliverables
- Tri‑pane v1; NL→Cypher v0.9; Analytics v1; Pattern miner starter; Docs, tutorials, sample datasets.

---

# Sprint 3 — Collaboration, Runbooks, and Cost/Resilience (Oct 29–Nov 11)
**Theme:** Turn analysis into decisions with proofs, and keep it fast & cheap.

### Epics & Key Stories
1. **Case Spaces & Report Studio**
   - Tasks, roles, watchlists, SLA timers; timeline/map/graph figures; one‑click PDF/HTML with redaction.
   - Acceptance: disclosure pack bundles evidence + manifest; legal hold works; @mentions audited.
2. **Runbook Runtime v1 + Library (R1, R2, R3, R4, R7, R9)**
   - DAG engine (record prompts/params/paths); emits machine‑checkable pre/post‑condition proofs.
   - Acceptance: runbooks block export if KPIs/citations missing; replay logs complete.
3. **Cost Guard & Archived Tiering**
   - Budgets per tenant/case; slow‑query killer; S3/Glacier lifecycle; cached claims.
   - Acceptance: 20–40% cost reduction on benchmark workloads with equal accuracy.
4. **Offline Expedition Kit v1**
   - CRDT merge; signed sync logs; conflict resolver UI.
   - Acceptance: 72‑hr disconnect test passes with reproducible sync and no data loss.

### QA/Perf/Obs
- Load tests for report exports; chaos drill (pod/broker kill); RTO ≤ 1h, RPO ≤ 5m validated.

### Deliverables
- Case & Reports; Runbook engine + 6 runbooks; Cost guard; Archive tiering; Offline kit v1; Docs.

---

# Sprint 4 — XAI Deepening, Federation Stubs, and GA Hardening (Nov 12–25)
**Theme:** Bake in explainability, federation proofs, and ship GA.

### Epics & Key Stories
1. **Graph‑XAI Layer v1**
   - Counterfactuals, saliency on anomalies/ER; fairness/robustness views; model cards.
   - Acceptance: ROC‑AUC ≥ 0.8 on validation; XAI ties back to nodes/edges; red‑team baselines archived.
2. **Zero‑Copy Federation Stubs**
   - ZK deconfliction (hashed selectors); push‑down predicates returning claims + proofs; liaison escrow space.
   - Acceptance: demo shows true/false overlap with zero leakage; revocation wipes derivatives.
3. **Selective Disclosure Wallets (Partner/Court/Press)**
   - Audience filters; revocation timers; external validator.
   - Acceptance: tamper detection on modified bundles; revocation propagates on next open.
4. **GA Hardening**
   - Full STRIDE pass; dependency scanning; permission fuzzing; soak tests; accessibility AAA; documentation freeze.

### QA/Perf/Obs
- Security: zero criticals; performance soak 48h; accessibility audit; incident runbooks updated.

### Deliverables
- Graph‑XAI v1; ZK federation stubs; Disclosure wallets; GA hardening; final demo & release notes.

---

## Backlog of Helpful Extras (parallel / stretch)
- **Analyst Mastery Tracks**: labs, replayable scenarios; certification tied to time‑to‑insight.
- **Adversarial ML Red‑Team Toolkit**: prompt‑injection & poisoning suites with dashboards.
- **“Explain This Decision”**: paragraph‑level evidence graph in briefs.
- **“What Changed?” Diff Everywhere**: entity/claim/view diffs with risk deltas + subscriptions.
- **Energy‑Aware Scheduling**: batch analytics aligned to low‑cost windows; carbon budget per tenant.

## Metrics & Dashboards
- Product: time‑to‑first‑insight, time‑to‑COA compare, citation completeness, dissent capture rate.
- Ops: p95 latency, error budgets, cost per insight, storage tiering %, cache hit %, chaos MTTR.
- Compliance: policy hit rate, blocked ops, PoP/PNC reports, revocation SLA.

## Test Matrix (by layer)
- **Connectors**: contract tests (golden IO); rate‑limit simulators; schema drift alarms.
- **Graph**: Cypher unit tests; snapshot‑at‑time correctness; geo‑temporal detectors (precision/recall).
- **AI**: unit + eval benches; robustness (adversarial); fairness smoke; model cards generated.
- **UI**: Playwright flows; accessibility; screenshot diffs; error states.
- **Security**: authz depth, query recursion guards, permission fuzz; OPA policy simulation.
- **Resilience**: chaos (pod/broker kill), failover, offline CRDT merges.

## Demo Plan (per sprint)
- S1: Policy denial → human‑readable reason → appeal path; provenance manifest verify.
- S2: NL prompt → Cypher preview → tri‑pane exploration; community detection with XAI.
- S3: Runbook (Disinfo Mapping) from ingest to brief; cost guard savings; offline sync.
- S4: Federation proof (ZK overlap), selective wallet to “press”; XAI counterfactuals; GA checklist.

## Release Checklist
- ✅ All acceptance criteria met; ✅ SLO dashboards green; ✅ Docs complete; ✅ Security scan zero criticals; ✅ Provenance verifier shipped; ✅ Partner demo recorded; ✅ Ombuds sign‑off.

