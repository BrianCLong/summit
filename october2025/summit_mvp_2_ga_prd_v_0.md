# Summit — MVP‑2 & GA PRD (v0.1)

_Owner:_ Elara Voss (Product & Program)
_Date:_ 2025‑09‑30
_Status:_ Draft for review

---

## 1) Executive Summary

**Vision.** Summit evolves into a secure, multi‑tenant **intelligence graph platform** with first‑class **provenance**, **compartmentation**, **explainable AI**, and **oversight by design**. MVP‑2 cements the core ingestion→graph→analysis→brief pipeline with auditable autonomy; GA delivers verifiable trust exchange and predictive/COA capabilities with machine‑verifiable provenance across tenants.

**MVP‑2 (Target: T+90 days)**

- Ship a shippable “golden path”: _Ingest → Resolve → Analyze → Report → Export (with provenance)_.
- Deliver tri‑pane Analyst Workbench (Graph + Timeline + Map) with synchronized brushing.
- NL→Cypher query preview + sandboxed execution; RAG with inline citations.
- Provenance & Claim Ledger backbone; Exporter w/ signed manifests.
- Case Spaces w/ 4‑eyes controls; Audit & Policy Guard (deny w/ reason).
- Baseline connectors (CSV/Parquet, HTTP, S3/GCS/Azure Blob, STIX/TAXII, MISP).

**GA (Target: T+9 months)**

- Zero‑copy federation with **proof‑carrying analytics** (PCQ) and ZK deconfliction.
- Strategic suite (COA planner, what‑if sims, pattern miner, anomaly/risk scoring) with XAI overlays.
- Portable provenance wallets; License/Authority compiler; disclosure packager.
- Offline/edge kits with CRDT sync; Admin Studio; cost guard; SLOs.

**Success**

- MVP‑2: 10 design partners use golden flow weekly; p95 < 1.5s for typical graph query; E2E ingest→report ≤ 5m for 10k docs.
- GA: ≥3 federated partners using ZK‑TX; 30% reduction in time‑to‑COA vs. baseline; external manifest verifier passes.

---

## 2) Current State & Gap Analysis

> Based on the public repo modules and internal docs, current scaffolding suggests services for: `graph‑xai`, `prov‑ledger`, `server/ai/*`, `apps/web`, `ingestion/` (connectors/ETL), `helm/terraform`, and `docs/project_management`. Core UX concepts (tri‑pane, command palette) are defined. Gaps concentrate in provenance hardening, authority/licensing compiler, federation/ZK, and acceptance‑grade connectors.

**Assets in place**

- Core entity model and graph service; ER stubs; time/geo facets.
- Web app scaffold with graph canvas; timeline/map partials.
- AI engines: OCR/STT skeletons; NL→query pipeline; RAG surface.
- Prov/claim ledger service boundary; manifest format drafts.
- Helm/Terraform charts; basic OTEL hooks.

**Primary gaps**

- End‑to‑end **provenance enforcement** (manifest signing/verification, export gates).
- **Authority/License Compiler** to bind queries to policy at runtime.
- **Connector QA** (golden IO tests, rate limiting, sample datasets).
- **XAI overlays** wired to each analytic: path rationales, counterfactuals.
- **Case workflow** (4‑eyes, watchlists, SLA timers) + disclosure packager.
- **Federation** (ZK deconfliction, proof‑carrying aggregates), **cost guard**, **Admin Studio**.

---

## 3) Product Goals & OKRs

**Company Goal:** Win analyst mindshare with an auditable, analyst‑centric INT graph that’s deployable‑first.

**MVP‑2 OKRs (Quarter)**

- _O1:_ Golden Path Adoption — **KR1:** 10 weekly active analysts complete “seed→graph→brief” flows; **KR2:** Avg. 2.5 mins to first graph insight from seed.
- _O2:_ Trust by Design — **KR1:** 100% briefs ship with verifiable manifests; **KR2:** 0 uncited claims in published outputs.
- _O3:_ Operability — **KR1:** p95 graph query < 1.5s (N≤3 hops); **KR2:** E2E ingest (10k docs) < 5m; **KR3:** Error budget ≥ 99.5% SLI.

**GA OKRs (Year)**

- _O4:_ Federated Value — **KR1:** 3 partners live on ZK‑TX; **KR2:** 25% cross‑org deconfliction time reduction.
- _O5:_ Analyst Throughput — **KR1:** 30% faster COA comparison; **KR2:** 20% cost per insight reduction via cost guard.

---

## 4) Users & Use Cases

**Primary Personas**: Intelligence Analyst, CTI/DFIR Operator, Ombuds/Compliance, Liaison Partner, Admin/Platform Ops.

**Top Jobs‑to‑be‑Done (MVP‑2)**

1. _Load & Map Data Fast_: map CSV/JSON to canonical model with PII flags in ≤10m.
2. _Graph & Pivot_: resolve entities, explore links over time/space, save views.
3. _Ask in Natural Language_: NL prompt → generated Cypher preview; sandbox run with limits and diff vs. manual.
4. _Explain & Cite_: build briefs with inline citations, provenance manifests, and dissent annexes.
5. _Control & Audit_: 4‑eyes export, who/what/why/when trails; block unauthorized exports.

**GA Additions**

- Zero‑copy checks (watchlist overlap, sanction exposure) via ZK proofs.
- COA planner with DAG dependencies, Monte Carlo what‑ifs, sensitivity bars.
- Portable evidence wallets; revocation and purpose clocks.

---

## 5) Scope & Prioritization (MoSCoW)

### MVP‑2 — Must

- **Connector pack v1**: CSV/Parquet, HTTP, S3/GCS/Azure Blob, STIX/TAXII, MISP.
- **Ingest Wizard**: schema mapper + AI suggestions; PII classifier; DPIA checklist; redaction presets.
- **Graph Core**: entity/rel ontology; temporal/bitemporal truth; geo basics; policy labels.
- **Entity Resolution**: deterministic + probabilistic; manual reconcile queue.
- **Analyst Workbench**: tri‑pane (graph/timeline/map), pinboards, saved views, command palette.
- **NL→Query + GraphRAG**: preview, cost/row estimates, sandbox; citations.
- **Provenance & Claim Ledger**: lineage on nodes/edges; **export manifest signer**; verifiable bundles.
- **Case Spaces**: tasks/roles, 4‑eyes export, watchlists, immutable comments.
- **Audit & Policy Guard**: reason‑for‑access prompts; license/authority checks (phase‑1).
- **Ops**: OTEL traces, Prom metrics; SLO dashboards; Helm/Terraform deploy; feature flags.

### MVP‑2 — Should/Could

- Pattern miner (seeded templates: co‑presence, burst/lull).
- Anomaly/risk scoring v0 (degree, egonet, spikes) with explainability pane.
- Disclosure packager (PDF/HTML with redactions) v0.

### GA — Must

- **Proof‑Carrying Analytics (PCQ) & external verifier**.
- **Zero‑Knowledge Trust Exchange (ZK‑TX)** for deconfliction/overlaps.
- **License/Authority Compiler** (static+dynamic) with dry‑run simulator.
- **COA Planner & What‑If** (Monte Carlo; contagion; sensitivity sliders) with decision logs + dissent capture.
- **Portable Provenance Wallets** (selective disclosure, revocation timers).
- **Edge/Offline kits** with CRDT sync and proof‑carrying sync logs.
- **Admin Studio & Cost Guard**; **Chaos/DR** runbooks; cross‑region replicas.

### GA — Should/Could

- Narrative heat & causal tester; adversarial ML red‑team; energy‑aware scheduling; unit‑cost governor.

---

## 6) Functional Requirements (selected)

### 6.1 Connectors & Ingest Wizard

- _FR‑C1_: Each connector ships _manifest + mapping_, **rate‑limit policy**, sample dataset, **golden IO tests**.
- _FR‑C2_: Wizard auto‑suggests field mappings; displays PII flags; blocks disallowed fields with human‑readable **license reasons**.
- _FR‑C3_: Streaming ETL w/ enrichers: GeoIP, language, hash/perceptual hash, EXIF scrub, OCR; **telemetry sanity**.
- _Acceptance_: Map CSV→entities in ≤10 min; lineage recorded; blocked export shows license clause & override path.

### 6.2 Graph Core & ER

- _FR‑G1_: Ontology: Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, Infra, FinancialInstrument, Indicator, Claim, Case.
- _FR‑G2_: Bitemporal edges (validFrom/validTo + observedAt/recordedAt); snapshot‑at‑time queries.
- _FR‑G3_: ER: deterministic+probabilistic; explainable scorecards; reconcile queues.
- _Acceptance_: Time‑travel query returns consistent neighborhood; ER eval meets labeled tolerance.

### 6.3 Analyst Workbench

- _FR‑W1_: Tri‑pane with synchronized brushing; filters by time/space; pinboards; annotations; saved views; diff.
- _FR‑W2_: “Explain this view” overlays (path rationales, provenance tooltips, confidence opacity).
- _Acceptance_: Task time reductions (TTFI, path discovery) hit target; usability score ≥ 80 (SUS).

### 6.4 AI Copilot (Auditable)

- _FR‑A1_: NL prompt → generated Cypher/SQL **preview** + sandbox exec; diff vs. manual queries.
- _FR‑A2_: GraphRAG with inline **citations**; hypothesis generator; narrative builder with guarded language.
- _FR‑A3_: Guardrails: policy reasoner explains denials; model cards; prompt privacy; red‑team logs.
- _Acceptance_: ≥95% syntactic validity on test prompts; **zero uncited assertions** in published briefs.

### 6.5 Provenance, Export, & Disclosure

- _FR‑P1_: Every node/edge carries source→transform chain (hash, confidence, license).
- _FR‑P2_: Export produces **manifest** (hash tree, transform chain) verifiable by external tool; selective disclosure bundles.
- _FR‑P3_: Disclosure packager with redaction tools; legal hold; audience‑scoped evidence.

### 6.6 Federation & Authority (GA)

- _FR‑F1_: ZK set/range proofs for deconfliction & overlap checks; no raw PII leaves tenant.
- _FR‑F2_: License/Authority Compiler binds queries/exports to warrants, licenses, purpose tags; dry‑run simulator and diff.
- _FR‑F3_: Proof‑Carrying Analytics: signed lineage, model cards, hyperparameters; one‑click verifier.

---

## 7) Technical Requirements

### 7.1 Architecture

- **Services**: Ingestion (connectors, ETL), Graph Core, ER, Prov/Claim Ledger, AI Engines (OCR/STT/NL‑Query/RAG), Workbench API, Export/Disclosure, Policy Guard, Federation Gateway (ZK‑TX), Admin/Observability.
- **Data**: Neo4j/PG for graph/relational; Parquet/DuckDB for data science bridges; Object storage for bundles.
- **Interfaces**: GraphQL for UI; gRPC/HTTP between services; OTEL traces; Prom metrics.

### 7.2 API (representative)

- `POST /ingest/jobs` → create job (source, mapping, policyTags)
- `POST /graph/resolve` → ER task (records, hints) → candidate merges + scorecards
- `POST /ai/nl2cypher/preview` → {prompt} → {cypher, estRows, estCost}
- `POST /export/bundle` → {caseId, scope, audience} → {manifest, zip}
- `POST /federation/zk/deconflict` → {saltedSelectors} → {proof, overlap:true|false}
- `GET /provenance/{id}` → lineage DAG

### 7.3 Data Model (core)

- **Entities**: Person, Org, Asset, Account, Location, Event, Document, Communication, Device, Vehicle, FinancialInstrument, Indicator, Case, Claim, Authority, License.
- **Edges**: `RELATED_TO`, `LOCATED_AT`, `PART_OF`, `COMMUNICATED_WITH`, `TRANSFERS_TO`, `EVIDENCES`, `DERIVES_FROM`.
- **Policy Tags**: origin, sensitivity, clearance, legal basis, need‑to‑know, purpose limitation, retention class.

### 7.4 Non‑Functional

- **Performance**: p95 < 1.5s for typical graph queries; ingest 10k docs E2E < 5m; streaming > 5k ev/sec sustained.
- **Security**: Multi‑tenant isolation; ABAC/RBAC; OPA; OIDC SSO; WebAuthn; per‑tenant envelope encryption; field‑level crypto; audit trails.
- **Reliability**: SLOs; DR (RTO ≤1h, RPO ≤5m); chaos drills; offline kits; cross‑region replicas.
- **Privacy/Compliance**: Minimization at ingest; purpose limitation; warrant/authority binding; license/TOS engine; k‑anonymity/redaction tools.

---

## 8) UX Requirements

- Dark/light; keyboard‑first; A11y AAA.
- Command palette; “Explain this view”; confidence opacity; diff/undo/redo.
- Brief Studio: timeline/map/graph figures; caption assistant; one‑click PDF/HTML; inline citations; dissent annexes.

---

## 9) Analytics & Metrics

- **Tracking**: Golden path events; query latency heatmaps; provenance export counts; ZK‑TX runs; COA comparisons.
- **Dashboards**: Adoption, Performance, Trust/Compliance, Cost.
- **A/B**: NL→query vs. manual baselines; Workbench layout variants.

---

## 10) Validation & Testing

- Unit/contract tests for connectors & GraphQL schema; Cypher tests in ephemeral Neo4j.
- E2E: ingest→resolve→runbook→report; screenshot diffs.
- Load (k6), chaos, soak; security (authz, query depth, prompt injection, data poisoning).
- Acceptance packs with fixtures + golden outputs; external manifest verifier.

---

## 11) Program Plan & Milestones

**MVP‑2 (90 days)**

- _M1 (Week 2):_ Connector pack v1 + Ingest Wizard alpha; Prov/Claim Ledger MLP.
- _M2 (Week 5):_ Workbench beta (tri‑pane, NL→query preview); ER queue; Export manifest signing.
- _M3 (Week 8):_ Case Spaces (4‑eyes), Audit & Policy Guard v1; Brief Studio alpha.
- _M4 (Week 10):_ Performance hardening; SLO dashboards; Design partner trials.
- _M5 (Week 12):_ MVP‑2 release; acceptance pack pass.

**GA (9 months)**

- _G1:_ PCQ + external verifier; L/A Compiler; ZK‑TX deconfliction.
- _G2:_ COA Planner + What‑If; Pattern miner & anomaly scoring; Portable wallets.
- _G3:_ Edge kits + CRDT sync; Admin Studio; Cost guard; DR/Chaos playbooks.

---

## 12) Risks & Mitigations

- **ZK/PCQ complexity** → partner with crypto SMEs; phase using stubs & progressive proofs.
- **PII/licensing variance** → policy simulator + pluggable rules; conservative defaults.
- **Perf at scale** → query budgeter; cost guard; archived tiers; indexing strategies; backpressure.
- **Model misuse** → guardrails, reason‑for‑access prompts; red‑team lab; ombuds gates.

---

## 13) Open Questions (to resolve in parallel)

- Neo4j vs. alternative graph store split for hot/cold paths.
- AuthZ model granularity (field‑level vs. view‑level) for phase‑1.
- Exact set of GA simulators (epidemiological, supply chain, narrative).

---

## 14) Appendices

- **Runbooks (MVP‑2)**: Rapid Attribution; Phishing Cluster; Disinfo Mapping; Human‑rights Vetting; Supply‑chain Compromise Trace.
- **Runbooks (GA)**: ZK Deconfliction Sweep; COA comparison; Narrative Causality Tester; LCRO Revocation Drill; Offline Recon Sync.
- **Acceptance Matrices**: per‑feature criteria & fixtures.
