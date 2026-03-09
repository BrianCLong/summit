# Summit Graph-Native AI 90-Day Execution Plan

## Summit Readiness Assertion

Summit will execute a governed, evidence-first program that upgrades GraphRAG into an evidence-native intelligence operating system with deterministic outputs, cryptographic lineage, and bounded autonomous investigation loops.

## Objective

Convert current capabilities (Switchboard ingestion, IntelGraph/Neo4j, Maestro orchestration, GraphRAG, deterministic artifacts) into six deployable subsystems over 90 days without degrading GA gates.

## Scope Mapping to Repository Zones

- **Primary Zone:** `packages/` (shared platform services and contracts)
- **Coupled Zones (strictly coupled):** `server/` (APIs), `apps/web/` (analyst visualization), `docs/` (governance/evidence)
- **Boundary rule:** shared contracts remain in `packages/common-types` and `packages/knowledge-graph`; no direct cross-zone shortcuts.

## MAESTRO Security Alignment

- **MAESTRO Layers:** Foundation, Data, Agents, Tools, Infra, Observability, Security.
- **Threats Considered:** prompt injection, tool abuse, evidence poisoning, replay/tampering of artifacts, agent goal drift, non-deterministic retrieval.
- **Mitigations:** policy-bounded traversal, deterministic artifact schemas, cryptographic attestations, contradiction checks, signed lineage chain, runtime anomaly telemetry.

## Six Concrete Subsystems

### 1. Evidence Graph Engine (EGE)

**Purpose:** materialize evidence-native claim graphs as the canonical reasoning substrate.

**Deliverables**

- `packages/knowledge-graph`: claim/evidence graph builders and deterministic ID strategy.
- `server/`: ingest + retrieval APIs (`/evidence/ingest`, `/claims/extract`, `/subgraph`).
- Artifact emitters: `claim_graph.json`, `evidence_map.json`, `entity_index.json`.

**Acceptance**

- Same input bundle => identical graph hash.
- Every claim is linked to at least one evidence node.
- P95 subgraph retrieval < 150ms on benchmark fixture.

### 2. Temporal-Causal Graph Layer (TCG)

**Purpose:** add temporal and causal semantics for investigation-grade pathing.

**Deliverables**

- Temporal node/edge schema (`Event`, `TemporalInterval`, `OCCURRED_BEFORE`, `CAUSED`).
- Query library for timeline reconstruction + influence chains.
- Artifacts: `timeline.json`, `causal_paths.json`, `event_graph.svg`.

**Acceptance**

- Temporal consistency gate blocks impossible ordering.
- Entity timeline generation < 1s on reference dataset.

### 3. Graph Reasoning Runtime (GRR)

**Purpose:** compile graph slices into deterministic graph prompts for LLM reasoning.

**Deliverables**

- Graph Prompt DSL compiler.
- Runtime endpoint `/reason` with trace artifacts.
- Artifacts: `graph_prompt.txt`, `reasoning_trace.json`, `reasoning_result.json`.

**Acceptance**

- Prompt determinism for fixed input.
- Prompt size policy (<= 3k tokens default envelope).
- Full reasoning trace replay from artifacts.

### 4. Autonomous Investigation Engine (AIE)

**Purpose:** run bounded, multi-agent graph investigations orchestrated by Maestro.

**Deliverables**

- Investigator state machine with bounded loop controls.
- Agent roles: Investigator, EntityExpander, EvidenceCollector, ContradictionChecker, Synthesizer.
- Artifacts: `investigation_report.json`, `investigation_graph.json`, `investigation_summary.md`.

**Acceptance**

- Investigation completes <= 60s on benchmark scenario.
- Reproducible output given fixed seed + inputs.
- Contradiction detector blocks unsupported synthesis claims.

### 5. Cryptographic Lineage & Provenance Engine (CLPE)

**Purpose:** enforce tamper-evident reasoning lineage for every derived insight.

**Deliverables**

- Lineage schema with parent-child hash chaining.
- Signature and attestation generation in artifact pipeline.
- Artifacts: `lineage.json`, `artifact.sig`, `attestation.json`.

**Acceptance**

- End-to-end lineage reconstruction passes CI.
- Signature verification is mandatory in quality gate.

### 6. Evidence Visualization & Graph Interface (EVGI)

**Purpose:** render evidence and claim lineage as analyst-facing deterministic graph views.

**Deliverables**

- DOT/SVG renderer + interactive JSON graph payload.
- Web UI integration for investigation replay and claim inspection.
- Artifacts: `evidence_graph.svg`, `claim_graph.dot`, `interactive_graph.json`.

**Acceptance**

- Graph rendering < 2s for standard case files.
- Deterministic graph output for stable artifact checks.

## 90-Day Delivery Sequence

### Month 1 (Foundation)

- Build EGE + baseline deterministic artifact contracts.
- Add TCG schema and temporal consistency verifier.
- Land reproducibility + determinism CI checks.

### Month 2 (Reasoning)

- Ship GRR DSL/compiler and traceable reasoning runtime.
- Ship AIE bounded investigation loops + contradiction checks.
- Add benchmark harness for latency and reproducibility.

### Month 3 (Trust + UX)

- Ship CLPE signature/attestation pipeline and verification gate.
- Ship EVGI graph rendering and investigation replay UI.
- Publish governance evidence bundle and release readiness packet.

## PR Stack (Target 20 PRs)

1. contracts: evidence graph canonical schemas
2. contracts: deterministic ID library + fixtures
3. graph: claim/evidence materializer service
4. graph: subgraph retrieval API + scoring
5. graph: temporal/causal schema migration
6. graph: timeline and causal chain query module
7. runtime: graph prompt DSL spec
8. runtime: graph prompt compiler + tests
9. runtime: `/reason` endpoint + trace artifacts
10. agents: investigation state machine core
11. agents: entity expansion + evidence collection workers
12. agents: contradiction checker + synthesis guardrails
13. provenance: lineage schema + hash chain implementation
14. provenance: signature/attestation generation
15. provenance: verification gate for CI
16. web: evidence graph renderer (DOT/SVG)
17. web: investigation replay and claim drill-down UI
18. docs: operator runbook + rollback procedures
19. docs: governance evidence bundle template
20. release: performance baselines + readiness assertion update

## Innovation Track (Forward-Leaning)

Introduce a **Policy-Bounded Graph Exploration Planner**:

- Uses dynamic evidence budget + risk scoring to choose traversal operators.
- Integrates with OPA policy decisions before each expansion step.
- Optimizes recall/precision while preserving deterministic and auditable behavior.

## Rollback and Safety

- Feature flags per subsystem (`ege`, `tcg`, `grr`, `aie`, `clpe`, `evgi`).
- Rollback trigger: determinism regression, signature mismatch, or P95 latency breach.
- Rollback path: disable subsystem flag, revert to prior artifact contract version, retain lineage continuity record.

## Definition of Done

- Tier A/B/C verification evidence attached for all GA-critical surfaces.
- Deterministic artifacts are reproducible in CI and locally.
- Security/governance gates pass with no bypass exceptions.
- Updated roadmap status references this execution plan.
