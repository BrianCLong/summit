Below is a full-throated audit, strategic roadmap, and detailed PRD sketch for MVP‑2 and GA (General Availability). Use this as a working “north star canvas” — we’ll refine and prune features based on risk, cost, and time.

I’ll assume the code you linked (BrianCLong/summit, aka “IntelGraph / Summit”) is your current baseline. Let me know if you prefer a different branch or snapshot.

1. Current State — Where We Are

From inspecting the repo and README, here’s my evaluation of what functions, architecture, and risks exist. This is the “as built / current” baseline.

1.1 Feature Baseline (MVP‑0 / MVP‑1 status)

According to the README:

Core platform (MVP‑0) is “complete” — authentication, graph analytics, investigation workflow, ingestion, basic UI.
GitHub

MVP‑1 (advanced capabilities) is “complete” — AI/ML extraction, computer vision, speech, vector search, cross-modal, observability, performance, security hardening.
GitHub

The stack is modern: React frontend (with Material-UI, Cytoscape.js), backend Node.js + GraphQL, databases (Neo4j, PostgreSQL with pgvector, TimescaleDB), Redis, Docker, observability, etc.
GitHub

Thus, the codebase already has many advanced features. But “complete” in open source / early stage often means “proof-of-concept / feature skeleton,” not hardened production-grade across all use cases. There are always gaps in scaling, security, usability, UX, integration, performance.

1.2 Architectural Strengths & Weaknesses

Strengths:

Clean modular architecture: separating client / server / data / AI pipelines.

Deployable-first mantra: golden path, smoke tests, multi-environment support.

Use of proper databases (graph + relational + time-series) giving flexibility.

Observability stack included (OpenTelemetry, Prometheus, Grafana).

Use of RBAC, OPA, audit logging, security posture built in.

AI/ML capabilities baked in, not as “future.”

Real-time collaboration, WebSocket integration.

Risks / Gaps:

Scalability and performance at scale

Graph DB scaling is notoriously hard (sharding, memory, query planning).

Neo4j community edition may not support cluster mode; enterprises may demand high availability and sharding.

Vector search / embedding store: pgvector is good, but performance / scale (annoy, FAISS, or specialized vector db) may be needed.

Data ingestion pipelines & ETL robustness

Handling large volumes, streaming, data normalization, schema conflicts, deduplication, error recovery.

Schema evolution, incremental updates, backfills.

Security, isolation, multi-tenancy

Tenant isolation (if you go SaaS).

Encryption, secure key management, secrets, never trusting data sources.

Hardening AI modules (adversarial inputs, poisoning).

Logging, alerting, audit trail completeness across AI.

User experience flows & UI polish

The “golden demo” path might be smooth, but edge cases, error states, responsiveness, latency under load may be rough.

Mobile / low-bandwidth clients, offline or degraded modes.

Integration with external systems & APIs

Connectors to external data sources (intelligence sources, OSINT, APIs, DEX, threat intel feeds).

Plugin / extension support for domain-specific modules.

Governance, explainability, AI trust & feedback loops

Users will demand confidence scores, “why?” behind AI suggestions.

Ability to override, annotate, correct, trace decisions.

Operational resilience & infrastructure

Backup / restore, disaster recovery, failover.

Monitoring, alerting, SLO/SLI on user-facing metrics.

Upgradability / migrations.

Business / product risks

Differentiation vs competitors.

Getting to “sticky” usage, compelling ROI.

Data network effects: more data = stronger models; early users may see less utility.

2. Strategic Destination — What “Winning” Looks Like (GA Vision)

Before specifying MVP‑2, we must agree on the north star. Here’s a candidate:

IntelGraph / Summit GA Vision (18–24 mo):
A decision intelligence platform for intelligence, security, law enforcement, defense, and commercial due diligence: ingest multi-modal data at scale, represent it in a rich knowledge graph, layer AI/ML inference, provide real-time collaboration and narrative generation, and plug into downstream action (reports, alerts, ops). It earns its keep when an analyst or decision-maker can discover non-obvious links, get hypotheses, validate leads, and act.

Key GA differentiators must include:

Enterprise-grade scale (10M+ nodes, petabyte-level content)

High throughput ingestion (streams, batch)

Strong connectors (APIs, OSINT, internal systems, threat intel)

Explainable AI + feedback loops

Multi-tenant SaaS or on-prem options

Performance / latency under load

Extensibility / plugin architecture

Compliance, audit, security assurance (FedRAMP, etc.)

UX that hides complexity, focusing users on insights

Workflow integration (alerts, triggers, tickets, persistence)

From your vantage, “winning” means getting into real programs (government / enterprise), having defenders and analysts adopt and depend on it, and building moats via data, models, connectors, and community.

3. Product Roadmap: MVP‑2 and GA

Below is a suggested phased roadmap, with scope, specs, and priorities.

Phase Objective / Target Users Scope (What we will build) Non-goals / Out-of-scope Key Risks / Mitigations
MVP‑2 From proof-of-concept to early pilot readiness Build the bridging features required to support pilot adoption in real users, integrate with at least one live external data source, mid-scale load, basic explainability Not full enterprise scale, not highly optimized AI, not rich plugin marketplace Over-scoping, integration complexity, data quality
GA Production-ready, scalable, extensible platform Hardened architecture, multi-tenant support, full connectors, performance at scale, governance / compliance, full AI explain, plugin support Exotic domain-specific modules, extremely custom one-off features Resource/time, unknown scale behavior, security audits

I’ll now break down the PRD for MVP‑2, then vision-level spec for GA.

4. PRD: MVP‑2
   4.1 Goals (OKRs)

O1: Deploy the system end-to-end into a pilot (customer / user) environment, ingesting a non-trivial real-world dataset, enabling real users to create investigations, view AI-suggested relations, and collaborate.

O2: Demonstrate measurable insight generation (e.g. users find new links they wouldn’t have) with explainability.

O3: Establish performance and stability baseline (e.g. 1M nodes ingest, 100 concurrent users)

O4: Build extension hooks and connector architecture.

O5: Harden security, monitoring, and audit for pilot operations.

4.2 Success Metrics / KPIs

Ingest throughput: ≥ 100K entities / hour

Graph size: 1M+ nodes, 5M+ edges

Query latency: 95th percentile < 300ms for common queries

AI suggestions acceptance: ≥ 20% of AI-suggested edges used / validated

Uptime / error rate: > 99.5% uptime, < 1% error rate under load

User satisfaction / qualitative feedback (pilot)

New insights discovered by pilot users (qualitative)

4.3 Key User Personas & Journeys

Analyst / Investigator: wants to upload a dataset (CSV, JSON, maybe stream), visualize relationships, get AI-suggested connections, iterate, add metadata, export, produce a product (report or output).

Supervisor / Reviewer: wants audit logs, review AI-generated suggestions, override / annotate, approve.

Integrator / Admin: wants to connect external data sources, configure feature flags, observe system health.

Core user flows (for MVP‑2):

Upload or connect to a real data source (e.g. threat intel feed, CSV, API)

Automated entity extraction + deduplication

Graph population: nodes, edges, attributes

Visual graph exploration: search, filters, expand nodes, path queries

AI-suggested new edges or attributes, with explanation (confidence, rationale)

Accept / reject / edit AI suggestions

Collaboration: multiple users working, presence awareness, versioning

Export / report (CSV, GraphML, JSON)

Audit / activity log

Admin: health dashboard, metrics, system logs

4.4 MVP‑2 Feature Specifications

Below I break features into Must-have, Should-have, Nice-to-have (for MVP‑2).

Must-have Features

Connector framework & first external connector
 - Define interface / plugin spec for connectors (pull, push, streaming).
 - Provide one working connector (e.g. OSINT feed, or a REST API ingest).
 - Support incremental updates, error handling, reconciliation.

Robust ingestion pipeline
 - Modular ingestion (batch + streaming).
 - Deduplication / normalization logic (entity matching).
 - Schema versioning and transformation rules.
 - Error recovery / retries / DLQ (dead-letter queue).

Explainable AI suggestions
 - When AI proposes a new edge or attribute, provide:
 • Confidence score
 • Feature contributions / rationale (e.g. shared keywords, co-occurrence, embedding similarity)
 • Trace back to original source data
 - UI overlay: show suggestion, allow user to accept / reject / modify.

Performance & caching optimizations
 - Query caching, result caching, precomputations (shortest paths, centralities).
 - Pagination, lazy loading, viewports.
 - Indexing vector / embedding store with approximate nearest neighbor (ANN) support (if pgvector insufficient).

Security & multi-user collaboration
 - Role-based access: e.g. Investigator, Reviewer, Admin.
 - Isolation: ensure one user’s data doesn’t bleed to others in shared pilot context.
 - Audit logging of all actions (entity creation, edits, accept / reject AI).
 - WebSocket / real-time collaboration locking / presence.

Admin / instrumentation
 - Health endpoints, metrics (latency, errors, throughput).
 - Monitoring dashboards (Grafana, Prometheus).
 - Alerts (error rates, resource utilization).
 - Logging infrastructure with correlation IDs, ability to trace a user’s request across subsystems.

Export / reporting
 - Export graph (GraphML, JSON, CSV).
 - Possibly template-based reporting (basic).

User onboarding / UX polish
 - Guided onboarding / walkthrough of golden path.
 - Error handling UI, empty states, help text.
 - Basic responsiveness (desktop / large tablets).

Should-have Features (if schedule allows)

Advanced vector search / semantic search
 - Query by natural language, return relevant entities / edges.
 - Semantic ranking / similarity search.

Temporal relationships & time-series integration
 - Time-based filters / timeline view.

Annotations / comments
 - Users can annotate nodes / edges, attach notes, tag.

Versioning / snapshots
 - Ability to snapshot graph at times, compare versions, roll back.

Conflict resolution / merge UI
 - For duplicates or conflicting properties, help user merge or resolve.

Basic user preferences / settings dashboard
 - Theme, notification settings, default filters.

Nice-to-have Features (stretch)

Mobile / responsive layouts

Plugin marketplace / user extensions

Advanced layout algorithms / clustering visuals

Alerts / triggers on graph changes

Graph query language UI (e.g. Cypher editor)

Role-based views / dashboards templates

4.5 Technical Spec Highlights (Interfaces, Data Models, APIs)
Data / Schema Considerations

Entity / Node model
 - id (UUID)
 - types (list or taxonomy)
 - properties (JSON / typed fields)
 - creation / update timestamps
 - provenance (which connector / ingestion)
 - version / revision metadata

Relationship / Edge model
 - id
 - from / to entity IDs
 - type / relation label (e.g. “knows”, “transacted_with”)
 - properties (JSON / typed)
 - confidence / score / weight
 - provenance / justification

Metadata / Audit model
 - Log table (user, action, timestamp, before / after state)
 - Versioning table (history)
 - Connector metadata (last-pulled, errors)

Embedding / vector model
 - Each entity (or text) may have embedding vectors
 - Store in indexable store (pgvector, or external ANN)
 - Mapping from embeddings to entity IDs

Time-series / event model
 - If ingesting temporal events (observations), they can be tied to entities / edges.

API / GraphQL endpoints (additions / enhancements)

Mutation: ingestConnectorData(connectorId, dataBatch)

Query: explainSuggestion(suggestionId): Explanation

Mutation: applySuggestion(suggestionId, accept: Boolean)

Query: getEntityWithNeighbors(id, depth, filters)

Query: semanticSearch(query: String, limit: Int)

Query: getHealthMetrics(), getSystemStatus()

Mutation: createConnector(config), listConnectors()

Mutation: rollbackGraphSnapshot(snapshotId)

Subscription: onEntityUpdate, onSuggestionCreated

UI / Frontend

Dashboard with ingestion / connector status

Connector setup wizard

Ingestion status / progress bar / error display

Graph explorer panel: search, filters, expand / collapse

Suggestion overlay: UI card on node/edge with confidence, detail, accept / reject

Collaboration sidebar: list of users, notes, comments

Export UI

Admin console: monitoring, logs, settings

Non-functional / Infrastructure

Containerized services (Docker)

Horizontal scaling (stateless services)

Job queue / worker pool (for ingestion, AI tasks)

Rate limiting, backpressure, flow control

Circuit breakers, retry logic

Persistent storage, backup, restore

Secrets / key management

TLS / encryption

Continuous integration / deployment, smoke tests

4.6 Release Plan & Phasing

Scaffold connector framework & simple connector

Build ingestion pipeline (batch + incremental)

Add explainable AI suggestion system (basic)

UI integration for suggestions, accept / reject

Performance optimizations, caching, index tuning

Admin / monitoring features

Pilot onboarding, bug fixes, feedback

Hardening, performance testing and tuning

Pilot release

Time estimate: 3–4 sprints (6–8 weeks) of core dev + 1 sprint for polish / pilot.

4.7 Risks & Mitigations (MVP‑2)

Connector complexity: external data sources may have unexpected schemas → mitigate by starting with a controlled example and building schema-mapping tools.

Graph blow-up / combinatorial explosion: suggestions might generate many edges, inundating users → cap suggestions, heuristics, filtering.

Latency under load → profiling, caching, query optimization.

AI model quality / hallucination → conservative thresholds, confidence cutoffs, human-in-the-loop validation.

User confusion / UI overload → early user testing, minimalism in suggestion UI.

Security / data leaks → strict RBAC layering, encryption, audits.

5. Vision Spec: GA / Full Product

Once MVP‑2 proves viability, the path to GA entails scaling, extensibility, compliance, and ecosystem.

5.1 Major GA Capabilities

Clustered / distributed graph store / scalable graph DB
 - Use Enterprise Neo4j or scale-out graph DB (JanusGraph, DGraph, TigerGraph) if needed.
 - Support sharding, replication, high availability.

Dedicated vector / embedding search engine
 - Integrate with FAISS, Milvus, Pinecone, or similar to support large-scale ANN.
 - Hybrid indexing (graph + vector + full-text).

Full connector library / marketplace
 - Connectors for OSINT, commercial data providers, internal APIs, file systems, SIEMs, gov intel feeds (e.g. STIX/TAXII, etc.).
 - Streaming connectors (Kafka, PubSub).

Plugin / extension framework
 - Domain modules (finance fraud, CI, supply chain, etc.).
 - Scripting / custom logic hooks.

Governance / compliance / trust
 - Policy engine (more advanced OPA use, dynamic rules).
 - Explainability, model versioning, audit trails.
 - Satisfy compliance (e.g. FedRAMP, FISMA, ISO27001).
 - Data partitioning (tenant isolation), role-based views, cross-tenant data sharing with controls.

Alerting / trigger engine
 - Users can define conditions or patterns to trigger alerts or workflows (e.g. “if new relation emerges between high-risk entity and target, notify”).
 - Integration to downstream systems (tickets, email, Slack, workflow tools).

Advanced UI / UX
 - Story / narrative generation: synthesize pathways and explanations into natural-language reports.
 - Timeline / temporal view, map / geospatial overlays.
 - Collaboration features: chat, version diff, branching.
 - Visual customization / themes / dashboards.

SLA / scaling / ops
 - Multi-region, auto-scaling, failover, blue-green deploys.
 - Backup / restore, disaster recovery.
 - Observability: full SLO / SLA definitions, synthetic testing, alerting.
 - Log retention, data archiving policies.

5.2 GA Non-functional Targets

Handle 10s of millions of nodes, 100+ million edges

Ingest hundreds of thousands of entities per hour (stream + batch)

Support 500+ concurrent users with responsive UI

99.9% uptime SLA

Query latencies: 95th percentile < 200ms for typical queries

Audit trails per user, per action, with traceability

Certified compliance (as needed)

5.3 Roadmap Milestones (GA path)

Scale-up core database and indexing.

Expand connector library.

Build plugin / extension model.

Add alerting / workflow engine.

Harden infrastructure, ops, resilience.

Perform security audits, penetration testing, compliance reviews.

Beta with early adopters, collect feedback.

Polish UX, performance tuning, edge-case handling.

Official GA launch and commercial deployment.

6. Strategic Imperatives & Moats (From My Vantage)

To make Summit / IntelGraph defensible and compelling, you should lean into these:

Data lock-in / network effects

The more users / organizations ingest their proprietary data, the more the system becomes central.

Build safe sharing / federated graph capabilities that let clients share across orgs under controlled policies.

Model & inference differentiation

Leverage domain-specific models (e.g. for intel, cybersecurity) and let users fine-tune or attach their own models.

Hybrid reasoning: combining symbolic graph logic + ML.

Connector ecosystem as barrier to entry

The more external sources your platform supports, especially high-value feeds, the harder it is for a competitor to bootstrap.

Explainability + trust + human-in-loop

Analysts will reject “black box.” You must provide transparency, override paths, feedback loops, model auditing.

Composable / extensible architecture

Let clients build modules; you become the substrate, not the monolith.

Operational excellence & security certification

Government / intelligence clients demand high assurance. Invest in audits, compliance early.

Community / domain sharing

Encourage sharing (within guardrails) of modules, connectors, graph patterns, inference rules among trusted users.

7. Full Spec (“Canvas”) in Markdown

Below is a skeleton of your product spec / roadmap in Markdown you can drop into your planning artifacts:

# Summit / IntelGraph — Strategic Spec & Roadmap

## 1. Current State (Baseline)

- Core features: authentication, investigation workflows, entity/relationship CRUD, ingestion, graph viz
- AI modules: extraction, vision, speech, embeddings (prototype-level)
- Stack: React, GraphQL, Neo4j, PostgreSQL, TimescaleDB, Redis
- Observability and security scaffolding

## 2. Vision / GA Ambition

A decision intelligence platform for complex investigations and analysis, enabling ingest, inference, collaboration, and action.  
Key pillars:

- Scale & performance
- Connector ecosystem
- Explainable AI + trust
- Extensibility / plugin framework
- Governance / compliance
- UX / narrative generation
- Resilient operations

## 3. MVP‑2: Bridge to Pilot Readiness

### 3.1 Objectives & Metrics

| Objective                       | Metric             |
| ------------------------------- | ------------------ |
| Ingest non-trivial real dataset | ≥ 100K entities/hr |
| Graph scale                     | 1M+ nodes          |
| Latency                         | 95th < 300ms       |
| AI suggestions adoption         | ≥ 20%              |
| Stability / uptime              | > 99.5%            |

### 3.2 Personas & Flows

- Analyst / Investigator
- Reviewer / Supervisor
- Admin / Integrator

Flows: connect data, ingest, graph build, suggest, accept/reject, collaborate, export, admin console.

### 3.3 Feature Scope

**Must-have**

- Connector framework + 1 connector
- Ingestion pipeline with dedupe, normalization
- Explainable AI suggestions
- UI integration for suggestions
- Performance optimizations & caching
- RBAC, audit logs, collaboration
- Admin / instrumentation
- Export / reporting
- Onboarding / UX polish

**Should-have**

- Semantic / vector search
- Temporal / timeline views
- Annotations / comments
- Versioning / snapshot
- Conflict resolution UI

**Nice-to-have**

- Mobile / responsiveness
- Plugin marketplace
- Alerts / triggers
- Graph query editor

### 3.4 Technical Interfaces & Data Models

- Entity / Relationship / Audit tables
- Embedding storage & indexing
- GraphQL endpoints: ingest, explain, apply, search, health, connector config
- Frontend UI: dashboards, connector wizard, graph explorer, suggestion cards, collaboration UI, admin console
- Infrastructure: containerization, worker queues, rate limiting, retries

### 3.5 Release Plan & Phases

1. Scaffold connector
2. Ingestion pipeline
3. Suggestion system
4. UI integration + collaboration
5. Perf tuning / caching
6. Admin features
7. Pilot release & feedback
8. Hardening & tuning

Estimated duration: ~3–4 sprints + 1 for polish.

### 3.6 Risks & Mitigations

- Connector variability → start small, build mapping tools
- Graph blow-up → cap suggestions, heuristics
- Latency under load → profiling & caching
- AI errors → conservative thresholds, human-in-loop
- UX overload → early testing
- Security leaks → RBAC, encryption, audit

## 4. GA / Full Product Spec

### 4.1 GA Features

- Scalable / distributed graph backend
- Dedicated ANN / embedding engine
- Full connector library (OSINT, APIs, internal systems)
- Plugin / extension system
- Governance, compliance, explainability, audit
- Alerting / triggers / workflow engine
- Narrative / natural‐language synthesis
- Advanced UI (maps, timelines, dashboards)
- Multi-tenant / SaaS / on-prem options
- Ops: auto-scaling, DR, backup/restore, SLOs

### 4.2 Non-functional Targets

- 10M+ nodes, 100M+ edges
- 500+ concurrent users
- Query latency 95th < 200ms
- SLA: 99.9% uptime
- Auditability per user action
- Certified security / compliance

### 4.3 Milestones to GA

1. Scale DB & indexing
2. Expand connectors
3. Build plugin framework
4. Alerting & workflow engine
5. Harden ops & security
6. Beta with early adopters
7. UX polish & tuning
8. GA launch

## 5. Strategic Moats & Imperatives

- Data lock-in & network effects
- Domain-tuned inference models
- Rich connector ecosystem
- Explainability & trust
- Extensible / modular substrate architecture
- Operational excellence, audits, compliance
- Developer / user community, shared modules

## 6. Risks, Unknowns & Open Questions

- What is the “killer connector” that will win clients?
- How to scale graph + vector indexes economically?
- What is acceptable latency / throughput for target clients?
- How to certify / audit AI for trust?
- What pricing / commercial model will support adoption?
- What domains (finance, supply chain, defense) to seed first?

You can paste and adapt that markdown into your planning docs, product board, Confluence, whatever.

8. What I Need from You to Refine

The target customers / verticals you want first (gov, defense, commercial, open source).

Data sources you expect (volume, modality).

Performance expectations (latency, throughput).

Any must-have connectors (e.g. threat intel, open gov, social networks).

Timeline target for pilot / GA.

Team bandwidth / constraints.

Once you give me those, I’ll sharpen priorities and produce a trimmed roadmap, dependency graph, and sprint-level plan.

You said:
https://github.com/BrianCLong/summit

Just flipped public. Dig into where we are and where we need to be. Provide full specs, PRD for MVP-2 and GA based on where we are, what we need, and where we're going, 360 degrees, particularly from your vantage, in markdown on canvas
The Star Chamber said:
Thought

Here’s the end-to-end product canvas for Summit / IntelGraph—where you are now, what’s missing, and what MVP-2 and GA must ship. I’m grounding the “current” snapshot in your repo’s README and structure so this is actionable, not aspirational. Citations point to the relevant sections of your public repo.

Summit / IntelGraph — 360° Product Canvas 0) Executive Thrust

Summit is already a deployable, AI-augmented intel/graph platform: React client, GraphQL/Apollo backend, Neo4j + Postgres(+pgvector) + Timescale, Redis, Dockerized, with observability and an AI extraction stack (OCR, YOLO, Whisper, spaCy, embeddings), plus investigation workflow and real-time collab. That’s a strong MVP-1 baseline.
GitHub

MVP-2 should convert this from “powerful demo” to “pilot-grade system” with: connector framework + 1–2 battle-tested connectors, explainable suggestions, ingestion robustness, RBAC+OPA guardrails, caching and perf targets, admin/ops tooling, and export/reporting. GA then layers scale (HA graph + dedicated ANN), multi-tenant isolation, plugin/extension model, workflow/alerting, governance/compliance, and SLO-driven ops.

1. Where We Are (Evidence-based Baseline)

Golden-path & startup: quickstart via Docker/Compose; local endpoints (client 3000, GraphQL 4000, Neo4j 7474). “Deployable-first” mantra with make up, make smoke.
GitHub

Features shipped (per README):

Core: AuthN/AuthZ (JWT, RBAC, OPA), rate-limiting; investigation workflow; CSV & STIX/TAXII ingest; Graph viz (Cytoscape), real-time collab; vector search; observability (OTel, Prometheus, Grafana); security hardening (persisted queries, tenant isolation).
GitHub

AI: OCR, object detection, face recon, Whisper STT, spaCy NLP, sentence-transformers, cross-modal search.
GitHub

Stack: React 18 + MUI + Redux; Node 20 TS + Apollo Server; Neo4j 5 CE; Postgres 16 + pgvector; TimescaleDB 2; Redis 7; Socket.io.
GitHub

API surface: GraphQL core entities/relationships/investigations; REST for health, upload/export; Socket.io events.
GitHub

Ops: health endpoints, Prom/Grafana/Alertmanager, ZAP security testing, CI on GitHub Actions.
GitHub

Gaps (inferred from README + typical maturity curve):

Production scale: Neo4j CE lacks clustering/HA; ANN via pgvector is fine to start, not ideal at 10M+ entities. (README lists CE; no HA guide in docs.)
GitHub

Connectors: README mentions CSV + STIX/TAXII + “external federation” but lacks a modular connector SDK, versioned mappings, DLQ/retry semantics, and catalog.
GitHub

Explainability: Vector/AI features exist, but no explicit UX/API for “why this edge/suggestion?” with provenance. (Schema shows props/confidence isn’t explicit.)
GitHub

Admin/tenancy: OPA + tenant isolation noted, but tenant lifecycle, scoped search, per-tenant quotas/backups aren’t spelled out.
GitHub

Workflow/alerting: Monitoring exists; user-level alerting/rules engine not yet documented.
GitHub

Docs: Lots of README detail; deeper “operational runbooks,” incident/DR, and migration playbooks need hardening (your tree suggests some, but GA will need formalization).

2. Product Strategy
   2.1 Target Users

Intel analysts, CTI analysts, case officers, due-diligence teams, fraud/risk investigators.

Admins/Integrators operating hybrid/on-prem secure deployments.

2.2 Positioning

A decision-intelligence substrate: ingest multi-modal data → represent as knowledge graph → reason with XAI → collaborate → trigger actions (reports/alerts/workflows). Distinguish on deployability, explainability, and connector ecosystem—not just shiny models.

2.3 Moat Levers

Connector density + data gravity (curated OSINT/commercial/gov feeds, STIX/TAXII, social, case mgmt, SIEM, ticketing).

Hybrid reasoning (graph + vector + rules + LLM tools) with explanations.

Governance (OPA policies, lineage/provenance, audit).

Ops excellence (SLOs, HA, DR) for classified/regulated buyers.

3. MVP-2 PRD (Pilot-grade)
   3.1 Objectives / KRs

Pilot-ready ingest: Connector SDK + 1–2 first-class connectors (e.g., TAXII source + one commercial/API) with mapping, retries, DLQ.

Explainable suggestions: Human-in-the-loop edge/attribute proposals with confidence, features, and provenance.

Scale targets: 1M nodes / 5M edges; P95 query < 300 ms for common traversals; ≥100 concurrent users.

Security/ops: RBAC+OPA enforced, per-tenant scoping; audit trail completeness; baseline SLI dashboards and alerts.

Usability: Guided onboarding, error/empty states; export/reporting (CSV/JSON/GraphML).

3.2 Non-Goals (MVP-2)

HA clustering for graph; multi-region DR; plugin marketplace; full policy editor UI; formal certifications.

3.3 Users & Core Flows

Connect & Ingest → schema map → dedupe/normalize → DLQ review → graph populate

Explore & Ask → search (keyword/semantic), expand, path-find, time filters

Review Suggestions → accept/reject with explanation; annotate

Collaborate → real-time presence, comments, versions

Export/Report → datasets/graphML → share with stakeholders

Admin → health, ingestion status, tenant management, audit trail

3.4 Functional Requirements

A. Connector Framework (must-have)

SDK: Node/TS interface for pull/push/stream; lifecycle hooks (discover, fetch, transform, upsert, reconcile).

Mappings: Versioned schema mapping (JSONata / declarative maps) → entity/edge types.

Resilience: Batching, backoff, idempotency, watermarking; DLQ w/ re-process.

Ops: Connector registry, status page, last-seen cursors, per-connector metrics/logs.

Deliver: 2 connectors (e.g., STIX/TAXII v2.1 harden + one API OSINT feed).

B. Ingestion & Entity Resolution

Dedupe: Deterministic + similarity ER (thresholds; review queue).

Provenance: Source, timestamp, hash; lineage to original raw doc.

Schema: Versioned entity/edge definitions; migrations.

C. Explainable Suggestions (Graph-XAI)

Generators: Candidate edges via co-occurrence, path motifs, embedding similarity, rule patterns.

Explanations: Confidence, top features (e.g., term overlap, mutual neighbors, embed sim), provenance hops.

HITL UX: Inline cards on nodes/edges; accept/reject/edit; activity log and feedback loop to recalibrate.

D. Search & Perf

Hybrid search: keyword (Postgres/PG Trgm) + vector (pgvector or optional ANN) + graph filters.

Caching: Redis query/result cache, pre-computed centralities/paths for hot subgraphs.

Targets: P95 < 300 ms; warm caches; pagination + viewport LOD (front-end). (You already employ LOD/viewport perf in README; formalize SLOs.)
GitHub

E. Security / Multi-User / Audit

RBAC + OPA enforced at resolvers; tenant scoping across DBs; persisted GraphQL queries. (Baseline present.)
GitHub

Audit: Every mutation w/ actor, before/after; exportable audit report.

Secrets: Centralized env/secret mgmt; rotation playbook.

F. Admin & Observability

Dashboards: Ingestion throughput, queue backlog, error classes, graph growth, query latency; alerts for SLO breaches. (Monitoring stack exists; wire the product metrics.)
GitHub

Tenants: Tenant CRUD, quotas, usage metering.

G. Export/Reporting

Data export: CSV/JSON/GraphML (REST already lists endpoints; ensure parity + tests).
GitHub

Report template: Minimal HTML/PDF via server-side template for an investigation summary.

H. UX Polish

Onboarding: Guided tour across Golden Path (investigation → entities → relationships → copilot → results).
GitHub

Errors/empty: Friendly states; retry; DLQ management UI.

3.5 Non-Functional Requirements

Reliability: >99.5% monthly uptime (single-site), graceful restarts, zero-data-loss on ingestion (DLQ).

Security: JWT rotation, OPA policies required; CSP/Helmet; CSRF; ZAP scan gate in CI (you already reference ZAP; make it a blocking check with baseline).
GitHub

Performance: P95 latency <300 ms common queries; ingestion ≥100k entities/hr.

Privacy: PII scrubbing in logs (README notes anonymization; verify end-to-end).
GitHub

3.6 Technical Spec (delta from current)

Data Models (augment existing GraphQL types):

Suggestion { id, entityIds[], relation?, conf:Float, rationale:[Feature], provenance:[SourceRef], createdBy:model, createdAt }

SourceRef { connectorId, sourceDocId, offsets?, hash }

Entity.props add lineage field for source mapping; confidence optional on Relationship.

GraphQL (new/expanded):

query suggestions(investigationId, filters): [Suggestion]

mutation applySuggestion(id, accept:Boolean, edits:Patch) → writes edge/props, persists rationale → audit log

query connectors(): [ConnectorStatus], mutation runConnector(id, mode)

query explainEdge(id): Explanation (derives features & paths)

Backend services:

Ingestion workers (BullMQ or equivalent) with backpressure and retry; ER service with pluggable matchers; XAI service generating suggestions & explanations.

Frontend:

Connector wizard, Ingestion console, Suggestions overlay in graph explorer, DLQ review, Audit viewer, Admin dash (Grafana linkouts + product metrics).

3.7 Validation & Launch

Perf tests (Artillery), Sec tests (ZAP), Soak tests (24–48h). (These test modes are already mentioned; make pass/fail gates explicit.)
GitHub

Pilot with real data, success criteria: ≥20% accepted suggestions; 3+ novel insights; SLO adherence.

4. GA PRD (Production-grade, extensible)
   4.1 Objectives

Enterprise scale, HA, and governance; plugin platform; alerting/workflows; multi-tenant SaaS and on-prem parity; formal SLOs; compliance readiness.

4.2 Functional Scope

A. Scale & Storage

Graph HA: Neo4j Enterprise cluster or alternative distributed graph (TigerGraph/JanusGraph) behind an abstraction layer.

Vector ANN: Dedicated engine (Milvus/FAISS/Pinecone) + HNSW/IVF; hybrid search (BM25 + ANN + graph).

Cold storage & archival: tiered storage; snapshot/restore.

B. Multi-Tenancy & Governance

Hard isolation per tenant (separate DBs or schemas + policy guardrails).

Cross-tenant federation with share contracts; row-level security in Postgres, label-based security in graph.

Policy center: OPA policy editor UI; policy packs; attestation logs.

C. Workflow & Alerting

Rules engine for patterns/thresholds (e.g., “new path within N hops between labeled entities”).

Actions: notify, create task/ticket (Jira/ServiceNow), tag, enrich, run playbook.

Playbooks: declarative YAML; approval gates.

D. Extensibility

Plugin SDK: custom extractors, analytics, layouts, entity types; UI extension points.

Connector marketplace with signing and sandboxing.

E. XAI & Trust

End-to-end lineage from raw source → entity/edge → insight/report.

Model registry & versioning, eval dashboards, drift detection; human feedback loops.

F. UX Surface

Timelines, geo maps, story/narrative generation (templated NL reports with citations).

Accessibility: maintain WCAG AA.

4.3 Non-Functional Targets

Scale: 10M+ nodes, 100M+ edges; 500+ concurrent users.

Latency: P95 <200 ms common queries; P99 <500 ms.

Reliability: 99.9% SLA, RPO≤5 min, RTO≤30 min; blue/green upgrades.

Security: FIPS-compatible crypto paths; audit-immutable logs; secret rotation.

Compliance: Controls aligned to NIST/SOC2; FedRAMP path if pursued. (README already cites SOC2/NIST alignment direction—formalize.)
GitHub

4.4 GA Milestones

HA Graph + ANN lane

Workflow/alerts (+ integrations)

Plugin/connector marketplace

Governance center (OPA UI, lineage, attestations)

SaaS/on-prem release engineering (licensing/tenant mgmt, backup/DR)

Sec/compliance audits

Beta → GA with reference customers

5. Architecture Deltas (MVP-2 → GA)

Service graph:

Break out ingestion, ER, XAI suggestions, query services.

Introduce ANN indexer (optional in MVP-2; required in GA).

Abstract GraphStore interface to swap Neo4j CE→EE or alt engines with minimal app changes.

Event bus (Kafka, already hinted via make up-kafka) for ingestion/processing.
GitHub

Data contracts:

Versioned entity/edge schemas; migration assistant.

Provenance/lineage first-class; per-field confidence where relevant.

Ops:

SLOs: API p95 latency, error rate, freshness (connector lag), availability.

DR: scheduled backups, snapshots; restore drills.

Secrets: KMS integration; rotation cadences.

6. Compliance & Security Program (progressive)

MVP-2: Threat model; CIS benchmarks; OWASP ASVS checks; ZAP CI gate; audit log coverage report. (Security scaffolding is in README; enforce it.)
GitHub

GA: Formal policies, vendor risk, incident response runbooks, pen-test, SOC2 Type I→II, NIST 800-53 moderate mapping.

7. Metrics (Product + Tech)

Adoption: DAU/WAU; investigations created; session duration; connector usage.
Insight quality: suggestion acceptance rate; time-to-insight; false-positive rate.
Ingestion: throughput, error classes, DLQ depth, staleness.
Perf: query p95/p99; cache hit-rate; GC/headroom.
Reliability: uptime, MTTR, RPO/RTO drills.
Security: policy violations blocked; coverage of audited actions.

8. Delivery Plan (90-day MVP-2)

Sprint 1–2: Connector SDK + TAXII hardening + DLQ/metrics; ER 1.0; ingestion console.
Sprint 3: XAI suggestions + explanation API/UX; audit wiring.
Sprint 4: Perf/caching; export/reporting; onboarding.
Stabilization: perf soak, ZAP, pilot deployment + fixes.
(You already have health endpoints, tests, ZAP, observability; convert those into blocking gates.)
GitHub

9. Risks & Mitigations

Graph scale/HA → abstract store; plan EE/cluster or alt engine; cap path searches; precompute hot metrics.

Connector drift → schema-versioned mappings; contract tests; DLQ & replay.

XAI trust → show top features/provenance; conservative thresholds; analyst approval loop.

Multi-tenant leaks → policy tests, synthetic canary data across tenants; persisted query allowlists.
GitHub

Perf regressions → perf CI; artifact size budgets; GraphQL persisted queries; Redis caches.

10. Concrete Next Actions

Cut MVP-2 branch; define SLOs (latency, throughput, availability) and make smoke/perf/security tests gates. (README lists health/tests—promote to gates.)
GitHub

Ship Connector SDK + two connectors (STIX/TAXII hardened + one API OSINT).

Implement Suggestion+Explain types/resolvers + UI overlay.

Ingestion console + DLQ UI with retry and mapping editor.

Perf pass: Redis caches, index tuning, result windowing; baseline load spec (1M nodes).

Admin/Audit UI: tenant scoping, audit explorer, export.

Pilot deployment with success criteria and feedback loop.

Appendix — Repo Evidence Pointers

Stack & features (React/GraphQL/Neo4j/Postgres/Timescale/Redis; AI modules; observability; security items; performance notes; quickstart & golden path).
GitHub
+1

API & endpoints (GraphQL types/queries/mutations; REST; WebSocket events).
GitHub

Monitoring & security testing (Prometheus/Grafana/Alertmanager, ZAP, test categories).
GitHub

If you want, I can break this into a tracked, sprint-level backlog mapped to your repo’s Issues/PRs and attach example GraphQL schema diffs and TypeScript interfaces for the connector SDK and XAI explanation objects.
