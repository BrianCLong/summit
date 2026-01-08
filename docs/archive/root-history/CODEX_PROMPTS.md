# Codex Prompt Templates

## Algorithm-Focused Prompt (Graph Traversal)

You are an expert software engineer.
Task: Implement breadth-first search (BFS) and depth-first search (DFS) for an undirected graph, returning traversal order and shortest path length between any two nodes.
Language: Python (standard library only).
Constraints:

- Represent the graph with an adjacency list.
- Validate inputs (no duplicate edges, nodes must exist before connecting).
- Include docstrings and inline comments for every public function.
- Add basic unit tests in the same file under a `__main__` guard.
  Output: A single, self-contained Python script ready to run directly.

## Real-World Integration Prompt (External API)

You are an expert software engineer.
Task: Build a service that fetches weather data from the OpenWeatherMap API and exposes a REST endpoint to return normalized forecasts (temperature, conditions, humidity).
Language: Python using FastAPI and `httpx`.
Constraints:

- Read the OpenWeatherMap API key from the environment; fail fast with a helpful error if missing.
- Cache responses for 5 minutes to avoid redundant upstream calls.
- Include proper error handling for HTTP failures and malformed responses.
- Add inline comments explaining each route and helper.
- Provide a minimal `README` section at the bottom describing how to run and test the service.
  Output: A complete FastAPI application file that can be run directly with `uvicorn`.

## IntelGraph Parallel Prompt Pack

### Overview

Eight ready-to-paste prompts that map directly to IntelGraph services. Each prompt is scoped so individual teams can work in parallel without modifying each other’s internals.

### 1) Provenance & Graph Core Service (Entities + Claims + Policy Labels)

**Prompt 1 – “Graph + Provenance Core”**

> You are a senior backend engineer team working on the IntelGraph monorepo. Your task is to deliver the **minimal GA graph core + provenance/claim ledger** as a cleanly bounded service that other teams can depend on without modifying your internals.
>
> **Scope**
>
> - Implement a `graph-core` service (language of choice: Go/TypeScript/Java, but be consistent with existing repo patterns) that exposes:
>   - A canonical **entity/relationship model**: `Person`, `Org`, `Asset`, `Account`, `Location`, `Event`, `Document`, `Communication`, `Device`, `Vehicle`, `Infrastructure`, `FinancialInstrument`, `Indicator`, `Claim`, `Case`, `Authority`, `License`, `Narrative`, `Campaign`.
>   - **Temporal & bi-temporal fields**: `validFrom/validTo`, `observedAt/recordedAt`, with snapshot-at-time query semantics.
>   - **Policy labels** on every node/edge: origin, sensitivity, clearance, legal basis, purpose, retention, license class.
>
> - Implement a **Provenance & Claim Ledger** submodule:
>   - Register every assertion with `source → transform chain → hash → confidence → license`.
>   - Track `Claim` nodes and `supports/contradicts/derivedFrom` edges.
>   - Generate an **export manifest** (hash tree + chain-of-custody) for any requested subgraph.
>
> **Interfaces**
>
> - Provide a **GraphQL + gRPC/HTTP API** layer:
>   - CRUD for entities/edges with temporal fields and policy labels.
>   - `snapshotAtTime(entityId, timestamp)` and `neighborsAtTime(entityId, timestamp, depth)` queries.
>   - `registerEvidence`, `registerClaim`, `getProvenance(entityOrClaimId)`, `exportBundle(rootIds[])`.
>
> - Do **not** depend on ingestion, analytics, copilot, or UI code. Only expose stable APIs and domain types they can use.
>
> **Non-Goals / Boundaries**
>
> - No natural-language features, no ETL, no UI.
> - No predictive models, anomaly detection, or GraphXAI here; you only provide the **truth substrate + provenance**.
>
> **Data & Storage**
>
> - Backed by a graph database or equivalent (e.g., Neo4j/JanusGraph/postgres+edge tables) with:
>   - ACID semantics for writes.
>   - Versioned schema migrations.
>
> **Testing & Standards**
>
> - Provide exhaustive **unit tests** for schema, temporal logic, and manifest generation.
> - Provide **contract tests** for all GraphQL/HTTP endpoints.
> - Provide **golden E2E tests**: ingest fixture entities/claims → run `snapshotAtTime` & `exportBundle` → verify hash manifest and provenance completeness against fixtures.
> - Follow repo linting/formatting standards; no TODOs in GA paths; no dead code.
>
> **Acceptance Criteria**
>
> - Time-travel queries return consistent neighborhoods for given timestamps.
> - Every entity/edge created in this service has attached provenance and policy labels; manifest verifier passes on all test bundles.
> - Other teams can treat this as a **black box** and build against its APIs without needing to modify its internals.

### 2) Ingestion, Connectors & Data License Registry

**Prompt 2 – “Ingest + Connectors + License Guard”**

> You are the data ingestion/ETL team for IntelGraph. Your job is to build the **Ingest Wizard, connector framework, and Data License Registry** for GA. This work must be fully usable by other teams via clear contracts and must not depend on their internal implementations.
>
> **Scope**
>
> - Implement a `connectors/` + `data-pipelines/` subsystem that supports:
>   - Batch and streaming connectors for: CSV/Parquet, HTTP pull, S3/GCS/Azure Blob, Kafka, STIX/TAXII, MISP, and at least one SIEM (e.g., Splunk/Elastic stub).
>   - A pluggable **enricher** pipeline: GeoIP, language detection, hashing, perceptual hashing for images, EXIF scrub, OCR hooks.
>
> - Implement an **Ingest Wizard & ETL Assistant API** (backend only, UI team will consume):
>   - Schema mapping suggestions (fields → canonical entities/attributes from Prompt 1’s model).
>   - PII classification and redaction presets.
>   - Minimal DPIA checklist metadata stored per data source.
>
> - Implement a **Data License Registry** service:
>   - Track source, license type, terms summary, allowed uses, expiry.
>   - Enforce license constraints at ingest and export via synchronous checks.
>
> **Interfaces**
>
> - Define clear contracts:
>   - Connector manifests (`connectorId`, capabilities, rate limits, schema sample).
>   - Mapping contracts: source schema → canonical entity/fields → policy label defaults.
>   - A simple API for graph-core: `submitIngestBatch(mappedEntities, provenanceSeed)` only; no direct DB access.
>
> **Non-Goals**
>
> - No UI rendering, no natural-language features.
> - Do not implement graph queries or analytics; defer to graph-core.
>
> **Testing & Standards**
>
> - **Unit tests** for each connector’s IO (with fixtures).
> - **Contract tests** for mapping + license checks:
>   - Attempt to ingest from a disallowed source → rejected with human-readable reason.
>   - Valid sources pass and record license metadata correctly.
>
> - **E2E ingest tests**: CSV → wizard mapping → canonical entities → POST to a mocked graph-core API; verify payloads and policy labels.
>
> **Acceptance Criteria**
>
> - A non-expert can map a CSV/JSON source into canonical entities in ≤10 minutes using only this backend API (as surfaced later by the UI team).
> - Every ingestion event is tagged with license, policy labels, and provenance seeds for graph-core to extend.
> - No direct coupling to analytics, copilot, or UI internals; all coordination via stable APIs and contracts.

### 3) Entity Resolution (ER) & Identity Service

**Prompt 3 – “ER / Identity Service”**

> You own the **Entity Resolution & Identity** layer. Your service sits on top of graph-core APIs and is consumed by ingestion, analytics, and UI — but you will **not** touch their internals.
>
> **Scope**
>
> - Implement a standalone `er-service/` with:
>   - Candidate generation (`/er/candidates`) based on blocking strategies (LSH/MinHash, phonetic keys, simple rules).
>   - Merge/split APIs: `/er/merge`, `/er/split`.
>   - Explainability: `/er/explain` returning features, similarity scores, and rationale for candidates and merges.
>   - Confidence decay over time for stale links.
>
> - Support multi-signal inputs:
>   - Names, aliases, transliterations.
>   - Geo-temporal co-occurrence.
>   - Device/browser fingerprints, crypto addresses, document signatures, perceptual hashes (no biometric ID).
>
> **Interfaces**
>
> - **Input**: entity stubs from ingestion/graph-core (via API), not raw files.
> - **Output**: resolution decisions recorded back into graph-core via its public APIs (e.g., merges with policy labels and provenance).
> - Provide an events stream (`/events/er`) for downstream analytics to subscribe to.
>
> **Controls & Governance**
>
> - Respect policy labels: never merge entities across incompatible legal bases or compartments.
> - Keep merges reversible with a complete override log (`user`, `reason`, timestamps).
>
> **Testing & Standards**
>
> - **Golden dataset tests**: reproducible merges and candidate rankings on fixture datasets; document metrics (precision/recall, ROC).
> - **Explainability tests**: verifying `/er/explain` outputs feature contributions consistent with test cases.
> - No direct DB coupling to non-graph-core storage; use its APIs.
>
> **Acceptance Criteria**
>
> - ER service can be deployed independently and tested in isolation.
> - All merges are explainable, reversible, and policy-compliant.
> - Other teams need only your APIs + events; no shared code required.

### 4) Analytics Core: Paths, Communities, Pattern Miner, Risk Scoring Skeleton

**Prompt 4 – “Analytics Core v1”**

> You own the initial **Analytics & Tradecraft Core** that operates purely on the graph-core API and ER outputs. Your mission: implement the core algorithms and clean APIs; do not build UI or AI copilot features.
>
> **Scope**
>
> - Pathfinding suite:
>   - Shortest paths, k-shortest paths.
>   - Policy-aware routes (exclude edges with certain policy labels).
>
> - Community & centrality:
>   - Louvain/Leiden community detection.
>   - Betweenness, eigenvector centrality.
>
> - Pattern miner:
>   - Temporal motifs (bursts, lulls, periodicity).
>   - Co-travel/co-presence detection based on geo-temporal data.
>
> - Anomaly/risk scoring **skeleton**:
>   - Pluggable detectors (degree anomalies, temporal spikes, selector misuse).
>   - A minimal feature store abstraction for models later.
>
> **Interfaces**
>
> - Library + microservice:
>   - Library: pure functions for paths/metrics/patterns.
>   - Service: HTTP/gRPC endpoints callable by UI and Copilot (e.g., `POST /analytics/path`, `POST /analytics/community`, `POST /analytics/patterns`, `POST /analytics/anomaly-scores`).
>
> - Use graph-core as your only data backend; no custom schema.
>
> **Testing & Standards**
>
> - **Unit tests** comparing against known small graphs with published metrics for correctness.
> - **Performance tests** to ensure p95 latency for typical queries meets SLOs (e.g., p95 < 1.5s for 3-hop 50k-node neighborhood).
> - Contract tests for all service endpoints.
>
> **Acceptance Criteria**
>
> - Analytics service can be deployed independently and scaled separately.
> - All algorithms are deterministic given same inputs (no hidden randomness without seeding).
> - Copilot and UI teams can consume your endpoints without any tight coupling or shared implementation.

### 5) AI Copilot: NL→Cypher + GraphRAG with Citations & Guardrails

**Prompt 5 – “Copilot Core (NL Query + GraphRAG)”**

> You own the **AI Copilot Core** for IntelGraph: natural-language to graph queries, and RAG over graph entities/documents with citations. You are NOT allowed to bypass provenance, licenses, or governance; you must call into existing services only.
>
> **Scope**
>
> - Implement an NL→Cypher/GraphQL generator:
>   - Given a natural-language question + context (tenant, case, time bounds, policy filters), produce:
>     - A generated Cypher/GraphQL query **preview**.
>     - Cost/row estimate (via analytics or graph-core metadata).
>
>   - Execute only after an explicit “confirm” flag from the caller.
>
> - Implement **GraphRAG**:
>   - Retrieve relevant subgraphs (entities, paths, claims) via analytics + graph-core.
>   - Hydrate evidence snippets and provenance from the Provenance & Claim ledger.
>   - Return structured answers that **must** include explicit citations (entity IDs, claim IDs, provenance manifests).
>
> - Implement **guardrails**:
>   - Enforce policy labels and license rules by calling governance APIs before executing queries or returning content.
>   - Log blocked attempts with human-readable reasons.
>
> **Interfaces**
>
> - API endpoints only (no UI): e.g., `POST /copilot/interpret`, `POST /copilot/answer`.
> - Dependencies: graph-core, analytics, ER, governance; only via their public APIs.
>
> **Testing & Standards**
>
> - **Golden prompt suite**: NL questions → expected Cypher/GraphQL queries; ≥95% syntactic validity on test set.
> - **RAG tests**: ensure every answer includes resolvable citations; test that missing citations cause controlled failure.
> - **Policy tests**: red-team prompts that should be blocked (unlawful surveillance, mass repression) must be denied with clear explanation.
>
> **Acceptance Criteria**
>
> - Copilot can be run in a sandbox environment with mocked services; all tests pass without modifying other teams’ code.
> - Every answer is auditable: we can trace from natural-language question → generated query → evidence base → citations.

### 6) Governance, AuthZ, Audit & Warrant/License Enforcement

**Prompt 6 – “Security & Governance Spine”**

> You own the **Security, Governance & Audit** spine. Your work is cross-cutting, but must be implemented as shared services and middleware — **not** as ad-hoc logic in other teams’ code.
>
> **Scope**
>
> - Implement a centralized **AuthN/AuthZ & Policy** layer:
>   - OIDC/JWKS-based SSO.
>   - ABAC/RBAC using OPA or equivalent policy engine.
>   - Step-up authentication (WebAuthn/FIDO2) for sensitive operations.
>
> - Implement **Governance services**:
>   - Warrant/Authority Registry: store legal bases and bind them to queries/actions.
>   - License/TOS Engine: evaluate license constraints from the Data License Registry before data movement.
>
> - Implement **Comprehensive Audit**:
>   - Log who did what, when, why (reason-for-access prompts).
>   - Immutable log storage; APIs for filter/search.
>
> **Interfaces**
>
> - Provide:
>   - AuthN middleware packages for services to plug in.
>   - A central `governance-service/` with endpoints: `checkAccess`, `recordAccess`, `bindAuthority`, `evaluateLicense`, `simulatePolicyChange`.
>
> - No service may need your internal DB; all usage via APIs/middleware.
>
> **Testing & Standards**
>
> - **Unit & integration tests** for policy decisions.
> - **Simulation tests**: run historical synthetic queries through candidate policy changes; verify differences are reported correctly.
> - **Abuse/STRIDE tests**: ensure insider misuse and over-broad queries trigger alerts/tripwires.
>
> **Acceptance Criteria**
>
> - Any call to graph-core, analytics, copilot, or ER can be routed through your middleware without code changes beyond configuration.
> - Policy-by-default: blocked attempts get human-readable reasons + appeal path.
> - Audit logs are queryable, immutable, and covered by tests.

### 7) Runbook / Agent Runtime + Core Runbook Library

**Prompt 7 – “Runbook Engine + 5 Production Runbooks”**

> You own the **Runbook / Agent Runtime** and the initial set of production runbooks. Your work orchestrates other services; you must NOT fork or re-implement their logic.
>
> **Scope**
>
> - Implement a `runbooks/` engine:
>   - Represent runbooks as DAGs with typed steps, inputs, outputs, and preconditions (including legal authority).
>   - Provide an execution engine with logging, replay, pause/resume, and failure handling.
>
> - Implement at least **five GA runbooks** end-to-end (using other services’ APIs):
>   - R1: Rapid Attribution (CTI).
>   - R2: Phishing Cluster Discovery (DFIR).
>   - R3: Disinformation Network Mapping.
>   - R4: AML Structuring Detection.
>   - R5: Human Rights Incident Vetting.
>
> **Interfaces**
>
> - APIs:
>   - `POST /runbooks/execute` (with runbookID, inputs, legal basis).
>   - `GET /runbooks/{executionId}` for status, logs, and outputs.
>
> - Step API integrations:
>   - Ingestion, graph-core, analytics, ER, copilot, governance — via their published endpoints only.
>
> **Testing & Standards**
>
> - **Unit tests** for the runbook engine (DAG execution, error handling, rollback).
> - **E2E tests** for each runbook using synthetic data:
>   - Validate KPIs (e.g., time-to-hypothesis, precision/recall, fully cited outputs) as defined in the wishbook.
>
> - No runbook may bypass governance; all calls must pass legal basis and license checks.
>
> **Acceptance Criteria**
>
> - Runbook engine is reusable; future runbooks can be expressed as configuration + small adapters.
> - All five runbooks run cleanly in CI against fixtures, with deterministic outputs.

### 8) Frontend Tri-Pane UI, Command Palette & XAI/Provenance Overlays

**Prompt 8 – “Analyst UI Shell v1”**

> You own the **frontend analyst experience**: tri-pane UI (graph + timeline + map), command palette, and XAI/provenance overlays. Build **only** the shell and integrations; do not re-implement backend logic.
>
> **Scope**
>
> - Implement in `apps/web/` using existing stack (React + TypeScript + Tailwind, etc.).
> - Deliver:
>   - A tri-pane layout: graph explorer, synchronized timeline, synchronized map.
>   - A global command palette for actions like “Run runbook…”, “Query copilot…”, “Open case…”.
>   - Provenance & XAI overlays:
>     - Hover/click on entities/edges shows provenance chain and policy labels.
>     - When analytics or copilot results are shown, allow user to inspect citations and evidence paths.
>
> - Accessibility & UX:
>   - Keyboard-first navigation, dark/light mode.
>   - A11y AAA where feasible; screen-reader labels; undo/redo history.
>
> **Interfaces**
>
> - Consume:
>   - Graph-core through GraphQL.
>   - Analytics service endpoints for paths/communities.
>   - Copilot endpoints for NL queries and answers with citations.
>   - Governance for policy explanations when actions are blocked.
>
> - All backend interactions go through typed client SDKs or API wrappers; no inline fetch spaghetti.
>
> **Testing & Standards**
>
> - **Component tests** for key UI components.
> - **Integration/UI tests** (e.g., Playwright) for workflows:
>   - Load case → select node on graph → see synchronized timeline/map.
>   - Ask copilot a question → preview query → run → inspect citations and provenance overlay.
>   - Attempt blocked action → see policy explanation.
>
> - Snapshot tests to avoid accidental UI regressions; follow existing ESLint/Prettier configs.
>
> **Acceptance Criteria**
>
> - An analyst can perform the basic loop “load case → explore → run copilot query → inspect evidence” entirely via this UI.
> - No direct coupling to internal logic of other teams; only API clients and typed contracts.
