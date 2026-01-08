# Sprint 26: Information Environment Mapping (Detailed Plan)

**Dates:** Dec 1 - Dec 12, 2025
**Focus:** Information Environment Mapping
**Thin-Slice Capability:** End-to-end visualization of a media ecosystem graph with automated node importance scoring ("InfoMap" Service).

## Sprint Goal

Ship one **defensible, demoable** "thin-slice" capability end-to-end: **spec → reference impl (InfoMap) → eval → IP scaffold → integration stub**, with evidence (benchmarks) and a licensing/compliance trail.

---

## Workstream A — Product + Problem Framing (North Star)

**Objective:** Lock the single most valuable use-case + measurable KPIs for Analyst-driven Media Mapping.

**Backlog**

- A1. Define target user journey: "Analyst detects a new narrative and maps its propagation across 3 tiers of media nodes" (1 page).
- A2. Success metrics + SLOs:
  - **Latency:** Graph expansion query < 200ms (p95).
  - **Scale:** Ingest 10k nodes/minute.
  - **Quality:** >90% accuracy in node classification (Tier 1 vs Tier 3).
- A3. Dataset/traffic assumptions: Using "MIMIC-III for InfoWar" (synthetic dataset) + GDELT sample. Constraints: Strict GDPR compliance for PII in social nodes.

**Deliverables**

- `docs/sprints/sprint26/design/problem.md`
- `docs/sprints/sprint26/benchmark/kpis.md`

**DoD**

- Metrics are **numerical** and testable.
- One primary KPI (Expansion Latency) + 2–3 secondary KPIs.
- Constraints explicitly listed (Privacy/Cost).

---

## Workstream B — Novelty Hunt (SCOUT)

**Objective:** Identify 3–5 patentable "moat surfaces" in Dynamic Influence Mapping.

**Backlog**

- B1. Prior-art shortlist (10 items): Palantir Foundry, Graphika, Maltego - identify gaps in _real-time_ structural update detection.
- B2. Opportunity matrix: "Commodity" (Static Graph) vs "Ownable" (Predictive Structural Drift).
- B3. Pick **2 core inventive hypotheses**:
  1.  "Temporal Centrality Drift" as a leading indicator of coordinated behavior.
  2.  "Provenance-weighted PageRank" for credibility scoring.

**Deliverables**

- `docs/sprints/sprint26/ip/prior_art.csv`
- `docs/sprints/sprint26/design/novelty_matrix.md`

**DoD**

- Each hypothesis has: novelty claim, expected delta, evaluation plan, design-around notes.

---

## Workstream C — Architecture + Spec (ARCHITECT)

**Objective:** Produce an implementable spec for `InfoMap` Service.

**Backlog**

- C1. System diagram: `Ingestion Service` -> `Neo4j` -> `GraphAlgo Service` -> `Analyst UI`.
- C2. Formal method spec: Define `Node` (Media, Social, Forum) and `Edge` (Cites, Owns, Mentions) schema extensions.
- C3. Threat model: "Data Poisoning" (fake nodes injection) + "Graph Flooding" (DoS).

**Deliverables**

- `docs/sprints/sprint26/spec/method.md`
- `docs/sprints/sprint26/design/threat_model.md`
- `docs/sprints/sprint26/design/diagram.mmd`

**DoD**

- Interfaces defined (GraphQL Schema for `InfoMap`).
- Complexity estimates for centrality algorithms.

---

## Workstream D — Reference Implementation (EXPERIMENTALIST)

**Objective:** Working clean-room baseline + our `InfoMap` method, runnable with a CLI.

**Backlog**

- D1. Repo skeleton: `packages/infomap-service/` (Node.js/TS) or `server/src/services/InfoMapService.ts`.
- D2. Baseline: Simple localized subgraph query.
- D3. Proposed method: Multi-hop expansion with "Importance Sampling" (filtering low-relevance nodes).
- D4. Unit tests: Golden fixtures of a known disinformation cluster.

**Deliverables**

- `server/src/services/InfoMapService.ts`
- `server/src/scripts/infomap-cli.ts`
- `server/tests/infomap/`
- `Makefile` targets: `infomap-test`, `infomap-run`.

**DoD**

- Reproducible run produces JSONL outputs of graph structures.

---

## Workstream E — Evaluation + Benchmark Harness

**Objective:** Evidence of improvement in detection speed/accuracy.

**Backlog**

- E1. Eval harness: Script to measure subgraph expansion time vs. node count.
- E2. Minimal benchmark suite: "Synthetic Twitter" dataset (100k nodes).
- E3. Ablations: Compare "Full Graph Scan" vs "Importance Sampling".

**Deliverables**

- `benchmarks/infomap/config.yaml`
- `benchmarks/infomap/run.ts`
- `docs/sprints/sprint26/benchmark/results.md`

**DoD**

- Baseline vs ours reported with confidence intervals.

---

## Workstream F — Patent Scaffold (PATENT-COUNSEL)

**Objective:** Draft enablement-grade patent spec for "Predictive Structural Drift in Media Graphs".

**Backlog**

- F1. Draft spec: Background, Summary, Embodiments.
- F2. Claims: System claim for "Real-time Influence Mapping".
- F3. Design-arounds.

**Deliverables**

- `docs/sprints/sprint26/ip/draft_spec.md`
- `docs/sprints/sprint26/ip/claims.md`

**DoD**

- Claims map to implemented `InfoMap` embodiments.

---

## Workstream G — Integration Stubs (Summit / IntelGraph)

**Objective:** A "thin integration" proving deployability to Analyst UI.

**Backlog**

- G1. API Stub: GraphQL resolver for `mapInfoEnvironment(seedNode: ID!)`.
- G2. Telemetry: Prometheus metrics for `nodes_ingested`, `graph_expansion_ms`.
- G3. Release Notes.

**Deliverables**

- `server/src/graphql/resolvers/InfoMapResolvers.ts`
- `docs/sprints/sprint26/integration/example_pipeline.md`

**DoD**

- One end-to-end query from GraphQL Playground returns valid graph JSON.

---

## Workstream H — Compliance + Safety

**Objective:** Data governance for social graph data.

**Backlog**

- H1. Third-party inventory: Check license for GDELT or other data sources.
- H2. Data policy: Redaction of User IDs (GDPR).
- H3. Abuse prevention: Rate limit graph expansions to prevent DB meltdowns.

**Deliverables**

- `docs/sprints/sprint26/compliance/data_governance.md`
- `docs/sprints/sprint26/compliance/safety_controls.md`

**DoD**

- PII Redaction hook implemented in Ingestion.

---

## Next-Steps Kanban

- [ ] **A1–A3** Problem framing + KPIs locked
- [ ] **B1–B3** Prior art + 2 inventive hypotheses selected
- [ ] **C1–C3** Method spec + threat model completed
- [ ] **D1–D4** Baseline + method + CLI + tests running
- [ ] **E1–E4** Eval harness + results + ablations + robustness
- [ ] **F1–F3** Patent scaffold + claims + FTO notes drafted
- [ ] **G1–G3** Integration stub + telemetry + release notes
- [ ] **H1–H3** SBOM/inventory + data governance + safety controls
