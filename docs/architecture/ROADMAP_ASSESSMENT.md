# Roadmap Assessment & Sprint Board

## Where you stand right now (High Confidence Assessment)

Based on the architectural documents (ADR-003, ADR-050, Ontology Engine Reference, Provenance Ledger, Day-1 Topology) and the repository's module tree, here is a re-evaluated assessment against the 12 Palantir-class components.

**Legend:** 🟢 Solid / 🟡 Partial / 🟠 Early / 🔴 Missing
**Confidence:** High (based on concrete architectural artifacts in the repository)

1. **Ontology & semantic layer — 🟢 (Solid)**
   - _Evidence:_ `docs/architecture/ONTOLOGY_ENGINE.md`, `docs/architecture/adr/0003-graph-first-intelligence-engine.md`, `docs/architecture/ADR-050-Knowledge-OS-Data-Model.md`.
   - _Details:_ The platform enforces a hybrid data model (Vector Store + Graph DB). The Neo4j graph uses a strict, canonical data model with 21 entity types, 30 relationship types, and mandatory policy labels. The Ontology Engine handles RDF/XML, Turtle, JSON-LD, and validates against SHACL shapes and OPA.

2. **Entity resolution engine — 🟡 (Partial - Med/High)**
   - _Evidence:_ `ADR-003` explicitly mentions "entity resolution" and "pattern matching".
   - _Details:_ The foundation is there, but a dedicated ER service with probabilistic merges, alias tables, and human-in-the-loop workflows likely needs hardening in the product layer.

3. **Temporal intelligence — 🟢 (Solid)**
   - _Evidence:_ `ADR-003` defines strict **Bitemporal Fields**: `validFrom/To` (business time) and `observedAt/recordedAt` (system time).
   - _Details:_ The database schema explicitly requires temporal tracking, enabling "as-of" time-slicing queries inherently.

4. **Provenance & source attribution — 🟢 (Solid)**
   - _Evidence:_ `docs/architecture/prov-ledger.md`.
   - _Details:_ The Provenance Ledger microservice handles immutable chains-of-custody, attaching source, license, and transformation metadata to _every_ assertion. It also generates verfiable disclosure bundles with Merkle roots and Ed25519 signatures.

5. **Data ingestion framework (connectors + pipeline) — 🟡 (Partial)**
   - _Evidence:_ `workers/ingest/`, `docs/architecture/CONNECTOR_GA_SUMMARY.md` (present in tree).
   - _Details:_ The repository contains ingestion workers and connector summaries, suggesting a structured pipeline. The "connector SDK" maturity needs verification.

6. **Narrative & influence modeling — 🟡 (Partial)**
   - _Evidence:_ `summit-cog-war/` (Cognitive Warfare directory with `red_cog_swarm`, `blue_mind_shield`), `summit_misinfo/`, `ADR-003` includes `Narrative` and `Campaign` entity types.
   - _Details:_ The platform heavily models cognitive warfare, narratives, and influence, including simulation (`summit_sim/`) and specific agent swarms.

7. **Autonomous investigation agents — 🟢 (Solid)**
   - _Evidence:_ `summit/agents/`, `summit/agentloop/`, `summit/eval_harness/`, `summit/tools/`, `summit/skills/`.
   - _Details:_ Autonomous agents are deeply integrated, writing to the graph, gated by OPA verifiers and eval harnesses. The system employs critic/verifier loops and multi-agent coordination.

8. **Graph analytics engine — 🟡 (Partial - Med/High)**
   - _Evidence:_ `ADR-003` lists APOC + GDS (Graph Data Science) libraries.
   - _Details:_ Neo4j GDS provides PageRank, community detection, and shortest path natively. The platform has the engine; specific reusable investigation jobs need to be codified.

9. **Investigation workspace (UI/UX) — 🟠 (Early/Partial)**
   - _Evidence:_ `ui/`, `webapp/`, `web/`, `summit_evidence/`.
   - _Details:_ The frontend exists, but the specific implementation of the "IDE for investigations" (timeline, evidence binder, hypothesis board) requires focused UI/UX development.

10. **Governance & access control — 🟢 (Solid)**
    - _Evidence:_ `docs/architecture/zero-trust.md`, `docs/architecture/prov-ledger.md`, `ADR-003` (Mandatory Policy Labels).
    - _Details:_ Extremely mature. OPA (Open Policy Agent) gates, ABAC hooks, SPIFFE/Mesh CA, mandatory sensitivity/clearance labels on every node, and immutable audit trails are core architectural pillars.

11. **Sovereign deployment capability — 🟢 (Solid)**
    - _Evidence:_ `docs/architecture/day1-topology.md`, `summit_helm_argocd_multiacct_pack/`, `summit_release_env_pack/`.
    - _Details:_ Day-1 topology includes an **Offline Cell** (Offline Loader, Immutable Object Store, Offline Neo4j/Postgres) for disconnected/air-gapped operators, alongside multi-region SaaS deployments.

12. **Developer + plugin ecosystem — 🟠 (Early)**
    - _Evidence:_ `tools/plugin-cli/`, `summit/plugins/`.
    - _Details:_ The structure for plugins exists, but a hardened external SDK and registry are likely in early stages.

---

## Practical Roadmap & Sprint Board

This roadmap operationalizes the architecture into deployable Epics and Stories, aligning with the existing repository structure.

### Phase 1: Evidence + Provenance End-to-End ("Proof Moat" Foundation)

**Goal:** Every claim is traceable and reproducible.

- **Epic 1: Provenance Ledger Hardening**
  - _Path:_ `summit/evidence/`, `docs/architecture/prov-ledger.md`
  - **Story 1.1:** Implement Fastify API endpoints (`/evidence`, `/claim`, `/disclosures`) as defined in `prov-ledger.md`.
  - **Story 1.2:** Enforce the Merkle tree manifest generation and Ed25519 tenant signature for disclosure bundles.
  - **Story 1.3:** Build the `prov-ledger verify` CLI to check file hashes and signatures.
  - _Acceptance Test:_ CLI successfully verifies a test bundle against a known public key.

- **Epic 2: Evidence-Gated Graph Writes**
  - _Path:_ `workers/graph_ai/`, `summit/api/`
  - **Story 2.1:** Implement the `claim.created` Kafka event consumer.
  - **Story 2.2:** Update the Neo4j writer to reject any node/relationship insertion that lacks a valid `source_ref` or `extraction_ref`.
  - _Acceptance Test:_ Attempting to write a node without provenance metadata returns a 403/400 error.

### Phase 2: Ingestion Framework as a Connector SDK

**Goal:** Scale data ingestion without bespoke work each time.

- **Epic 3: Universal Connector Interface**
  - _Path:_ `workers/ingest/`, `summit/integrations/`
  - **Story 3.1:** Define the base TypeScript interface (`discover`, `fetch`, `normalize`, `extract`, `load`).
  - **Story 3.2:** Implement an idempotent job queue using Redis/Kafka for ingestion tasks.
  - **Story 3.3:** Build the "Golden RSS/News" connector using the new SDK.
  - _Acceptance Test:_ RSS connector automatically ingests, normalizes, and writes to Neo4j via the Provenance Ledger.

### Phase 3: Ontology + Entity Resolution

**Goal:** Stop graph rot; unify identities.

- **Epic 4: Entity Resolution v1**
  - _Path:_ `summit/indexing/`, `summit/graph/`
  - **Story 4.1:** Create an Alias Table mapping raw extracted names to canonical Entity IDs in PostgreSQL/Neo4j.
  - **Story 4.2:** Implement basic fuzzy matching and blocking keys for incoming entities.
  - **Story 4.3:** Build a human-in-the-loop merge/unmerge API endpoint.
  - _Acceptance Test:_ Ingesting "Vladimir Putin" and "V. Putin" flags a potential merge; analyst approves, creating a canonical link with an audit trail.

### Phase 4: Temporal Intelligence ("As-Of" Truth)

**Goal:** Investigations require timeline truth.

- **Epic 5: Bitemporal Query Engine**
  - _Path:_ `summit/temporal_graph/`, `summit/api/`
  - **Story 5.1:** Enforce `validFrom`, `validTo`, `observedAt`, `recordedAt` on all Cypher write queries (per `ADR-003`).
  - **Story 5.2:** Create a GraphQL query wrapper that accepts a `timestamp` parameter to slice the graph state as of that date.
  - _Acceptance Test:_ Querying an organization's leadership returns different results depending on the `timestamp` provided.

### Phase 5: Investigation Workspace v1 (The "IDE")

**Goal:** Make Summit where investigations actually happen.

- **Epic 6: Core UI Primitives**
  - _Path:_ `ui/`, `webapp/`
  - **Story 6.1:** Build the generic `Investigation` object (scope, goal, tags).
  - **Story 6.2:** Implement the Evidence Binder component (linking directly to Provenance Ledger records).
  - **Story 6.3:** Implement the interactive Timeline view querying the bitemporal engine.
  - _Acceptance Test:_ An analyst can create an investigation, pin an evidence node, and view its temporal lifecycle in the UI.

### Phase 6: Autonomous Investigation Agents (Safe + Verifiable)

**Goal:** Agents that update the graph, not just chat.

- **Epic 7: Verifiable Agent Tool Use**
  - _Path:_ `summit/agents/`, `summit/tools/`
  - **Story 7.1:** Enforce OPA policies on all agent tool executions (e.g., preventing unauthorized graph reads/writes).
  - **Story 7.2:** Implement Critic Agents that review proposed graph updates for schema compliance and provenance before committing.
  - _Acceptance Test:_ An agent attempts to hallucinate a connection; the Critic Agent blocks the transaction due to lack of evidence references.
