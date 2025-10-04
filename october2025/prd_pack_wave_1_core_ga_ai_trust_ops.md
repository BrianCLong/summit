# Product Requirements Document (PRD) Pack — Wave 1
Scope: Full, production‑grade PRDs for the highest‑leverage epics targeted for Core GA and Trust Fabric foundations.

Included PRDs (12):
1) IG‑CORE‑B4 — Provenance & Claim Ledger (Service)
2) IG‑AI‑D2 — Evidence‑First GraphRAG (Copilot)
3) IG‑ING‑A1 — Connectors Catalog & SDK
4) IG‑GOV‑F1 — ABAC/RBAC & OPA Policy Engine
5) IG‑ANL‑C3 — Anomaly & Risk Scoring + XAI Pane
6) IG‑COL‑E1 — Case Spaces & Four‑Eyes Workflow
7) IG‑OPS‑H1 — SLOs, Telemetry & Observability
8) IG‑UX‑I1 — Tri‑Pane Investigation UI (Timeline/Map/Graph)
9) IG‑INT‑G2 — SIEM/XDR Bridges (Splunk, Elastic, Chronicle, Sentinel)
10) IG‑TRUST‑J1 — Proof‑Carrying Queries (PCQ) & Attestation Verifier
11) IG‑TRUST‑J2 — Zero‑Knowledge Trust Exchange (ZK Deconfliction)
12) IG‑ANL‑C5 — Course‑of‑Action (COA) Planner & What‑If Simulation

> Each PRD follows the same structure: Summary, Problem, Users & Jobs, Requirements (Must/Should/Could), Non‑Functional Requirements, UX Notes, Architecture & APIs, Telemetry, Security & Compliance, Success Metrics, Rollout & Risks.

---
## 1) PRD — IG‑CORE‑B4 Provenance & Claim Ledger (Service)
**Summary**: Immutable, verifiable provenance for every claim, transformation, and export. Exposes write‑once commit logs, manifests, and external verification API. KPI: 100% published outputs carry verifiable manifests; external verifier pass‑rate ≥99.9%.

**Problem**: Analysts and auditors need end‑to‑end evidence chains; courts and partners demand exportable proofs of origin, transformation, and policy compliance.

**Users & Jobs**:
- Analysts: publish briefs with citations and transformation steps.
- Auditors/Ombuds: verify no unauthorized access/transforms occurred.
- Partners/External Orgs: validate incoming disclosures without raw data.

**Requirements**
- **Must**:
  - WORM commit log of claims, transforms, and policy checks with cryptographic hashes (SHA‑2/3) and content‑addressed storage.
  - Manifest generator on export (includes source hashes, transforms, versions, tool configs, model IDs, policy decisions, timestamps, signer).
  - External **Verifier API**: `POST /verify {manifest, payload}` → proof receipt + discrepancy report.
  - Diff & replay: reproduce derived output deterministically within tolerance (seeding for ML).
  - Selective redaction records with stable redaction IDs and reversible (authorized) rehydration trail.
  - Multi‑tenant isolation; per‑case compartments; scoped keys; hardware‑backed signing.
- **Should**:
  - UI overlay for “Provenance Drawer” with inline steps and hashes.
  - Background compactor and proof index for fast verification.
- **Could**:
  - Cross‑org federated proof exchange using light proofs for attestation pinning.

**NFRs**: p99 verify < 800ms for 2MB manifest; 99.95% SLO; storage overhead < 15%; tamper‑evident; FIPS‑compliant crypto; regional data residency.

**Architecture & APIs**
- Services: `prov-ledger`, `manifestor`, `verifier`, `signing‑svc`, `key‑vault`. Event bus ingestion from ETL/AI/Export.
- API (excerpt):
  - `POST /claims` {subjectId, claimType, evidenceRefs[], policyEval, hash, actor}
  - `POST /manifests` {exportId, artifactRefs[], transformChain[], modelCard, policyDecisions[]}
  - `POST /verify` {manifest, payload?}
  - `GET /claims/{id}`; `GET /manifests/{id}`; `GET /proofs/{hash}`

**Telemetry**: claim/write/verify latency; manifest coverage; verification failure taxonomy; signer health.

**Security & Compliance**: hardware signing (KMS/HSM), SCITT‑style transparency log, least‑privilege tokens, ABAC scopes, audit of reason‑for‑access.

**Success Metrics**: Coverage 100%; external verify pass ≥99.9%; mean reproduce delta ≤1%; auditor satisfaction ≥90%.

**Rollout & Risks**: Beta behind feature flag; shadow manifests; verify‑only mode; risks—hash drift, clock skew, cost growth; mitigations—canonicalization library, time authority, compaction.

---
## 2) PRD — IG‑AI‑D2 Evidence‑First GraphRAG (Copilot)
**Summary**: Copilot answers are constructed from graph evidence first (citations inline), with NL→Cypher preview and sandbox execution. KPI: ≥95% of answers include ≥2 citations; analyst trust (CSAT) ≥4.6/5.

**Problem**: Hallucinations erode trust; analysts need auditable, scoped reasoning grounded in graph entities/claims.

**Users & Jobs**: Analysts ask questions in NL; get Cypher preview; run in sandbox; compile narrative with citations.

**Requirements**
- **Must**: NL→Cypher translator with schema awareness; evidence collector that materializes snippets + entity cards; inline citation rendering; policy‑aware scope; prompt logs + red‑team logbook; explanation panel of retrieval path.
- **Should**: Query memory for session context; re‑ranking by provenance quality; debias via diversity sampling.
- **Could**: Multi‑hop reasoning traces signed by Prov‑Ledger.

**NFRs**: p95 response < 2.5s (warm); sandbox quota; 99.9% block on policy violations with actionable reason.

**Architecture & APIs**: `copilot-gateway`, `nl2cypher`, `retriever`, `citation‑renderer`, `policy‑guard`, `trace‑store`. API: `POST /ask {question, scope, mode}` → {cypherPreview, citations[], answerDraft}.

**Telemetry**: citation count/quality; preview accept rate; block reasons; trust score.

**Security & Compliance**: prompt redaction of secrets; purpose limitation tags; model card register; runbook for adversarial prompts.

**Success**: CSAT≥4.6; ≥95% answers cited; policy‑block precision≥0.98/recall≥0.98.

**Rollout**: dogfood → power users → GA; kill‑switch; human‑in‑the‑loop on risky intents.

---
## 3) PRD — IG‑ING‑A1 Connectors Catalog & SDK
**Summary**: Catalog of production‑grade source connectors with an SDK, conformance tests, golden IO fixtures.

**Problem**: Data fragmentation blocks time‑to‑insight; connectors must be reliable, rate‑limited, schema‑mapped, and licensed.

**Users & Jobs**: Data engineers enable feeds; analysts depend on fresh, clean data; GRC enforces licenses.

**Requirements**
- **Must**: Connector SDK (pull/push/stream); mapping/transform manifests; rate limiters; retries w/ backoff; health probes; PII classifier; license registry hooks; sample datasets; e2e tests per connector; golden IO fixtures; poisoning/quality sentinel.
- **Should**: UI wizard for mapping; templates per vertical (CTI, DFIR, AML, OSINT, comms).
- **Could**: Marketplace packaging.

**NFRs**: MTTR<1h via playbooks; data loss <0.01%; idempotent ingest; perf targets per source.

**Architecture & APIs**: `connector‑runner`, `schema‑mapper`, `health‑svc`, `license‑svc` hooks. API: `POST /connectors/{type}/jobs`; `GET /runs/{id}`; `POST /mappings`.

**Telemetry**: lag, throughput, error taxonomies, poisoning alerts.

**Security & Compliance**: secret vault; scoped tokens; DPIA per source; license enforcement at read/export.

**Success**: ≥10 GA connectors; ingest ≤5m for 10k docs; defect escape rate <0.5%.

**Rollout**: staged by tier; shadow runs; backfill jobs; throttled cutover.

---
## 4) PRD — IG‑GOV‑F1 ABAC/RBAC & OPA Policy Engine
**Summary**: Unified authZ with attribute‑based access control, OPA policies, SCIM/SSO, and reason‑for‑access logging.

**Problem**: Sensitive data requires compartmentation and explainable authorization.

**Requirements**
- **Must**: ABAC model (subject, object, action, context); policy packs; reason‑for‑access prompts; OPA sidecar enforcement; policy simulation; SCIM provisioning; audit trail; emergency break‑glass with dual control.
- **Should**: Policy change PR review with simulation diff; deny‑reason UX.
- **Could**: Policy templates per regulation.

**NFRs**: p99 policy eval<5ms; 99.99% availability; eventual consistency <1s.

**APIs**: `POST /authz/eval`; `POST /policy/simulate`; `GET /audit/decisions`.

**Metrics**: deny accuracy; false‑allow/deny; time‑to‑revoke; simulation coverage.

---
## 5) PRD — IG‑ANL‑C3 Anomaly & Risk Scoring + XAI Pane
**Summary**: Graph/time anomalies with interpretable features; risk ledger per entity/case.

**Requirements**
- **Must**: feature store; detectors (degree/temporal/journey/semantic); per‑detector reason codes; XAI pane (feature attributions, counterfactuals); feedback loops; policy‑aware thresholds.
- **NFRs**: drift monitors; p95 scoring < 300ms per entity.

**APIs**: `POST /score {entity, context}`; `GET /explain/{id}`.

**Success**: Precision≥0.8/Recall≥0.8 on benchmark; alert fatigue ↓30%.

---
## 6) PRD — IG‑COL‑E1 Case Spaces & Four‑Eyes Workflow
**Summary**: Dedicated case spaces with SLA, dual‑control approvals, immutable audit, legal hold.

**Requirements**
- Must: case creation; membership & roles; four‑eyes for sensitive ops; SLA timers; audit immutability; legal hold; disclosure packager.
- NFRs: p99 action <400ms; 99.95%.

**APIs**: `POST /cases`; `POST /cases/{id}/approve`; `POST /disclosures`.

**Success**: unauthorized sensitive ops → 0; SLA breach <1%.

---
## 7) PRD — IG‑OPS‑H1 SLOs, Telemetry & Observability
**Summary**: OTEL traces, Prom metrics, structured logs, SLO dashboards, saturation heatmaps.

**Requirements**
- Must: golden signals per service; error budget policy; slow‑query killer; budgeted queries; chaos drills.
- NFRs: agent overhead <3%; dashboard TTFI <2s.

**APIs**: `GET /slo`; `POST /budget/policy`.

**Success**: 0 Sev‑1 from chaos; error budget adherence ≥95%.

---
## 8) PRD — IG‑UX‑I1 Tri‑Pane Investigation UI
**Summary**: Synchronized Timeline/Map/Graph with brushing/selection, pinboards, saved views, explain overlays.

**Requirements**
- Must: linked brushing; path highlight; time slicing; cluster/centrality views; explain‑this‑view; a11y AAA; command palette; diff/undo/redo.
- NFRs: p95 graph interaction <100ms; keyboard coverage ≥95% tasks.

**Success**: task time ↓30%; SUS ≥80.

---
## 9) PRD — IG‑INT‑G2 SIEM/XDR Bridges
**Summary**: First‑class bridges for Splunk, Elastic, Chronicle, Sentinel; alert intake, case sync, actions back.

**Requirements**
- Must: connectors, mapping, dedupe; case/alert bi‑sync; response actions; playbooks; rate‑limiters; health dashboards; conformance tests per vendor.
- NFRs: round‑trip <15s; data loss <0.01%.

**Success**: mean triage time ↓25%; sync failures <0.1%.

---
## 10) PRD — IG‑TRUST‑J1 Proof‑Carrying Queries (PCQ)
**Summary**: Each analytic result carries a machine‑checkable proof of inputs, transforms, and policy conformance.

**Requirements**
- Must: proof generator plug‑ins per operator; verifier library; receipt store; replay harness; tolerance bounds.
- NFRs: proof size overhead <20%; verify p95 <1s.

**APIs**: `POST /pcq/run`; `POST /pcq/verify`.

**Success**: Repro coverage ≥95%; verifier pass ≥99%.

---
## 11) PRD — IG‑TRUST‑J2 Zero‑Knowledge Trust Exchange
**Summary**: Cross‑org deconfliction and overlap checks using zero‑knowledge proofs; no raw data movement.

**Requirements**
- Must: overlap/no‑overlap proofs; policy‑sealed computation; selective disclosure; audit receipts; rate‑limited sessions; key exchange.
- NFRs: leakage 0 by design; session p95 < 3s.

**APIs**: `POST /zk/handshake`; `POST /zk/proof`; `POST /zk/verify`.

**Success**: partner acceptance ≥3 orgs; no leakage incidents.

---
## 12) PRD — IG‑ANL‑C5 COA Planner & What‑If Simulation
**Summary**: Hypothesis workbench to model courses of action; simulate impacts and risks; produce decision brief.

**Requirements**
- Must: scenario modeler; parameter sets; stochastic simulation; risk envelope; sensitivity analysis; narrative export; provenance of assumptions.
- NFRs: 10k runs < 60s; deterministic seeds.

**APIs**: `POST /coa/simulate`; `GET /coa/{id}`.

**Success**: decision latency ↓25%; prediction error bands documented; CSAT ≥4.5.

---
### Global Sections (applies to all above)
**Security & Compliance**: SCIM/SSO; ABAC/OPA integration; DPIA where PII; encryption in transit/at rest; purpose limitation; export manifests; legal hold.

**Telemetry & Analytics**: event taxonomies for create/update/delete, view, block, verify, export; funnel analytics; task‑time instrumentation.

**Rollout Strategy**: feature flags per epic; shadow/parallel runs; migration playbooks; training and enablement.

**Risks & Mitigations**: cost spikes → archived tiers + budget guards; policy drift → simulation + PR gating; model misuse → guardrails + red‑team; federation leakage → ZK proofs + audits.

