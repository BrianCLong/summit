# Claude Implementation Prompts for IntelGraph Platform

> **Document Purpose**: High-leverage, production-ready implementation prompts for AI-assisted development of the IntelGraph intelligence analysis platform.
> **Last Updated**: 2025-11-23
> **Usage**: These prompts can be fed directly into Claude Code or similar AI assistants to accelerate feature development while maintaining architectural consistency and best practices.

---

## Overview

This document contains 11 comprehensive implementation prompts covering the full capability spectrum of the IntelGraph platform, from data ingestion to visualization, analytics, governance, and AI-augmented features.

Each prompt is:
- **Self-contained**: Can be executed independently
- **Production-focused**: Includes testing, security, and compliance requirements
- **Architecture-aware**: Designed for the Summit/IntelGraph monorepo structure
- **Best-practice oriented**: Emphasizes extensibility, policy-awareness, and auditability

---

## Table of Contents

### Core Infrastructure
1. [Universal Data Ingestion + ETL Assistant](#1-universal-data-ingestion--etl-assistant)
2. [Canonical Graph Schema with Temporal & Policy Labels](#2-canonical-graph-schema-with-temporal--policy-labels)
3. [Provenance & Claim Ledger Service](#3-provenance--claim-ledger-service)

### Entity & Analytics
4. [Entity Resolution Service with Explainability](#4-entity-resolution-service-with-explainability)
5. [Geo-Temporal Graph & Co-Presence Detection](#5-geo-temporal-graph--co-presence-detection)
6. [Analytics Suite: Link/Path/Community/Centrality + Pattern Miner](#6-analytics-suite-linkpathcommunitycentrality--pattern-miner)

### AI/ML Capabilities
7. [AI Copilot: Natural-Language → Cypher/SQL with Guardrails](#7-ai-copilot-natural-language--cyphersql-with-guardrails)
8. [GraphRAG / Evidence-First RAG with Citations](#8-graphrag--evidence-first-rag-with-citations)

### Governance & UX
9. [Case Spaces, ABAC/RBAC & Immutable Audit](#9-case-spaces-abacrbac--immutable-audit)
10. [Tri-Pane Analyst UI (Graph + Timeline + Map)](#10-tri-pane-analyst-ui-graph--timeline--map)
11. [Runbook / Agent Runtime + "Rapid Attribution (CTI)" Runbook](#11-runbook--agent-runtime--rapid-attribution-cti-runbook)

---

## Implementation Prompts

### 1. Universal Data Ingestion + ETL Assistant

**Category**: Core Infrastructure
**Complexity**: High
**Dependencies**: Kafka/AMQP, PostgreSQL, schema inference capabilities

#### Prompt

```
You are an elite backend engineer working in a TypeScript/Node + Kafka + Postgres stack.
Design and implement a **Universal Data Ingestion & ETL Assistant** service for an intelligence-graph platform. This service must:

1. **Connector Framework**

   * Define a pluggable connector interface for:

     * HTTP pull (REST/JSON, RSS)
     * S3/GCS/Azure Blob
     * Kafka/AMQP streams
     * CSV/Parquet files
   * Include at least **three concrete connectors** (e.g., generic REST pull, S3 bucket, CSV upload) using the same interface.
   * Each connector must emit normalized events into a Kafka topic (or an abstracted `IngestEventBus` interface) with a common envelope:

     * `sourceId`, `connectorType`, `rawPayload`, `ingestedAt`, `licenseId`, `sensitivity`, `schemaHint`.

2. **Ingest Wizard / ETL Assistant Core**

   * Expose an HTTP API that:

     * Accepts sample records from a new source.
     * Runs **schema inference** and produces a suggested mapping into a canonical model (`Person`, `Org`, `Location`, `Event`, `Document`, `Indicator`).
     * Flags potential PII fields and suggests redaction rules.
     * Attaches a `licenseId` and `policyTags` to the source.
   * Implement schema inference and PII detection using deterministic heuristics first (no external LLMs assumed).

3. **Data License Registry & Enforcement**

   * Implement a `LicenseRegistry` that stores license/TOS metadata for sources.
   * Implement a `PolicyEngine` that:

     * Given a `licenseId` and a requested operation (`INGEST`, `EXPORT`, `SHARE`), returns ALLOW/DENY + human-readable reason.
   * Block disallowed **export** operations via an HTTP endpoint that returns a structured error with the reason and an optional override workflow hint.

4. **Non-Functional Requirements**

   * All modules must be unit-tested (at least 80% coverage for core logic).
   * Strong typing using TypeScript interfaces; no `any`.
   * Clear separation of concerns: connectors, ETL assistant, policy engine, license registry.
   * Use dependency injection patterns so connectors and policy rules can be swapped.

5. **Deliverables**

   * Code for core services and connectors.
   * Example configuration files defining at least two different sources, with license policies.
   * A short `README` explaining how to:

     * Add a new connector.
     * Register a new data source.
     * Test that a given export is allowed/blocked.

Focus on **extensibility + policy-by-default**: make it trivial to add new connectors and new license rules without touching core logic.
```

---

### 2. Canonical Graph Schema with Temporal & Policy Labels

**Category**: Core Infrastructure
**Complexity**: Medium-High
**Dependencies**: Graph database (Neo4j), TypeScript/JSON Schema

#### Prompt

```
You are designing the **canonical entity/relationship schema** for a multi-tenant intelligence-graph platform. Implement:

1. **Schema Definition**

   * Use TypeScript types or JSON Schema to model entities:

     * `Person`, `Org`, `Asset`, `Account`, `Location`, `Event`, `Document`, `Communication`, `Device`, `Vehicle`, `Infrastructure`, `FinancialInstrument`, `Indicator`, `Case`, `Narrative`, `Campaign`, `Authority`, `License`.
   * Model edge types:

     * `communicatesWith`, `funds`, `owns`, `controls`, `locatedAt`, `observedAt`, `derivedFrom`, `supports`, `contradicts`, `mentions`, `attributedTo`, `partOf`, `memberOf`.

2. **Temporal & Bitemporal Attributes**

   * Add `validFrom`, `validTo`, `observedAt`, `recordedAt` where appropriate.
   * Provide helper functions to:

     * Answer "is this entity/edge valid at time T?"
     * Compute **snapshot-at-time** views over a set of nodes/edges.

3. **Policy & Governance Labels**

   * Every node and edge must support:

     * `sensitivity`, `legalBasis`, `purpose`, `retentionClass`, `licenseId`, `needToKnowTags` (string arrays).
   * Implement a simple **policy check** that:

     * Given a user's attributes (`clearances`, `roles`, `purposes`) and a node/edge's labels, returns ALLOW/DENY + reason.

4. **APIs / Contracts**

   * Define a GraphQL (or REST) schema for:

     * Creating, updating, querying entities and edges.
     * Time-travel query: `entitiesAsOf(time: DateTime, filters: ...)`.
   * Include pagination and basic cost-limiting hints (e.g., limit, depth).

5. **Tests & Examples**

   * Provide test fixtures that:

     * Create a small graph (10–20 nodes) with temporal changes.
     * Demonstrate time-travel queries and policy filtering.
   * Include at least one example where a user is denied access due to policy labels, with a clear message.

Optimize for **clarity, extensibility, and policy-awareness by default**.
```

---

### 3. Provenance & Claim Ledger Service

**Category**: Core Infrastructure
**Complexity**: Medium-High
**Dependencies**: Immutable data store, hash/checksum libraries

#### Prompt

```
Implement a **Provenance & Claim Ledger** microservice for the same intelligence-graph platform. This service must be the authoritative source of **evidence, claims, and transformation lineage**.

1. **Core Data Model**

   * `Evidence`:

     * `evidenceId`, `sourceSystem`, `originalUri`, `checksum`, `mimeType`, `ingestedAt`, `licenseId`, `redactionMap`.
   * `Claim`:

     * `claimId`, `text`, `structuredPayload` (JSON), `confidence`, `createdAt`.
   * Relations:

     * `Evidence` ↔ `Claim` (supports / contradicts).
     * `Transform` records describing extraction/processing steps (`fromEvidenceId`, `toClaimId`, `transformType`, `parameters`, `performedBy`, `performedAt`).

2. **API Surface**

   * HTTP/GraphQL APIs to:

     * Register new evidence with hashes.
     * Register claims derived from evidence or other claims.
     * Query all evidence supporting a given claim.
     * Generate an **export manifest** for a set of claims/evidence:

       * Must include a hash tree (Merkle or simpler composite hash) of all included artifacts and transforms.

3. **Integrity & Verification**

   * Provide a CLI or script that:

     * Takes an export manifest + files and verifies all hashes and transform links.
   * Log all write operations with immutable audit records (append-only log abstraction).

4. **Acceptance Criteria**

   * Given a set of documents and claims, the manifest must be sufficient for a third party to verify:

     * Integrity (no tampering).
     * Provenance (which evidence supports which claims).
   * Include unit tests for:

     * Hash verification.
     * Manifest reconstruction and validation.

Code in TypeScript or Go with strong typing and focus on **verifiable chain-of-custody**.
```

---

### 4. Entity Resolution Service with Explainability

**Category**: Entity & Analytics
**Complexity**: Medium-High
**Dependencies**: String similarity libraries, feature engineering

#### Prompt

```
Build a standalone **Entity Resolution Service** that takes in candidate records and decides whether they represent the same real-world entity, with full explainability.

1. **Features & Signals**

   * Support at least these features:

     * String similarity (name, email, org).
     * Geo proximity (locations).
     * Temporal overlap (active periods).
     * Shared identifiers (account IDs, phone numbers).
   * Model an extensible `FeatureVector` type.

2. **Blocking & Matching**

   * Implement a **blocking strategy** (e.g., by normalized last name + country) to reduce candidate pairs.
   * Implement a simple pairwise **classifier** (rules-based or ML-ready design) that outputs:

     * `matchScore` (0–1), `decision` (MERGE / REVIEW / NO_MATCH).

3. **Explainability API**

   * For each decision, store:

     * Feature contributions and rationales (e.g., "exact email match + high name similarity").
   * Expose an `/er/explain` endpoint that:

     * Returns metrics and human-readable reasons.

4. **Merge/Split Operations**

   * Implement `/er/merge` and `/er/split` endpoints:

     * Record who triggered the action and why.
     * Maintain an **override log** that can be queried later.

5. **Tests**

   * Include a small labeled dataset and tests validating:

     * Reasonable scores for clear matches and non-matches.
     * The explanation contains all features used in the decision.

Optimize for **reversible merges, human-in-the-loop, and transparency**.
```

---

### 5. Geo-Temporal Graph & Co-Presence Detection

**Category**: Entity & Analytics
**Complexity**: Medium
**Dependencies**: Graph database with spatial/temporal queries

#### Prompt

```
Implement a **Geo-Temporal Analytics** module over a property graph (Neo4j/JanusGraph-style), focusing on trajectories, stay-points, convoys, and rendezvous detection.

1. **Data Model**

   * Assume `Location` nodes with lat/long and `Event`/`Observation` nodes with timestamps.
   * Entities (Person, Device, Vehicle) have edges to locations/events:

     * `wasAt` with `startTime`, `endTime`.

2. **Core Algorithms**

   * **Trajectory builder**: given an entity ID, derive its ordered sequence of locations over time.
   * **Stay-point detection**: detect periods where an entity stays within radius R for at least duration D.
   * **Co-presence / Rendezvous**:

     * Given two or more entities, detect intervals where they are within distance R and overlapping time window W.
   * **Convoy detection**:

     * Detect groups of entities that move together over at least K consecutive observations.

3. **APIs**

   * Implement functions or Cypher/Gremlin query templates for each algorithm.
   * Provide an HTTP/GraphQL wrapper that exposes:

     * `GET /entities/:id/trajectory`
     * `GET /entities/:id/staypoints`
     * `POST /copresence` with entity IDs and parameters.

4. **Performance & Testing**

   * Ensure queries are parameterized and index-friendly.
   * Include tests over synthetic data that:

     * Verify detection of a known convoy and rendezvous scenario.

Emphasize **correctness and clear parameterization**, not premature micro-optimizations.
```

---

### 6. Analytics Suite: Link/Path/Community/Centrality + Pattern Miner

**Category**: Entity & Analytics
**Complexity**: Medium-High
**Dependencies**: Graph algorithms library (e.g., igraph, Neo4j GDS, NetworkX)

#### Prompt

```
Implement a reusable **Graph Analytics Library** that provides:

1. **Link Analysis & Pathfinding**

   * Shortest path; K-shortest paths.
   * Policy-aware pathfinding that can exclude edges/nodes based on labels (e.g., `sensitivity`).

2. **Community Detection & Centrality**

   * Louvain or Leiden for communities (assume you can use an existing algorithmic library).
   * Centrality metrics: degree, betweenness, eigenvector.
   * Output results in a format suitable for driving a UI (node IDs + scores + community IDs).

3. **Pattern Miner**

   * Implement a small library of motif detectors, e.g.:

     * Star pattern (one central node with many spokes).
     * Bi-partite fan-in/fan-out (for financial structuring).
     * Repeated interaction sequences between the same small set of nodes over time.

4. **Explainability & Contracts**

   * Each algorithm must return:

     * Raw scores/results.
     * A **summary explanation** suitable for an analyst ("Top 5 brokers by betweenness centrality", etc.).

5. **Tests**

   * Include at least two small test graphs with:

     * Known communities.
     * Known central nodes.
     * Known patterns for the motif detectors.

Implement this as a language-agnostic core (e.g., Python or TypeScript) with a clean API that can later be wrapped by services.
```

---

### 7. AI Copilot: Natural-Language → Cypher/SQL with Guardrails

**Category**: AI/ML Capabilities
**Complexity**: High
**Dependencies**: LLM API access, query parser/validator

#### Prompt

```
Build the skeleton of an **AI Copilot for Graph Querying** that takes natural language and produces a **previewable graph query** (Cypher or SQL), with guardrails.

Assume you have an LLM API available; your job is to design and implement the orchestration and safety layers.

1. **Prompting & Query Generation**

   * Implement a function `nlToQuery(userText, schemaDescription, policyContext)` that:

     * Builds a prompt for the LLM describing the graph schema and allowed operations.
     * Receives the model's candidate query.

2. **Safety Checks & Guardrails**

   * Implement static checks for:

     * Max depth, max node/edge expansions.
     * Disallowed labels (e.g., attempts to query restricted `sensitivity` levels without authority).
   * If checks fail, return a structured error explaining why the query is blocked and how to narrow it.

3. **Preview & Execution Flow**

   * Design an API:

     * `POST /copilot/preview` → returns candidate query + cost estimate (rows, depth, etc.).
     * `POST /copilot/execute` → executes only if the user explicitly confirms and policy allows it.
   * Include rollback/undo metadata for write queries (even if you initially only support READ).

4. **Logging & Audit**

   * Log:

     * Original natural language prompt.
     * Generated query.
     * User decision (accepted/rejected).
     * Policy decisions.

5. **Tests**

   * Create unit tests with mocked LLM responses that:

     * Verify proper prompt construction.
     * Exercise safety checks and blocked queries.

Focus on **orchestration, safety, and clarity of user feedback**, not on the model itself.
```

---

### 8. GraphRAG / Evidence-First RAG with Citations

**Category**: AI/ML Capabilities
**Complexity**: High
**Dependencies**: LLM API, graph query capabilities, embedding/vector search (optional)

#### Prompt

```
Implement an **Evidence-First GraphRAG** service that answers analyst questions strictly based on graph evidence, with mandatory citations.

1. **Retrieval Layer**

   * Given a natural-language question and a case ID:

     * Retrieve a subgraph of relevant entities, edges, and attached documents/snippets.
     * Use simple retrieval first: keyword search on node/edge/claim attributes + neighborhood expansion.

2. **Context Packaging**

   * Build a context object containing:

     * Key nodes and edges.
     * Snippets of supporting evidence (from the Provenance/Claim ledger) with `evidenceId` and `claimId`.

3. **Answer Generation**

   * Orchestrate an LLM call that:

     * Must:

       * Answer only from supplied context.
       * Attach citations like `[evidence: E123, claim: C456]` inline.
     * Must:

       * Explicitly list unknowns / gaps.

4. **Enforcement**

   * Implement a post-processing step that:

     * Rejects any answer containing **no citations**.
     * Optionally verifies that all cited IDs exist in the context supplied.

5. **API & Tests**

   * API: `POST /graphrag/answer` with `question`, `caseId`, and user auth context.
   * Tests:

     * Mocked LLM responses to validate citation enforcement.
     * Cases where the system returns "insufficient evidence" correctly.

Optimize for **faithfulness to evidence, explicit uncertainty, and traceability**.
```

---

### 9. Case Spaces, ABAC/RBAC & Immutable Audit

**Category**: Governance & UX
**Complexity**: High
**Dependencies**: Policy engine (e.g., OPA), immutable log store

#### Prompt

```
Design and implement a **Case Management & Governance** module with:

1. **Case Spaces**

   * `Case` entity with:

     * `caseId`, `title`, `description`, `status`, `createdAt`, `ownerId`, `tags`.
   * Cases group:

     * Graph entities/edges.
     * Documents/evidence.
     * Tasks and watchlists.

2. **Access Control (ABAC/RBAC)**

   * Implement:

     * Role-based roles: Analyst, Lead, Ombudsman, Admin.
     * Attribute-based checks:

       * User clearances, jurisdictions, purposes.
       * Case sensitivity, jurisdiction, legal basis.
   * Centralize policy rules in a `PolicyEngine` abstraction.

3. **Immutable Audit Log**

   * For every read/write action on a case, record:

     * `who`, `what`, `when`, `why` (reason-for-access string).
   * Implement an append-only audit store (e.g., hash-chained log records).
   * Provide query APIs for ombuds and auditors:

     * Filter by user, case, time range, action type.

4. **Warrant / Authority Binding (Minimal)**

   * Model a simple `Authority` object:

     * `authorityId`, `type`, `jurisdiction`, `expiresAt`.
   * Allow linking Cases and Authorities.
   * Policy engine should deny operations if required authority is missing or expired.

5. **Tests**

   * Test access allowed/denied scenarios.
   * Test audit log hash chaining and tamper detection.

Focus on **governance and oversight**, not fancy UI.
```

---

### 10. Tri-Pane Analyst UI (Graph + Timeline + Map)

**Category**: Governance & UX
**Complexity**: Medium-High
**Dependencies**: React, TypeScript, visualization libraries (D3, vis.js, Leaflet/Mapbox)

#### Prompt

```
You are a senior frontend engineer using React + TypeScript + Tailwind.
Build a **tri-pane analyst console** component for IntelGraph, consisting of:

1. **Layout**

   * Left: Graph pane (network visualization).
   * Bottom: Timeline pane (events over time).
   * Right: Map pane (geo locations).
   * Panes should share:

     * A **global time brush**.
     * Selection state for entities/events.

2. **Interaction Contracts**

   * Selecting a node on the graph:

     * Highlights corresponding events on the timeline.
     * Highlights corresponding locations on the map.
   * Moving the time brush:

     * Filters visible edges/nodes, events, and map markers to that time window.

3. **Explain This View Panel**

   * Add a collapsible side panel:

     * Summarizes:

       * Number of nodes/edges currently visible.
       * Time window.
       * Top central nodes (accept props for this).
     * Shows a textual explanation stub:

       * E.g., "You are looking at communications between X and Y over the last 7 days filtered to [Country]."

4. **Architecture**

   * Implement:

     * A `ViewStateContext` that holds selection, time window, and filters.
     * Reusable hooks for linking the panes (`useGlobalTimeBrush`, `useSelection`).
   * Graph and map visualizations can be simple placeholders but with real props and callbacks.

5. **Testing & Storybook**

   * Provide at least one Storybook story (or equivalent) with mocked data showing:

     * Cross-highlighting.
     * Time brushing.
     * The explain panel updating as state changes.

Focus on **clean state management and interaction contracts**, not pixel-perfect design.
```

---

### 11. Runbook / Agent Runtime + "Rapid Attribution (CTI)" Runbook

**Category**: Governance & UX
**Complexity**: High
**Dependencies**: Workflow orchestration capabilities, graph/pattern APIs

#### Prompt

```
Implement a minimal **Runbook / Agent Runtime** plus one concrete runbook: **Rapid Attribution (CTI)**.

1. **Runbook Model**

   * Represent a runbook as a DAG of steps:

     * Each step has: `id`, `name`, `inputs`, `outputs`, `actionType` (e.g. `INGEST`, `LOOKUP_GRAPH`, `PATTERN_MINER`, `GENERATE_REPORT`), `retryPolicy`.
   * Runbook metadata:

     * `purpose`, `legalBasisRequired`, `assumptions`, `kpis`.

2. **Runtime Engine**

   * Given a runbook definition and inputs:

     * Execute steps in topological order.
     * Pass outputs between steps.
     * Log each step's:

       * Start/end time.
       * Inputs/outputs (or hashes).
       * Errors and retries.
   * Provide pause/resume and cancel capabilities.

3. **Rapid Attribution (CTI) Runbook**

   * Implement a sample runbook with steps:

     1. Ingest indicators (IP/domain/hash list) into the graph.
     2. Resolve related infrastructure (e.g., certificates, hosting ASNs) via existing APIs.
     3. Run a pattern-miner step to compare against known campaigns/TTPs.
     4. Generate a structured hypothesis report summarizing:

        * Likely campaign(s).
        * Evidential support (references to evidence/claims).
        * Confidence levels and residual unknowns.

4. **APIs**

   * `POST /runbooks/:id/execute` → starts an execution, returns executionId.
   * `GET /runbooks/executions/:executionId` → returns current status + logs.

5. **Tests**

   * Use mocks/stubs for external services (ingest, graph, pattern miner).
   * Verify:

     * Correct step ordering.
     * Retry behavior.
     * Logs are complete enough to replay or audit later.

Emphasize **replayability, auditability, and clear separation between runbook definitions and the runtime engine**.
```

---

## Usage Guidelines

### Getting Started

1. **Select a prompt** based on current development priorities
2. **Review dependencies** and ensure required infrastructure is in place
3. **Adapt to repo structure**: Reference existing patterns in the Summit monorepo (see [CLAUDE.md](/home/user/summit/CLAUDE.md))
4. **Feed to Claude Code**: Copy the prompt and provide additional context about your specific implementation environment

### Best Practices

- **Start with infrastructure prompts** (1-3) before building higher-level features
- **Combine prompts** where appropriate (e.g., implement #2 and #3 together for full data lineage)
- **Iterate incrementally**: Each prompt includes clear deliverables and acceptance criteria
- **Test thoroughly**: All prompts emphasize testing; don't skip this step
- **Document deviations**: If you adapt a prompt, document why in ADRs or implementation notes

### Integration with Existing Systems

These prompts are designed to integrate with:
- **Neo4j** graph database
- **PostgreSQL** for relational data
- **Kafka/Redpanda** for event streaming
- **GraphQL** API layer
- **React** frontend stack
- **TypeScript** across the board

Refer to the [ARCHITECTURE.md](../ARCHITECTURE.md) and [REPOSITORY_STRUCTURE.md](../REPOSITORY_STRUCTURE.md) for detailed information on existing patterns.

---

## Maintenance & Evolution

### Updating These Prompts

As the platform evolves, these prompts should be updated to:
- Reflect new architectural patterns
- Incorporate lessons learned from implementations
- Add new capability areas
- Remove deprecated approaches

### Tracking Implementations

When you implement a feature based on one of these prompts:
1. Create an ADR documenting key decisions
2. Link back to the prompt that guided development
3. Note any deviations or adaptations required
4. Update the prompt if you discover better approaches

### Contributing New Prompts

To add new prompts to this collection:
1. Follow the established format (Category, Complexity, Dependencies, Prompt)
2. Ensure prompts are self-contained and production-ready
3. Include clear acceptance criteria and testing requirements
4. Submit via PR with rationale for inclusion

---

## Related Documentation

- [CLAUDE.md](/home/user/summit/CLAUDE.md) - Comprehensive AI assistant guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [DEVELOPER_ONBOARDING.md](../DEVELOPER_ONBOARDING.md) - Developer setup
- [Copilot-Playbook.md](../Copilot-Playbook.md) - AI copilot usage
- [TESTING_STRATEGY.md](../TESTING_STRATEGY.md) - Testing approaches

---

## Appendix: Prompt Selection Matrix

| Priority Area | Recommended Prompts | Dependencies |
|--------------|-------------------|--------------|
| **Data Foundation** | #1, #2, #3 | None - start here |
| **Analytics Baseline** | #4, #5, #6 | Requires #2 |
| **AI Augmentation** | #7, #8 | Requires #2, #3; LLM access |
| **Governance & Compliance** | #9 | Requires #2, #3 |
| **User Experience** | #10 | Requires #2, #4, #5 |
| **Automation** | #11 | Requires #1-6 |

---

**Document Status**: ✅ Ready for Use
**Maintainer**: Engineering Team
**Review Cadence**: Quarterly or as needed
