# Capability Maturity Model (CMM) + Jira Epics

**Scope:** Build platform + data/compute fabric for Evidence‑First RAG → GraphRAG → DAG runbooks → Multimodal v1  
**Owner:** Elara Voss  
**Date:** 22 Sep 2025

---

# Part A — Capability Maturity Model (L1→L5)

Legend: **DoP** = Definition of Perfect proof; **SLO** = service‑level objective

## 1) Trust, Safety & Governance

| Level  | Capability                                             | DoP Proofs                                                       |
| ------ | ------------------------------------------------------ | ---------------------------------------------------------------- |
| **L1** | Basic citations; manual redaction                      | Export shows source URLs; redaction done in docs only            |
| **L2** | Source manifest; redaction applied at ingest           | Each answer links to manifest; embeddings exclude redacted spans |
| **L3** | Lineage graph (ingest→transform→answer); policy engine | Click answer → lineage view; PII policy blocks export            |
| **L4** | Model/prompt approvals; safety evals in CI/CD          | Deploys require passing eval scorecards; audit log for overrides |
| **L5** | Continuous monitoring for bias/drift; auto‑rollback    | Drift breach triggers shadow route + rollback within 1 click     |

## 2) Observability, SLOs & FinOps

| Level  | Capability                              | DoP Proofs                                            |
| ------ | --------------------------------------- | ----------------------------------------------------- |
| **L1** | Basic logs/metrics                      | Per‑service logs and CPU/RAM                          |
| **L2** | Tracing from UI → retriever → model     | Single trace ID follows a question end‑to‑end         |
| **L3** | SLOs (latency, error); budgets          | Route has SLOs; weekly cost per route                 |
| **L4** | Circuit breakers + graceful degradation | Load test trips breaker; fallback retriever holds SLO |
| **L5** | Cost‑aware routing + auto‑tuning        | Router shifts to cheapest config maintaining quality  |

## 3) Security & Access

| Level  | Capability                           | DoP Proofs                                        |
| ------ | ------------------------------------ | ------------------------------------------------- |
| **L1** | RBAC at app level                    | Roles gate feature access                         |
| **L2** | Case‑scoped isolation; SCIM          | User offboard propagation <15m                    |
| **L3** | Graph‑scoped ABAC (entity/edge/time) | Query returns only permitted subgraph             |
| **L4** | KMS‑backed secrets + rotation        | Rotation event doesn’t break lineage verification |
| **L5** | Continuous least‑privilege reviews   | Quarterly access diffs auto‑generated + applied   |

## 4) Data Contracts & Fabric

| Level  | Capability                            | DoP Proofs                           |
| ------ | ------------------------------------- | ------------------------------------ |
| **L1** | Ad‑hoc schemas; batch ingest          | Manual fixes                         |
| **L2** | Schema registry; contract tests       | Breaking changes blocked in CI       |
| **L3** | CDC hooks; quality SLAs               | Freshness dashboards per source      |
| **L4** | First‑class entity resolution service | ER decisions explainable + versioned |
| **L5** | Temporal/geo semantics everywhere     | As‑of queries return correct state   |

## 5) Retrieval & Reasoning Quality

| Level  | Capability                                  | DoP Proofs                              |
| ------ | ------------------------------------------- | --------------------------------------- |
| **L1** | Dense retrieval only                        | BM25 absent                             |
| **L2** | Hybrid (BM25+dense); re‑ranker              | NDCG lift ≥10% vs dense                 |
| **L3** | GraphRAG w/ path extraction                 | Answers show paths used                 |
| **L4** | Learned router (query intent→retriever mix) | Hard factual queries routed to GraphRAG |
| **L5** | Continuous eval lab + shadow routing        | Regressions blocked; online A/B steady  |

## 6) DAG Orchestration & Reproducibility

| Level  | Capability                               | DoP Proofs                                 |
| ------ | ---------------------------------------- | ------------------------------------------ |
| **L1** | Scripts with manual steps                | No re‑run guarantees                       |
| **L2** | DAG engine; retries                      | Step statuses visible                      |
| **L3** | Content‑addressed artifacts; idempotency | Re‑run = byte‑identical outputs            |
| **L4** | Policy‑as‑code gates                     | PII or geo policy halts run w/ remediation |
| **L5** | Step‑level caching & human‑in‑loop       | Cache hit‑rate >60% on repeat runs         |

## 7) Performance & Resilience

| Level  | Capability                      | DoP Proofs                           |
| ------ | ------------------------------- | ------------------------------------ |
| **L1** | Best‑effort latency             | Spiky P95                            |
| **L2** | Hot/cold tiering; pre‑chunks    | Stable P95 for top 5 queries         |
| **L3** | Backpressure; token/cost guards | No brownouts under ingest spikes     |
| **L4** | Chaos drills; DR plan           | RTO/RPO met in game‑day              |
| **L5** | Multi‑region active‑active      | Region failover transparent to users |

## 8) Developer Experience

| Level  | Capability                     | DoP Proofs                 |
| ------ | ------------------------------ | -------------------------- |
| **L1** | Manual setups                  | Onboarding >1 day          |
| **L2** | CLI scaffolds + templates      | New retriever to dev <1h   |
| **L3** | Ephemeral preview envs         | PR spins preview in <5m    |
| **L4** | Deterministic local stacks     | Parity failures <5%        |
| **L5** | Golden paths + paved‑road docs | 80% use paved path to prod |

## 9) Analyst & Reviewer UX

| Level  | Capability                              | DoP Proofs                              |
| ------ | --------------------------------------- | --------------------------------------- |
| **L1** | Basic answer panel                      | No synchronized views                   |
| **L2** | Tri‑pane (timeline/map/graph)           | Cross‑highlight works                   |
| **L3** | Citation drilldowns + path viz          | Reviewer can expand a path node         |
| **L4** | “Challenge this step” with re‑route     | Reviewer rejection triggers auto re‑run |
| **L5** | Playbooks & saved briefs as first‑class | Team‑wide reuse metrics tracked         |

---

# Part B — Jira Epic Set (with Stories & AC)

Timeframe assumes 8–10 weeks rolling; t‑shirt sizing (S=≤3d, M=≤1w, L=≤2w).

## Epic A — Evidence‑First RAG & Provenance

**Goal:** Return cited answers with exportable provenance manifest.

- **Stories**
  1. **RAG indexer with redaction‑aware chunking (L)**  
     **AC:** Redacted spans absent from embeddings/caches; unit tests cover leakage.
  2. **Inline citations + snippet previews (M)**  
     **AC:** Top answer shows ≥1 citation; click reveals highlighted spans.
  3. **Provenance manifest on export (M)**  
     **AC:** JSON manifest lists source IDs, timestamps, transforms, model/prompt versions.
  4. **Eval suite: factuality & retrieval hit‑rate (M)**  
     **AC:** Baseline NDCG tracked; failure ≤5% allowed per release.
- **Exit:** P95 TTFA ≤5s on reference corpus; 100% answers carry ≥1 citation.

## Epic B — GraphRAG & NL→Cypher Bridge

**Goal:** Explainable graph answers with path rationales.

- **Stories**
  1. **NL→Cypher preview UI (M)**  
     **AC:** Users can edit/approve Cypher before run; logs persist query.
  2. **Subgraph scoping by time/geo (M)**  
     **AC:** As‑of + geo bounds reduce result set deterministically.
  3. **Path extraction + display (M)**  
     **AC:** Answer panel lists entities/edges/time intervals used.
  4. **Router: when to use GraphRAG (S)**  
     **AC:** Rule picks GraphRAG for entity‑relation questions; A/B >10% precision lift.
- **Exit:** 95% of graph answers display at least one explicit path.

## Epic C — Policy & Safety Gates

**Goal:** Deploys and answers adhere to safety, PII, and export rules.

- **Stories**
  1. **PII policy engine + redaction propagation (M)**  
     **AC:** Policy denies export with PII; embeddings/caches verified clean.
  2. **Model/prompt approval workflow (S)**  
     **AC:** Production routing only for approved versions with scorecards.
  3. **Jailbreak/unsafe content detectors (S)**  
     **AC:** Block/flag rate meets threshold; logs include decision reason.
- **Exit:** All routes protected; audit trail available for any denial.

## Epic D — Observability, SLOs & Circuit Breakers

**Goal:** Traceability + resilience under load.

- **Stories**
  1. **End‑to‑end tracing (M)**  
     **AC:** One trace ID connects UI → retriever → model → storage.
  2. **SLO budgets per route (S)**  
     **AC:** Latency, error, and cost budgets configurable; dashboards live.
  3. **Circuit breakers + graceful fallback (M)**  
     **AC:** Synthetic load trips breaker; fallback maintains SLO.
- **Exit:** 0 Sev‑1 incidents during load test week; SLO dashboards green.

## Epic E — FinOps & Unit Economics

**Goal:** Visibility and control of cost per question/runbook.

- **Stories**
  1. **Per‑request cost attribution (S)**  
     **AC:** Token/model/time costs tagged; top 10 expensive queries visible.
  2. **Budgets + alerts (S)**  
     **AC:** Team exceeds budget → alert + recommended cheaper route.
  3. **Cost‑aware router (M)**  
     **AC:** Router keeps quality metric while reducing spend ≥15%.
- **Exit:** Monthly cost variance within ±10% of budget.

## Epic F — Data Contracts & ER Service

**Goal:** Stable schemas; explainable entity resolution.

- **Stories**
  1. **Schema registry + CI contract tests (M)**  
     **AC:** Breaking change PRs blocked with diff + owner ping.
  2. **CDC ingest hooks (S)**  
     **AC:** Freshness SLAs visualized; lag alerts emitted.
  3. **Entity Resolution v1 (L)**  
     **AC:** Deterministic + probabilistic rules; review UI; versioned decisions.
- **Exit:** ER precision/recall baselined; schema breakages at zero in prod.

## Epic G — DAG Orchestration & Repro

**Goal:** Idempotent runbooks with artifact caching.

- **Stories**
  1. **Content‑addressed artifact store (M)**  
     **AC:** Artifact hash reproducible; re‑run yields identical outputs.
  2. **Policy‑as‑code step gates (S)**  
     **AC:** Violation halts run; remediation checklist posted.
  3. **Step‑level caching + retry w/ backoff (M)**  
     **AC:** Cache hit‑rate reported; transient errors auto‑recovered.
- **Exit:** ≥60% cache hit on repeat runs; MTTR <15m.

## Epic H — Performance, Chaos & DR

**Goal:** Predictable latency; survivability under failures.

- **Stories**
  1. **Hot/cold tiering + precompute popular sets (M)**  
     **AC:** P95 TTFA for top 5 queries ≤ target during ingest spikes.
  2. **Chaos drills (S)**  
     **AC:** Shard loss and model outage tests pass; SLOs respected.
  3. **DR runbook + cross‑region failover (L)**  
     **AC:** RTO≤1h, RPO≤15m validated in game‑day.
- **Exit:** Game‑day report signed off by SRE + PM.

## Epic I — Developer Experience (Paved Road)

**Goal:** Fast, reliable delivery using golden paths.

- **Stories**
  1. **CLI scaffold for retriever/runbook/graph patch (S)**  
     **AC:** New service to dev in <1h with tests.
  2. **Ephemeral PR preview env (M)**  
     **AC:** Spins in <5m; runs acceptance suite.
  3. **Deterministic local stack (S)**  
     **AC:** Parity failures <5% across last 50 PRs.
- **Exit:** Median idea→prod ≤1 day on paved road.

## Epic J — Analyst & Reviewer UX

**Goal:** Tri‑pane UX with explainability and challenge flow.

- **Stories**
  1. **Synchronized timeline↔map↔graph (M)**  
     **AC:** Hover/select syncs across panes.
  2. **Path visualizer + citation drilldown (S)**  
     **AC:** Path nodes expandable; citations jump to snippet.
  3. **“Challenge this step” (M)**  
     **AC:** Reviewer rejection triggers auto re‑route or task to owner.
- **Exit:** Reviewer time‑to‑approve down ≥30%.

---

# Backlog Cutline & Sequencing

1. Epics A, B, D (RAG, GraphRAG, Observability) — **now**
2. Epics C, F, G (Policy, Data contracts/ER, DAG repro) — **next**
3. Epics E, H, I, J (FinOps, Resilience, DX, UX polish) — **then**

**Notes:** T‑shirt sizes are planning placeholders; replace with story‑pointing in team grooming. Add your infra/tooling specifics (vector store, graph DB, OCR/STT providers) in each epic’s Description before kickoff.
