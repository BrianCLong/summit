# IntelGraph GA Core Blueprint

## Section 1: GA Core Overview
- **What GA includes**
  - Data intake for CSV/TSV upload plus 3 connectors (S3-compatible object store, PostgreSQL, REST pull) with schema mapping, validation, and deduplication.
  - Canonical graph model (entities, relationships, temporal, geospatial, provenance) with versioned schema registry and policy tags.
  - Graph core services: CRUD on nodes/edges, time-aware views, geo indexing, provenance ledger writes, and audit trails.
  - Analytics essentials: link analysis (ego networks, neighborhood expansion), shortest/weighted paths, centrality basics, simple anomaly/risk scoring with explainable factors.
  - AI copilot v1: NL-to-graph-query (Cypher-ish) with guardrails, RAG responses with source citations, prompt audit logging, and red team filters.
  - Security/governance core: OIDC authN, role/attribute-based authZ, row/edge-level policy tags, immutable audit log, and data access receipts.
  - Minimal tri-pane UI: graph canvas, timeline, and map with synchronized selection, filter panels, and query history.
- **Post-GA (committed next wave)**
  - Additional connectors (Salesforce, Snowflake, Kafka live streaming, STIX/TAXII), automated entity resolution at scale, advanced ML scoring, full playbook automation, mobile client.
  - Advanced geospatial (routing, heatmaps), temporal forecasting, collaborative sessions, fine-tuned copilot per-tenant, multilingual NLQ, offline/air-gapped bundle, chaos-hardened HA.
- **Won’t build (wishbook but excluded)**
  - Offensive automation/weaponized disinfo tooling, covert surveillance modules, biometric mass-tracking, auto-deepfake generation, autonomous lethal targeting, and non-consensual data exfiltration.

## Section 2: Architecture & Services
- **Service map**
  - Ingestion Service (Node): connector runners, schema mapping, validation/dedupe, writes to landing bucket + Kafka topics.
  - Graph API Service (Node/GraphQL+REST): CRUD, query translation, policy enforcement, temporal/geo query hooks, caches.
  - Graph Engine: Neo4j/JanusGraph class DB; spatial + temporal indexing; policy-tag propagation hooks.
  - Provenance & Audit Ledger (append-only Postgres/immutability extension): records ingest lineage, query traces, copilot prompts/results, access receipts.
  - Analytics Service: pathfinding, centrality, anomaly/risk scoring; uses graph DB + feature cache; exposes jobs + sync endpoints.
  - AI Copilot Service: NLQ parser (LLM + patterns), RAG over graph summaries and docs, citation collector, safety filters, prompt store.
  - AuthN/AuthZ & Policy Service: OIDC broker, RBAC/ABAC evaluator, policy tag registry, PDP/PEP middleware shared by services.
  - UI (React): tri-pane (graph/timeline/map), query builder, ingest wizard, analytics console, copilot chat; backed by API Gateway/BFF.
  - Event Bus: Kafka/Redpanda for ingest pipelines, audit fan-out, analytics job scheduling.
  - Object Storage: S3-compatible landing + processed zones; used for uploads and bulk exports.
- **Text diagram (bounds)**
  - [UI] ─BFF/API Gateway─> [Graph API] ─┬─> [Graph DB]
                                   │        └─> [Analytics Service]
                                   │
                                   ├─> [Ingestion Service] ─Kafka─> [Graph API] / [Provenance]
                                   │
                                   ├─> [AI Copilot Service] ──> [Graph API] / [RAG Store]
                                   │
                                   └─> [Auth/Policy Service] ──> all PEPs
  - [Provenance/Audit Ledger] <─Kafka─ [All services emit events]
  - [Object Storage] <─Ingestion uploads; >─Bulk export

## Section 3: GA Backlog (Epics → stories)
### Epic A: Ingestion & Prep
1. CSV/TSV upload with size limits, checksum, and resumable UI flow.
2. S3-compatible connector (pull by path/prefix) with schema mapping wizard.
3. PostgreSQL connector (table/query import) with incremental watermarking.
4. REST pull connector with pagination and auth presets.
5. Validation pipeline: required fields, type coercion, geo/temporal parsing, and rejection reporting.
6. Deduplication rules (hash + configurable keys) before graph load.
7. Mapping to canonical entities/relationships with policy tags and provenance stamps.
8. Ingest job orchestration via Kafka with retries and dead-letter queue.
9. Landing/processed object storage separation with lifecycle policies.
10. Ingest monitoring dashboard (rates, failures, DLQ depth).

### Epic B: Canonical Model & Graph Core
11. Define canonical entity/relationship schemas with versioning and policy tags.
12. Graph CRUD APIs with RBAC/ABAC enforcement and audit hooks.
13. Temporal slices: effective_from/through filters in queries.
14. Geo indexing (lat/long) and bounding box/radius queries.
15. Provenance writes for ingest, manual edits, and analytics results.
16. Schema registry service for connectors and UI mapping reuse.
17. Bulk load path from processed zone to graph with backpressure.
18. Edge directionality + weight support with validation.

### Epic C: Analytics & Tradecraft
19. Ego network and neighborhood expansion endpoints with depth/filters.
20. Shortest/weighted path API with policy-aware traversal limits.
21. Degree/betweenness centrality batch job with result materialization.
22. Simple anomaly/risk scoring combining degree change + policy tags + thresholds with explanations.
23. Export of analytics results to provenance ledger with source graph version.
24. UI analytics console to run/save jobs and visualize outputs on graph/timeline/map.

### Epic D: AI Copilot
25. NL → graph query translation with guardrails and dry-run preview.
26. RAG index over schema docs, playbooks, and graph summaries; return citations.
27. Safety filters: PII boundary checks, prompt/response audit log, policy-tag awareness.
28. Copilot UI chat panel with query history and runnable cards.
29. Feedback loop: user rating stored in provenance for tuning.

### Epic E: Security & Governance
30. OIDC integration with session management and refresh tokens.
31. RBAC roles + ABAC attributes (policy tags) enforced in PEP middleware.
32. Immutable audit log for API, ingest, analytics, copilot actions.
33. Data access receipts and downloadable audit trails per project.
34. Policy tag registry with inheritance and conflict detection.
35. Tenant/project isolation configuration for services and storage.

### Epic F: UI Tri-Pane Experience
36. Graph canvas with selection, filter, expand, and edge highlighting.
37. Timeline view synced to selected entities/paths.
38. Map view with geo-filtering and clustering for dense nodes.
39. Cross-pane synchronization (graph/timeline/map) and query history sidebar.
40. Ingest wizard and data quality summary surfaces.
41. Analytics result overlays (paths, centrality heat, risk flags).
42. Accessibility: keyboard nav, color contrast, basic i18n scaffold.

### Epic G: Platform Operations
43. CI/CD pipeline (lint, test, build, image, deploy to k8s sandbox).
44. Observability: structured logs, metrics (ingest rate, query latency), traces via OpenTelemetry.
45. Backup/restore scripts for graph DB and provenance ledger.
46. Feature flags for connectors, copilot, and analytics jobs.
47. Security hardening: TLS termination, CORS/helmet defaults, secrets via vault/K8s secrets.

## Section 4: 90-Day Plan (6×2-week sprints)
- **Sprint 1: Foundations & Auth**
  - Themes: repo setup, CI/CD skeleton, OIDC authN, RBAC/ABAC middleware, policy tag registry baseline.
  - Deliverables: working login, JWT propagation, PEP middleware on sample endpoints, initial schema registry, CI lint/test pipeline.
  - Done: users can log in, call protected ping endpoint; CI green; policies enforced on sample graph CRUD stub.
  - Dependencies: none.

- **Sprint 2: Ingestion Core**
  - Themes: CSV upload, S3 connector, validation/dedupe, ingest orchestration via Kafka.
  - Deliverables: UI ingest wizard, backend ingest jobs to landing/processed zones, DLQ handling, ingest metrics.
  - Done: upload & ingest a CSV → mapped canonical entities/edges persisted with provenance; DLQ visible in dashboard.
  - Dependencies: auth/PEP from Sprint 1.

- **Sprint 3: Graph Core & Model**
  - Themes: canonical schema v1, graph CRUD/query APIs, temporal/geo support, bulk load path.
  - Deliverables: versioned schemas, effective_from/through filters, geo bounding queries, policy-tag aware CRUD with audit.
  - Done: ingest outputs load into graph; CRUD + queries return authorized results; provenance recorded.
  - Dependencies: ingest pipeline artifacts.

- **Sprint 4: Analytics Essentials**
  - Themes: link analysis, shortest/weighted paths, centrality batch, simple anomaly/risk scoring.
  - Deliverables: APIs + UI console to run analytics and visualize overlays; results written to provenance.
  - Done: operators run path/centrality/risk jobs on sample graph; outputs visible on graph/timeline/map.
  - Dependencies: graph core from Sprint 3.

- **Sprint 5: AI Copilot v1**
  - Themes: NLQ translation, RAG with citations, safety filters, copilot UI.
  - Deliverables: chat panel, dry-run preview of generated queries, citation-bearing responses, prompt/audit logging.
  - Done: user asks NL question → previewed query → executed with results + citations; audit entry stored; safety filters block PII/forbidden scopes.
  - Dependencies: Graph API, provenance ledger, policy tags.

- **Sprint 6: Hardening & UX Polish**
  - Themes: observability, backup/restore, feature flags, accessibility, performance tuning, GA readiness.
  - Deliverables: dashboards/alerts, backup runbook, accessibility fixes, security hardening, load test baseline, GA checklist.
  - Done: alert thresholds configured; restore drill succeeds; A11y checks pass; GA checklist signed; release candidate deployed to k8s sandbox.
  - Dependencies: prior functionality complete.

## Section 5: Tradeoffs
- **Deferred (10+ items from wishbooks)**: Salesforce/Snowflake connectors; Kafka live streaming ingest; STIX/TAXII threat feeds; advanced entity resolution ML; automated playbooks/orchestration; multilingual NLQ; geospatial routing/heatmaps; temporal forecasting; collaborative multi-user sessions; offline/air-gapped bundle; chaos/HA gameday automation; mobile client; fine-tuned tenant LLMs.
- **Non-negotiable for GA (differentiators)**: End-to-end provenance with auditability; policy-tag aware authZ (explainable governance); graph-native analytics (pathfinding + centrality with overlays); AI copilot with citations and guardrails; tri-pane (graph/timeline/map) synchronized exploration.

## Section 6: Forward-Leaning Enhancements (post-GA candidates)
- Adaptive entity resolution using graph embeddings for dedupe/merge suggestions.
- Continuous graph changefeed to feature store for online ML risk scoring.
- Declarative policy-as-code (OPA/Rego) with simulation mode for connectors and analytics jobs.
