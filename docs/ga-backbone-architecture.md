# IntelGraph GA Backbone Execution Blueprint

## High-level summary and 7th+ order implications
- Establishes eight aligned workstreams (ingestion, graph core, provenance, analytics, copilot, casework, governance, and analyst UI) to converge on a single GA release without cross-team collisions.
- Codifies contract-first boundaries (schemas, events, APIs) so parallel teams can ship independently while preserving integration guarantees and backward compatibility.
- Embeds governance, licensing, and provenance tags throughout the data lifecycle, enabling future export controls, audits, and explainability with minimal retrofits.
- Prioritizes deterministic, reproducible pipelines and explicit policy hooks to avoid emergent data drift, unauthorized joins, and compliance gaps during scale-out.
- Specifies observability and CI/CD expectations so new surface areas inherit SLO coverage, regression detection, and deployment safety rails from day one.

## Full architecture (end-to-end)
- **Ingestion spine** (`ingestion/`, `connectors/`, `contracts/ingest/`): file/HTTP/Kafka connectors feed an ingest wizard that maps source → canonical schema, performs PII classification, records license metadata, emits provenance events, and attaches license tags to payloads.
- **Graph core + ER service** (`graph-core/`, `identity/er-service/`): canonical entity/relationship model with policy labels and bitemporal attributes; schema registry with versioning; ER APIs (`/er/candidates`, `/er/merge`, `/er/split`, `/er/explain`) and change events on `graph.entity.events.v1`.
- **Provenance ledger** (`prov-ledger/`): ingests standardized evidence registration events, maintains claim/evidence links with transform chains and hashes, and exposes disclosure bundle generation plus manifest verification.
- **Analytics engine** (`analytics/`): deterministic path, community, and centrality APIs; pattern-miner plugins; risk scoring stub combining pattern hits and egonet features.
- **Copilot v1** (`copilot/`): NL→graph query generator with preview/costing, guarded execution respecting policy labels and legal basis tokens; GraphRAG retrieval with strict citations enforcement.
- **Casework & collaboration** (`case-service/`): case containers with tasks, watchlists, comments, SLA timers, disclosure requests integrating with the provenance ledger.
- **Security & governance spine** (`security-governance/`): ABAC/RBAC enforcement with OPA, warrant/authority registry, audit trail APIs, and policy simulation; dependency only on identity provider + datastore.
- **Analyst workbench UI** (`apps/web/`): tri-pane graph/timeline/map explorer, Copilot panel, command palette, and client-side telemetry emitted to observability backend.

### Cross-cutting contracts
- **Event schema**: versioned provenance events carry source, transform chain, license IDs, and timestamps, enabling ledger ingestion and downstream auditing.
- **Policy labels**: sensitivity, legal basis, origin, purpose, retention, and need-to-know attached to entities/edges and honored by all service calls.
- **Interface mocks**: each service exposes documented interfaces so peers can stub dependencies during parallel development and CI.

## Implementation guidance by workstream
1. **Connector/ingestion layer**
   - Build reusable connector interfaces with unit tests for CSV/JSON drop, HTTP pull, and Kafka stream connectors.
   - Ingest wizard accepts schema mappings, runs PII classifiers, stores license/TOS metadata, and emits provenance events with license tags.
   - Provide streaming ETL hooks (GeoIP, language detection, hash/perceptual hash, EXIF scrub, OCR) as stubs for later ML implementations.
2. **Graph core + ER**
   - Define canonical entities/relationships with bitemporal fields; implement schema registry with migrations.
   - Implement deterministic and probabilistic ER scoring with explainable features and publish change events for merges/splits.
3. **Provenance ledger**
   - Persist evidence registration events, maintain claim graphs with contradictions, and generate disclosure bundles containing manifests and hashes.
   - Supply CLI/service for manifest verification; add unit/integration tests around hashing and bundle assembly.
4. **Analytics engine**
   - Wrap graph queries for shortest/K-shortest paths, community detection, centrality metrics, and pattern-miner plugins.
   - Provide risk scoring stub that reports contributing patterns and weights for transparency.
5. **Copilot v1**
   - NL→query mapping with preview/cost estimation; guarded execution respecting policy and legal basis.
   - GraphRAG retrieval that refuses to answer when citations are absent; integration tests for denial paths.
6. **Casework & collaboration**
   - Domain models for cases, tasks, comments, and disclosure requests; immutable audit for comments/activity.
   - Integrate provenance ledger for disclosure bundles and security-governance for authorization checks.
7. **Security/governance**
   - ABAC/RBAC API (`authorize`) backed by OPA policies; warrant/authority registry binding legal basis to queries.
   - Tenant isolation and audit search APIs; tests for elevation attempts and cross-tenant leakage.
8. **Analyst UI**
   - Feature-flagged tri-pane layout, Copilot side panel, and keyboard shortcuts; read-only data access via backend APIs.
   - Client telemetry hooks for latency/error metrics with structured events forwarded to the observability pipeline.

## Testing strategy
- **Unit tests**: connector contracts, PII classification, ER scoring, provenance hashing/manifests, analytics patterns, guardrails, case SLA/legal hold logic, policy evaluation, and UI components.
- **Integration tests**: CSV → ingest mapping → license tagging; ER merges/splits on golden datasets; provenance bundle generation/verification; NL question → query generation → execution with citations; case disclosure requests; governance authorization flows; UI e2e journey exercising graph pivot + Copilot query.
- **Performance/SLO checks**: p95 latency on medium subgraphs for analytics; ingestion throughput smoke tests; policy engine decision latency; UI time-to-first-insight telemetry.
- **Security/regression gates**: audit immutability, export blocking by license class, policy denial guardrails, cross-tenant isolation, and dependency vulnerability scanning.

## Documentation expectations
- Service-specific GA guides (`docs/<service>-ga.md`) detailing APIs, schemas, acceptance tests, and event contracts.
- Architecture diagrams (Mermaid or equivalent) per service plus an end-to-end dataflow showing provenance, policy labels, and license propagation.
- README updates for quickstart, configuration, and observability hooks; change logs tracking schema and contract versions.

## CI/CD and observability
- Pipelines run lint, unit, integration, and coverage gates; build Docker/K8s artifacts per service with SBOMs and cosign.
- Ephemeral test environments per PR with seeded fixtures for graph/ingestion/provenance flows.
- Observability baseline: structured logs with correlation IDs, metrics for throughput/latency/error, traces for cross-service requests, and alerts on SLO breaches.

## PR package and readiness checklist
- Conventional commit history with scoped branches; PR body summarizing what/why/how, risks, rollback, and validation plan.
- Reviewer checklist: contracts versioned, events backward compatible, guardrails enforced, tests passing, observability hooks present, documentation updated.
- Post-merge validation: smoke ingest + graph queries, provenance bundle generation, governance authorization checks, and UI telemetry verification.

## Forward-leaning enhancements
- Add policy-aware dataflow compiler that auto-generates enforcement hooks from schema labels, reducing manual guardrail drift.
- Introduce adaptive workload routing that directs analytics queries to GPU/accelerated backends based on cost models.
- Explore typed SDK/codegen from shared contracts to eliminate interface skew across services and clients.

## Future roadmap
- Deep ML enrichments (language ID, OCR, perceptual hashing) replacing stubs with pluggable model providers.
- Predictive analytics and anomaly detection layers atop the pattern miner with explainable risk scoring.
- Collaborative copilot orchestration with session memory bounded by policy labels and per-case legal basis.
- Continuous compliance posture scoring combining governance audit trails with runtime telemetry for early warning dashboards.
