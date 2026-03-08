# Summit Subsumption Strategy: Neptune, TigerGraph, Neo4j, and Recorded Future

## Summit Readiness Assertion

This strategy asserts that Summit is not a graph database competitor; it is an evidence-grade intelligence operating system that absorbs graph/database capabilities as subsystems while governing end-to-end reasoning determinism.

## Executive Position

The competitive frontier is moving from standalone graph performance toward AI-integrated knowledge orchestration. Summit should claim the category **Evidence Intelligence Operating System (EIOS)** and position graph engines, vector stores, and LLMs as pluggable execution layers beneath evidence contracts.

## High-Signal Market Read

- **Amazon Neptune:** expanding globally and coupling graph workflows to Bedrock-centered GraphRAG paths.
- **TigerGraph:** converging vector retrieval and graph traversal inside high-throughput query execution.
- **Neo4j:** still strongest in developer ergonomics and graph data science ecosystem depth.
- **Recorded Future:** strongest packaged external threat-intelligence coverage and analyst workflow operationalization.

## Subsumption Layer Map

### 1) Neo4j strengths to absorb

Absorb:

- Property-graph ergonomics and developer velocity.
- Graph data science breadth.
- Visualization and connector ecosystem patterns.

Subsumed by Summit via:

- Switchboard ingestion and normalized evidence contracts.
- IntelGraph multi-store fabric (`Neo4j + Postgres + vector + search`) under governed orchestration.
- Evidence-linked edges with deterministic lineage.

Exceedance thesis:

- Neo4j-native graph depth plus provenance-grade verification and cross-store reasoning that is reproducible by policy.

### 2) Neptune strengths to absorb

Absorb:

- Managed scale and cloud-adjacent AI integration patterns.
- GraphRAG framing for enterprise knowledge bases.

Subsumed by Summit via:

- Maestro-conducted agent workflows over a cloud-agnostic graph fabric.
- Pluggable model routing (OpenAI/Anthropic/Azure/self-hosted).
- Evidence-first outputs (`report.json`, `metrics.json`, `stamp.json`, `evidence_map.yaml`).

Exceedance thesis:

- Neptune is graph infrastructure; Summit becomes **decision infrastructure with governance guarantees**.

### 3) TigerGraph strengths to absorb

Absorb:

- Massively parallel traversal analytics.
- Hybrid vector + graph retrieval in operational workloads.

Subsumed by Summit via:

- Retrieval pipeline `vector retrieval -> graph expansion -> evidence validation -> agent reasoning`.
- Deterministic audit chain for every claim derived from traversal results.

Exceedance thesis:

- TigerGraph optimizes computation throughput; Summit optimizes **decision integrity + evidentiary trust**.

## Capability Matrix (Summit vs Palantir vs Neo4j vs Recorded Future)

Legend: `✅ native strength`, `◐ partial / composable`, `— not core`

| Capability                              | Summit | Palantir | Neo4j | Recorded Future |
| --------------------------------------- | -----: | -------: | ----: | --------------: |
| Evidence-grade agentic operating layer  |     ✅ |        ◐ |     — |               ◐ |
| Enterprise workflow operationalization  |      ◐ |       ✅ |     — |              ✅ |
| Developer graph platform ergonomics     |      ◐ |        ◐ |    ✅ |               — |
| Graph algorithms as first-class product |      ◐ |        ◐ |    ✅ |               ◐ |
| GraphRAG / hybrid retrieval             |     ✅ |       ✅ |    ✅ |               ◐ |
| External intel collection coverage      |     ✅ |        ◐ |     — |              ✅ |
| Deterministic provenance bundles        |     ✅ |        ◐ |     — |               ◐ |
| Cloud/vendor independence               |     ✅ |        ◐ |    ✅ |               ◐ |

## The Five-Layer Moat Architecture

1. **Acquisition Layer (Switchboard):** connectors for OSINT + enterprise systems + streaming intake.
2. **Evidence Fabric Layer:** normalized evidence/lineage/confidence/provenance artifacts as canonical records.
3. **Knowledge Fabric Layer (IntelGraph):** composable graph + vector + relational + search execution plane.
4. **Agentic Reasoning Layer (Maestro):** role-specialized agents with bounded authority and explicit handoffs.
5. **Governance & Determinism Layer:** signed outputs, replayable runs, policy-as-code gates, and rollback semantics.

## Missing Architecture Pieces (Priority Order)

1. **Canonical ontology package (`ontology/`)**
   - Shared object/action schema consumed by ingestion, agents, and UI.
   - Versioned invariants for identifiers, confidence semantics, and provenance requirements.

2. **Evidence Fabric as a first-class subsystem**
   - Content addressing, signature policy, and deterministic bundle tooling.
   - Unified verification CLI in CI and post-deploy audit workflows.

3. **Agent evaluation and safety plane**
   - Retrieval correctness, citation completeness, hallucination-rate ceilings, and policy compliance tests.
   - Regression scorecards as merge blockers for GA-critical surfaces.

4. **Entity resolution + identity graph**
   - Explainable match rationale, reversible merges/splits, and confidence calibration.

5. **Investigation UX (“case system”)**
   - Timeline + claim graph + evidence chain + explainability pane (“why this conclusion”).

6. **Connector SDK + marketplace mechanics**
   - Connector scaffolding, replay fixtures, auth/rate-limit standards, and provenance contract validation.

## 90-Day Execution Roadmap

### Days 1-30: Lock Evidence and Ontology

Deliver:

- Ontology v0 package and schema registry.
- Evidence Fabric v1 deterministic bundle format and signature verification CLI.
- CI gates enforcing provenance completeness and deterministic output constraints.

Acceptance:

- Same inputs produce byte-stable `stamp.json` outputs.
- Every report claim maps to at least one evidence object and lineage entry.

### Days 31-60: Operationalize Workflows

Deliver:

- Case management MVP with evidence-linked narrative workflows.
- Entity Resolution v1 with merge/split explainability and audit trails.
- GraphRAG v1 requiring citations by contract.

Acceptance:

- End-to-end path works reliably: ingest -> correlate -> analyze -> publish report with provenance links.

### Days 61-90: Prove Superiority at Scale

Deliver:

- Connector SDK v1 + first wave of high-value connectors.
- Evaluation harness and benchmark scoreboard (correlation, attribution, timeline reconstruction).
- Dominance demo packs against common enterprise intelligence workflows.

Acceptance:

- Measurable improvement in case completion time, citation completeness, and reproducibility.

## Single 10x Architectural Shift

Adopt **Claim-as-Primary-Truth** as a platform invariant.

Each claim becomes a signed, content-addressed unit:

- `claim.json` (canonicalized claim)
- `claim.cid` (hash identifier)
- `claim.attestation` (producer, policy context, signature)
- `claim.links` (evidence object references)
- deterministic graph projection metadata

Result:

- Graph edges become projections of attestable claims.
- Reasoning becomes traversal across validated assertions, not raw mutable facts.
- Legal/audit portability rises because customers can independently verify exported bundles.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Observability, Security.
- **Threats Considered:** prompt injection in retrieval pipelines, tool abuse by over-privileged agents, provenance tampering, non-deterministic replay divergence.
- **Mitigations:** policy-scoped tool registry enforcement, claim signing + verification, deterministic build gates, runtime anomaly monitoring and rollback triggers.

## Tradeoff Ledger Snapshot

- **Cost:** stronger governance and evaluation increase short-term implementation overhead.
- **Risk:** reduced downstream legal/compliance exposure through verifiable outputs.
- **Velocity:** initial slowdown from stricter gates is offset by faster revalidation and lower incident rework in later phases.

## Finality

Summit should immediately enforce claim-centric evidence determinism as the non-negotiable contract, then scale distribution via connectors and workflow UX. This sequence locks a moat competitors cannot match without replatforming core assumptions.
