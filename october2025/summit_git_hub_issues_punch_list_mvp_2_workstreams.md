# SUMMIT — GitHub Issues Punch‑List (MVP‑2)

> Use this as a bulk‑creation source for GitHub issues. Copy/paste per section or script via API. Each issue includes: **Title**, **Why**, **Scope (DoD)**, **Tasks**, **Acceptance Criteria**, **Labels**, **Milestone**, **Estimate**, **Dependencies**.

---

## Workstream A — Identity & SCIM

### A1: Implement OIDC SSO (Okta/Entra/Auth0) in API & Web

**Why:** Enterprise federation blocker.\
**Scope (DoD):** Users can sign in via OIDC; refresh rotation; group claims emitted.\
**Tasks:**

-

### A2: SAML 2.0 SSO (service provider)

**Why:** Agencies with SAML only.\
**Scope:** SP‑initiated + IdP‑initiated; signed assertions.\
**Tasks:** metadata endpoints; ACS; clock skew handling; e2e tests.\
**Acceptance:** Works with Okta SAML & ADFS.\
**Labels:** `identity` `gov` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** A1.

### A3: SCIM v2 User/Group Sync

**Why:** Lifecycle mgmt; least privilege.\
**Scope:** Push‑based (Okta) + GET for verification; mirror tables.\
**Tasks:** endpoints `/scim/v2/Users` `/Groups`; provisioning events; mapping UI.\
**Acceptance:** Create/Update/Deactivate round‑trip; audit entries.\
**Labels:** `identity` `provisioning` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 13 SP\
**Deps:** A1.

### A4: Group/Attribute Mapping UI (IdP Wizard)

**Why:** Reduce SE setup time.\
**Scope:** Map IdP groups/claims → roles/attributes; preview evaluator.\
**Tasks:** UI; schema; validations; docs.\
**Acceptance:** Admin can test a JWT and see effective permissions.\
**Labels:** `admin-ui` `identity` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** A1, A3.

### A5: Session Security Hardening

**Why:** Prevent token abuse.\
**Scope:** Rotation, audience scoping, same‑site/csp headers.\
**Tasks:** refresh/token TTLs; device posture header plumb.\
**Acceptance:** Security tests; headers verified in prod profile.\
**Labels:** `security` `identity` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** A1.

---

## Workstream B — OPA/ABAC

### B1: Introduce OPA Policy Layer for GraphQL Resolvers

**Why:** Enforce ABAC consistently.\
**Scope:** Sidecar or library; Rego bundle loader; decision cache.\
**Tasks:** context builder (user, tenant, attrs); allow/deny; test harness.\
**Acceptance:** Top 10 resolvers gated by OPA; policy tests green.\
**Labels:** `security` `policy` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** A1/A3.

### B2: ABAC Model & Attribute Schema

**Why:** Shared vocabulary for policies.\
**Scope:** User attrs, resource attrs, action verbs; policy examples.\
**Tasks:** schema PR; docs; sample policies.\
**Acceptance:** Three example policies (case read, export, admin).\
**Labels:** `policy` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** B1.

### B3: UI Route Guards + Policy Evaluation

**Why:** Prevent UI data drift.\
**Scope:** Client checks with policy preview; error UX.\
**Tasks:** route guard HOC; policy preview pane.\
**Acceptance:** Unauthorized routes blocked; telemetry event.\
**Labels:** `frontend` `policy` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** B1.

### B4: Policy Bundle Pipeline in CI

**Why:** Controlled rollout of Rego.\
**Scope:** Lint, test, sign, version.\
**Tasks:** conftest; rego‑unit tests; cosign sign bundle.\
**Acceptance:** CI gate blocks on failing policy tests.\
**Labels:** `ci` `policy` `security` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** Supply‑chain (E series).

---

## Workstream C — Audit & Provenance

### C1: Unified Audit Log Middleware

**Why:** Non‑repudiation; compliance.\
**Scope:** Actor, subject, verb, object, result, reason, correlationId.\
**Tasks:** API middleware; UI event emitter; sinks (DB + file).\
**Acceptance:** 90% coverage on P0 actions; query/report endpoint.\
**Labels:** `audit` `compliance` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** B1.

### C2: AI Copilot Provenance Store

**Why:** Explainability.\
**Scope:** Store model, params, prompt hash, redactions, outputs, links.\
**Tasks:** schema; capture hooks; export to case file.\
**Acceptance:** Each AI call logged with provenance; demo export.\
**Labels:** `ai` `audit` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** C1, D2.

### C3: Audit Export & Tamper‑Evident Hashing

**Why:** Chain of custody.\
**Scope:** Export signed JSONL/CSV + manifest checksum.\
**Tasks:** signer lib; CLI; docs.\
**Acceptance:** External verify tool validates export integrity.\
**Labels:** `audit` `security` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** C1.

---

## Workstream D — Tenant Isolation (v1)

### D1: Add `tenant_id` Namespace to Data Stores

**Why:** Prevent cross‑tenant data bleed.\
**Scope:** Postgres schemas; Neo4j labels; Redis key prefix.\
**Tasks:** migrations; DAO filters; tests; backfill script.\
**Acceptance:** All reads/writes scoped by tenant; tests pass.\
**Labels:** `multitenancy` `db` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 13 SP\
**Deps:** B1.

### D2: Persisted GraphQL Queries per Tenant (Whitelist)

**Why:** Minimize data exfil risk.\
**Scope:** Disable ad‑hoc queries in prod profile; per‑tenant allowlist.\
**Tasks:** registry; signing; rollout flag; UI tooling.\
**Acceptance:** Golden‑path works with persisted queries only.\
**Labels:** `api` `security` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** D1, B1.

### D3: Per‑Tenant Rate Limits & Quotas

**Why:** Fair use & DoS containment.\
**Scope:** API rate limits; ingest quotas; job concurrency.\
**Tasks:** token bucket per tenant; metrics; admin overrides.\
**Acceptance:** Limits enforced; dashboard shows consumption.\
**Labels:** `multitenancy` `ops` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** D1.

---

## Workstream E — Supply‑chain / SBOM

### E1: Generate SBOMs for All Services (Syft)

**Why:** Visibility and compliance.\
**Scope:** CI step produces SPDX; publish to artifacts.\
**Tasks:** syft in Actions; artifact upload; README badges.\
**Acceptance:** SBOM exists per image; diff on PRs.\
**Labels:** `ci` `security` `sbom` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** None.

### E2: Container Image Signing (cosign) + Verify Gate

**Why:** Tamper protection.\
**Scope:** Sign on build; verify on deploy; keyless OIDC.\
**Tasks:** cosign; policy gate; docs.\
**Acceptance:** Unsigned images blocked in CI/prod profile.\
**Labels:** `security` `supplychain` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** E1.

### E3: SLSA Provenance Attestations

**Why:** Build integrity.\
**Scope:** GitHub Actions → provenance; store with images.\
**Tasks:** slsa‑generator; attestation upload; verification step.\
**Acceptance:** Attestations visible per release.\
**Labels:** `supplychain` `security` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** E2.

### E4: Dependency Allowlist + Renovate

**Why:** Reduce vuln drift.\
**Scope:** Allowlist; automated PRs; semver policy.\
**Tasks:** renovate config; policy doc; alert routing.\
**Acceptance:** Weekly PRs; CI passes; changelog digest posted.\
**Labels:** `deps` `ci` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** None.

### E5: Secrets Management Baseline & Rotation Hooks

**Why:** Credential risk reduction.\
**Scope:** Compose `secrets`; KMS envelope option; rotation endpoints.\
**Tasks:** secrets audit; KMS plugin; runbook.\
**Acceptance:** Static secrets removed from envs; rotation demo.\
**Labels:** `security` `ops` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** Ops.

---

## Workstream F — Data Governance (v1)

### F1: Data Classification & Labels (UI + Backend)

**Why:** Handle data by policy.\
**Scope:** Enum (PUBLIC/INT/CONF/SECRET); badges in UI; policy aware.\
**Tasks:** schema changes; UI indicators; OPA attributes.\
**Acceptance:** Classifications enforceable in queries/exports.\
**Labels:** `datagov` `policy` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** B2.

### F2: Field‑Level Redaction Library

**Why:** PII minimization.\
**Scope:** Deterministic hashing + masking; re‑ID under lawful basis.\
**Tasks:** library; config; unit tests; integration in AI path.\
**Acceptance:** Redactions applied pre‑AI send; logged in provenance.\
**Labels:** `privacy` `ai` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** C2.

### F3: Retention & Legal Hold Policies

**Why:** Compliance + storage hygiene.\
**Scope:** Per‑tenant schedules; hold flags; delete jobs.\
**Tasks:** policy store; workers; admin UI.\
**Acceptance:** Expiry deletes simulated; holds override; audit entries.\
**Labels:** `datagov` `compliance` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 8 SP\
**Deps:** C1.

### F4: DSAR Search Endpoint (Admin)

**Why:** Regulatory response.\
**Scope:** Search selectors; export bundle; access controls.\
**Tasks:** API; admin UI; rate limits; docs.\
**Acceptance:** DSAR produced within policy; audit trail present.\
**Labels:** `privacy` `compliance` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** C1, F1.

---

## Workstream G — Observability & SLOs

### G1: Golden‑Path Synthetic (Investigation→Insight < 3m)

**Why:** Guardrail for regressions.\
**Scope:** Headless script; CI + cron in prod profile.\
**Tasks:** script; dashboards; alerting.\
**Acceptance:** Synthetic runs 5‑min cadence; alerts on fail.\
**Labels:** `observability` `reliability` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** D2.

### G2: API p95 Latency SLO (<300ms) Dashboard & Alerting

**Why:** Performance objective.\
**Scope:** OTel spans; Prom metrics; Grafana panels.\
**Tasks:** instrument P0 endpoints; SLO calc; alert routes.\
**Acceptance:** Dashboard live; burn‑rate alerts wired.\
**Labels:** `observability` `performance` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** None.

### G3: Ingest E2E SLO (<5m p95) & Backpressure Controls

**Why:** Stability during spikes.\
**Scope:** Queues; circuit breakers; metrics.\
**Tasks:** instrument ingest stages; backpressure; alerts.\
**Acceptance:** Load test meets SLO; no data loss.\
**Labels:** `observability` `ingest` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** Ops.

### G4: Chaos Test — Tenant Isolation

**Why:** Validate boundaries.\
**Scope:** Fuzz queries; forced failures; leak detection.\
**Tasks:** test suite; report; fix backlog.\
**Acceptance:** Zero cross‑tenant reads/writes in report.\
**Labels:** `security` `multitenancy` `testing` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** D1, D2.

---

## Cross‑Cutting / Docs & Kits

### X1: Admin Onboarding Wizard (IdP + Tenant Basics)

**Why:** Reduce time‑to‑first‑value.\
**Scope:** Guided setup; validations; test buttons.\
**Acceptance:** New tenant to working SSO in <10 minutes.\
**Labels:** `admin-ui` `docs` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** A1, A3, D1.

### X2: Security & Compliance Evidence Pack v1

**Why:** Pilot procurement readiness.\
**Scope:** Control matrix, runbooks, SBOM index, IR policy, export notice.\
**Acceptance:** Pack generated per release; link from README.\
**Labels:** `compliance` `docs` `P0`\
**Milestone:** MVP‑2\
**Estimate:** 5 SP\
**Deps:** E1‑E3, C1.

### X3: Procurement Kit v1 (MSA/DPA/SLA/AUP templates)

**Why:** Contracting velocity.\
**Scope:** Markdown templates + docx; public redlines.\
**Acceptance:** Legal self‑serve kit published.\
**Labels:** `legal` `docs` `P1`\
**Milestone:** MVP‑2\
**Estimate:** 3 SP\
**Deps:** X2.

---

## Bulk Issue Creation Hints

- Use labels suggested above.
- Set **Milestone: MVP‑2**.
- Link issues by dependency graph.
- Add `area/*` labels (api, web, data, infra) as appropriate.
- Assign **DRIs** per workstream lead.

Below is a high‑level diagnostics + roadmap for **Summit / IntelGraph** (per the GitHub) plus a proposed PRD/feature spec for **MVP‑2** going into **General Availability (GA)**. Think of this as a product spec “canvas” you can use to blueprint the execution.

---

## Current State — “Where We Are”

I’ll start by summarizing where the product currently is (based on the repo and README) and key strengths, gaps, and risks.

### Strengths & foundations (MVP‑0 / MVP‑1 baseline)

- Deployable‑first architecture: clean local dev setup with Docker, make scripts, smoke tests built in. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))
- Core stack is in place:\
    • Frontend: React + MUI + Redux + cytoscape for graph viz. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • Backend: Node.js + GraphQL (Apollo) on Express middle layer. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • Databases: Neo4j for graph data, PostgreSQL for metadata, TimescaleDB for time series, Redis for caches & live ops. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • AI/ML “extraction engine” scaffolded: OCR, object detection, NLP, embeddings, vector search. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • Real‑time / collaboration: via WebSocket / Socket.io. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • Security, audits, policy: JWT + RBAC + OPA + rate limiting. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))\
    • Observability: OpenTelemetry / Prometheus / Grafana are in spec. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))
- Feature flagging, modular structure, CI/CD pipelines, tests (unit, integration, E2E) supported. ([GitHub](https://github.com/BrianCLong/summit 'GitHub - BrianCLong/summit'))
- Domain focus: intelligence / investigations, combining graph analytics + AI augmentation + collaborative UI.

### Gaps, risks & unknowns (What’s missing or under‑defined)

These are things I infer (or cannot confirm) that must be addressed before MVP‑2 / GA.

| Area Gap / Risk Implication / Uncertainty |                                                                                                                                                                                |                                                                                          |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Feature scope clarity                     | The README defines “MVP‑0 / MVP‑1” but doesn’t clearly state what “MVP‑2 / GA” must deliver in terms of verticals, SLAs, integrations, scale, customer use cases.              | Opportunity cost: scope creep or underdelivering vs customer needs.                      |
| Scalability & multi‑tenant                | It’s unclear how well the architecture scales for many users, large graphs, partitioning/tenancy isolation.                                                                    | Performance, resource contention, isolation risks.                                       |
| Data ingestion / connectors               | CSV / STIX / TAXII ingest is present, but external pipelines, live connectors (APIs, streams) not fully fleshed.                                                               | Real intelligence work often involves many external data sources, APIs, real‑time feeds. |
| Model management & retraining             | There’s mention of AI/ML extraction, but versioning, retraining, model lifecycle (A/B, feedback, drift) management is not described.                                           | Models degrade over time; lack of feedback loops is a risk.                              |
| UX / collaboration maturity               | The graph UI and multi‑user editing are present, but conflict resolution, versioning, audit history, undo/redo, annotation, chain-of-thought views might not be fully baked.   | Investigators expect smooth, granular control.                                           |
| Security / compliance                     | The scaffolding is there, but for GA you’ll need hardened threat models, data encryption strategies, role hierarchies, log retention, compliance with classified environments. | Missed security requirements is fatal in this domain.                                    |
| Performance & latency SLAs                | No clearly bound latency targets for large graphs or interactive analysis.                                                                                                     | If the system lags, users will reject it.                                                |
| Offline / mobile support                  | Spec mentions mobile responsiveness, but offline or degraded network behavior is not addressed.                                                                                | In field work, network connectivity is unreliable.                                       |
| Monitoring, alerting & ops                | Spec lists metrics, dashboards, alerts, but production incident response, auto scaling, failures, recovery, disaster recovery not yet fully scoped.                            | Operational risk in real deployments.                                                    |
| Ecosystem & extensibility                 | It’s unclear how extensible plug‑ins, custom analytics, domain modules (e.g. geospatial, link analysis, social graphs) will plug in.                                           | For GA, you’ll need to allow customers to extend.                                        |
| Licensing / deployment model              | On‑prem, SaaS, hybrid? Pricing, upgrade paths, zero‑downtime upgrades?                                                                                                         | These decisions shape architecture constraints.                                          |

In sum: the foundations are solid. But to move from MVP to GA, you must solidify differentiation (AI + graph + collaboration), scale, robustness, extensibility, and security.

---

## Vision & Strategic Goals (“Where We’re Going”)

From the vantage of an intelligence / enterprise analytics tool, the long‑term vision (beyond GA) might be:

- A platform where investigators, analysts, and operators can ingest data from any source (structured, unstructured, streaming, sensor, social, geospatial), fuse with graph and vector models, and get high‑trust, explainable insights and recommendations.
- Real-time collaboration across distributed teams (including field/edge devices), with annotations, shared “investigative workspaces,” audit trails, versioning, branching investigations.
- A marketplace/ecosystem of domain modules (fraud, counterterror, cybersecurity, supply chain, influence ops) that add specialized analytic pipelines or visualizations.
- Embedding trust, human-in-the-loop, and explainability: allow investigators to inspect the AI rationale, adjust weights, feed corrections, propagate feedback.
- Being deployable in high-security environments (air-gapped, classified, on-prem, enclave) while allowing optional SaaS/edge hybrid modes.
- Scaling to massive graphs (billions of nodes), multi-tenant, federated across datasets, partitioned for security, with horizontal scaling.
- A “copilot” that can suggest hypotheses, detect anomalies, predict relationships, propose leads, and automate routine tasks without replacing human judgment.

From that, the roadmap for MVP‑2 and GA should aim to bridge the gaps above and deliver a hardened, production‑grade, marketable product.

---

## MVP‑2 & GA — Proposed Spec / PRD

Below is a draft **Product Requirements Document (PRD)** for MVP‑2 (midway) and GA (final public release). You can adjust scope to your team’s velocity, but this gives you a scaffold.

### Definitions & Context

- **MVP‑2**: the next major release after MVP‑1. It should be robust enough for pilot deployments by real customers (for evaluation, limited scopes) in non-mission-critical use cases.
- **GA**: production‑grade, scalable, hardened, extensible version for broad adoption, including real reference customers, SLAs, support, upgrades.

### Major Themes / Focus Areas for MVP‑2 → GA

1. **Data Ingestion & Integration**
2. **Scalability & Performance**
3. **UX / Investigative Workflows**
4. **Collaboration & Versioning**
5. **AI / Model Lifecycle & Feedback**
6. **Security, Compliance, Isolation**
7. **Ops, Monitoring & Reliability**
8. **Extensibility & API / Plugin Ecosystem**
9. **Deployment & Licensing / Packaging**
10. **Release / QA / Validation**

I’ll map features across MVP‑2 vs GA for each area, and then propose an MVP‑2 Feature List and a GA Final Feature List.

---

### 1. Data Ingestion & Integration

**MVP‑2 Goals:**

- Expand connectors beyond CSV / STIX / TAXII: support ingest APIs (REST, streaming), log ingestion (Syslog, S3, Kafka), ETL tooling.
- Ingestion pipelines with error reporting, validation, schema mapping, transformation tools (field mapping, data cleanup).
- Batch + near-real-time incremental ingestion.
- Support for “live updates” (streaming ingestion) with eventual consistency.
- Preprocessing pipelines (text extraction, OCR, simple NLP) at ingestion stage.
- Data provenance / lineage metadata tracking.

**GA Goals:**

- Full connector library (common enterprise sources: Elasticsearch, Splunk, SIEMs, messaging platforms, social APIs, geospatial sensors, IoT).
- Bidirectional sync / federated data (linking remote partitions rather than copying).
- Schema versioning, change detection, backward compatibility support.
- Support extremely large ingestion (hundreds of GB/day) with parallelization, partitioning, backpressure control.
- Adaptive pre-processing (e.g. automatic entity extraction tuning) during ingest.

---

### 2. Scalability & Performance

**MVP‑2:**

- Performance benchmarks & load testing for medium graphs (10M nodes, 100M edges).
- Caching and query result caching for common graph queries.
- Query optimization, indexing, query planning improvements.
- Horizontal read scaling (read replicas or query sharding).
- Partitioning / sharding of graph data (vertical/horizontal partition).
- Memory and resource usage monitoring and limits to prevent overloading.

**GA:**

- True horizontal scaling (multi-master or federated graph clusters).
- Fault tolerance & auto failover.
- Distributed query planning across shards.
- Smart query caching, auto-materialization of frequent subgraphs or aggregates.
- Indexing strategies for both graph and embedding/vector search.
- SLA-backed performance guarantees (e.g. 95ᵗʰ percentile < X ms for interactive operations).

---

### 3. UX / Investigative Workflows

**MVP‑2:**

- Enhanced graph UI: progressive rendering, clustering, layout switching, filtering by attribute/time, zoom/pan performance.
- Undo/redo, history trace, “time travel” view (view past states).
- Entity / relationship editing UI improvements (bulk operations, property editing, templates).
- Search UI: semantic search + filtering, faceted search over entities.
- Visual annotations: notes, labels, highlighting, tags on graph.
- Dashboard / overview (investigation summary, graph KPIs).
- Export / share view (PDF, GraphML, CSV, JSON).

**GA:**

- Advanced visualization modules (geospatial overlays, timeline view, link analysis heatmaps, path scoring).
- Investigation branching / version forking, merging, review workflows.
- Cross-investigation linking, path stitching, “lead suggestion” propagation.
- Unified “case book” UI: narratives, evidence, storylines tied to the graph.
- Mobile-responsiveness and offline / degraded network support (e.g. cached views, eventual sync).

---

### 4. Collaboration & Versioning

**MVP‑2:**

- Multi-user collaboration with live presence, locking or merging of changes, conflict detection.
- Basic versioning: snapshots per save / commit.
- Access control on investigations (who can read, write, comment).
- Comments / discussion threads attached to graph nodes/edges.
- Notifications / alerts on collaborator changes.

**GA:**

- Fine-grained version control: branch/fork, merge, diff, rollback.
- Annotation sharing and propagation between users.
- Role-based collaborative workflows (review, approval, audit logs).
- Real-time merge conflict resolution UI, change tracking per attribute.
- Integration with external workflows (Jira, ticketing, task management).

---

### 5. AI / Model Lifecycle & Feedback

**MVP‑2:**

- Model version metadata (version number, date, training set).
- Feedback loops: user corrections feed back into model (e.g., marking false positives, corrections).
- A/B testing of variant models for extraction tasks.
- Confidence scoring on extracted entities / relationships.
- Explainability: show which source text / paths triggered an extracted relationship.
- Embedding + semantic search improvements (tuning for domain-specific embeddings).

**GA:**

- Model retraining pipelines (scheduled, incremental, on-demand).
- Drift detection, monitoring for model degradation.
- Automated model rollback / fallback when confidence low.
- Plugin model modules (users can bring their own models or pipelines).
- Federated learning or private model adaptation per client.
- Model lineage, auditability, differential privacy, explainable AI for decision-making.

---

### 6. Security, Compliance, Isolation

**MVP‑2:**

- Enforce separation between investigations (tenant isolation, data scoping).
- Role-based policies (read / write / approve) with attribute-level controls.
- Encryption in transit (TLS) is already present; ensure encryption at rest for sensitive data.
- Audit logs for all entity / relationship changes.
- Rate limits, input sanitization, validation, hardened GraphQL interface (persisted queries).
- Secrets management, environment isolation support.

**GA:**

- Multi-tenant hardened isolation, per-tenant encryption keys.
- Key management (KMS integration), HSMs if required.
- FIPS / Common Criteria / FedRAMP / classified environment compliance where needed.
- Capability for air-gapped/offline deployment.
- Data segmentation across security domains.
- WAF / intrusion detection, automated alerts on anomalous behavior.
- Access reviews, policy change logs, certification workflows.

---

### 7. Ops, Monitoring & Reliability

**MVP‑2:**

- Expanded telemetry: user-level metrics (investigations/day, graph growth, query latency).
- Alerting: threshold alerts (errors, latency, resource usage).
- Health / liveness / readiness endpoints and monitors.
- Backup / restore of graph + metadata databases (snapshotting, incremental backup).
- Basic failover / replication (read-only replicas, hot standby).
- Logging / tracing, correlation IDs end-to-end.

**GA:**

- Auto-scaling, self-healing (container orchestration, Kubernetes support).
- Disaster recovery plans across availability zones / datacenters.
- Canary / blue/green deployment support, zero-downtime upgrades.
- SLA monitoring and error budgets, incident response, rollback mechanisms.
- Synthetic user testing, performance guardrails in production.
- Capacity planning tools, cost estimation dashboards.

---

### 8. Extensibility & Plugin / API Ecosystem

**MVP‑2:**

- Public APIs (GraphQL + REST) for CRUD + search + analytics.
- Plugin framework for analytics modules: allow users to register custom transformations, graph algorithms, scoring functions.
- Webhooks / event subscriptions (e.g. on new entity, new relationship).
- Embedding API to push external embedding vectors.
- SDKs / client libraries (Python, maybe Go / Java) for embedding into external systems.

**GA:**

- Full plugin marketplace: packaged domain modules with plumbing, UI, analytics.
- Scriptable workflows / pipelines (e.g. define custom ETL, scoring sequences).
- Plugin UI extension points (panels, chart types, context menus).
- Versioning and isolation of plugins, plugin sandboxing.
- Cross-instance federation / plugin sharing.
- GraphQL sub-schema injection by plugins (modularized schema).

---

### 9. Deployment & Licensing / Packaging

**MVP‑2:**

- Support for on-prem and basic cloud deployment (containers, maybe basic helm).
- Single-tenant deployment model.
- Clear license types (enterprise, evaluation, open-core modules vs paid modules).
- Upgrade path: incremental upgrades from MVP‑1 to MVP‑2.
- Documentation & install guides (dev, staging, production).

**GA:**

- SaaS offering, hybrid (cloud + on-prem edge), multi-tenant support.
- Licensing enforcement (feature tiers, quotas).
- Marketplace billing integration (if SaaS/paid modules).
- Zero-downtime upgrades, migrations.
- Version compatibility, backward compatibility guarantees.
- Automated installers, managed updates.

---

### 10. Release / QA / Validation

**MVP‑2:**

- Expand test coverage (unit, integration, performance, security).
- Formal QA cycles, bug bashing, pilot programs with selected users.
- Performance benchmarks and acceptance criteria.
- Security vulnerability scanning, pentesting.
- Documentation: user guides, API references, architecture docs.

**GA:**

- Hardening through external audits (security, compliance).
- Customer onboarding kits, reference deployments, case studies.
- SLA definitions and support contracts.
- Migration assurance (data migration, version upgrades).
- Certification, conformance testing, compliance audits.

---

## MVP‑2 Feature List (Tentative)

Below is a candidate prioritized feature list for MVP‑2 (assuming finite team capacity). You can pick among these according to your roadmap / prioritization.

| Priority Feature Description / Acceptance Criteria |                                            |                                                                                                               |
| -------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| **High**                                           | API / streaming ingest                     | Ability to ingest data from HTTP APIs and streaming (Kafka / webhooks) with schema mapping and error handling |
| **High**                                           | Collaboration locking / conflict detection | Multi-user live editing with optimistic locking, conflict UI                                                  |
| **High**                                           | Version snapshots & rollback               | Users can commit “snapshots” and rollback to prior versions, view diffs                                       |
| **High**                                           | Graph UI enhancements                      | Progressive loading, filtering, clustering, layout switching                                                  |
| **High**                                           | Entity / relation editing UIs              | Bulk edit, template apply, property validation                                                                |
| **High**                                           | Model version metadata and feedback        | Show version, allow marking corrections, tie back to model output                                             |
| **High**                                           | Performance improvements                   | Query optimizations, caching, read replicas                                                                   |
| **High**                                           | Access controls & RBAC extension           | Control per-investigation permissions, role-based write/read controls                                         |
| **Medium**                                         | Audit logs & history UI                    | View change logs on nodes/edges, who changed what when                                                        |
| **Medium**                                         | Export / share view                        | Export graph / investigation to JSON, GraphML, CSV, PDF                                                       |
| **Medium**                                         | Plugin / API framework bootstrap           | Minimal plugin scaffolding or SDK for extension                                                               |
| **Medium**                                         | Backup & restore                           | Snapshot + restore pipeline for graph/metadata                                                                |
| **Medium**                                         | Telemetry & alerting                       | Extended metrics, alerts on latency, errors, resource usage                                                   |

You can (and should) break these into multiple sprints. The “High” ones constitute the core of MVP‑2.

### MVP‑2 Success Criteria / Metrics

- Pilot customers ingest real datasets (≥10M entities) without major performance degradation.
- Multi‑user usage without conflicts or data loss.
-  80% of critical investigative tasks are feasible in UI flow (entity add, relation add, search, link exploration).
- Latency for common graph queries under threshold (e.g. < 500 ms 95ᵗʰ percentile on pilot scale).
- No critical security vulnerabilities in pentests.
- Stable onboarding and deployment in target environments.

---

## GA Final Feature List (Tentative)

At GA, you want all the infrastructure, maturity, scalability, security, ecosystem, and user experience to compete with enterprise analytics/graph/AI platforms. The GA release should include (but not limited to):

- Full connector library + federation
- Horizontal scaling, distributed graph cluster
- Rich visualization modules (geo, timeline, path heatmap)
- Full version control, branching & merging, diff, review workflows
- Plugin marketplace, plugin UI extension
- Model lifecycle (drift detection, retraining, rollback)
- Enterprise security / multi-tenancy / compliance support
- SaaS offering + multi-tenant deployment
- Zero-downtime upgrades
- SLA-backed performance / availability
- Onboarding flows, self-serve deployment, documentation, support
- Offline / edge mode support
- Federation / cross-instance linking
- Commercial licensing, billing, upgrade paths

---

## Dependencies, Risks & Mitigations

**Dependencies / Constraints:**

- Team bandwidth: AI/ML, platform, UI, ops, security all stretch resources.
- Infrastructure: scalable graph backends are nontrivial (sharding, query planning).
- Domain complexity: investigators may demand domain customization (legal, compliance, region-specific).
- Data volume & variety: graphs may grow huge; embeddings full corpus, etc.
- Trust & explainability: AI insights must be inspectable or users will reject them.

**Key Risks & Mitigations:**

| Risk Mitigation Strategy      |                                                                                                                                           |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Over-scope / feature bloat    | Use strict prioritization (MoSCoW, ICE scores), decouple “nice-to-have” from must-haves.                                                  |
| Performance fails at scale    | Early load testing, profiling, modularize queries, adopt scalable graph backends (e.g. Neo4j clustering, or hybrid graph + vector store). |
| Security holes                | Bring in security review early, third-party audits, enforce minimal attack surface.                                                       |
| Model drift / poor AI results | Guard the AI outputs (show confidences, human-in-the-loop, fallback), build feedback loops.                                               |
| Plugin ecosystem complexity   | Start with minimal plugin scaffolding; keep plugin API surface small and stable early.                                                    |
| Deployment / ops complexity   | Automate everything, use container orchestration (K8s), test upgrade paths, build observability early.                                    |
| Domain mismatch / usability   | Pilot closely with domain users; embed user feedback early; adapt UI flows to real investigative workflows.                               |

---

## Suggested Roadmap / Phases (6–12 months horizon)

1. **Refinement & scoping** — validate with potential pilot users which features from MVP‑2 are truly needed first.
2. **MVP‑2 development & pilots** — build prioritized MVP‑2 set, onboard 1–2 pilot customers in real settings, iterate.
3. **Hardening & scale prep** — focus on scalability, reliability, security, ops, performance tuning.
4. **Ecosystem & extensibility** — plugin framework, API, connectors.
5. **GA release** — deploy to early customers, promote reference deployments, marketing, support.
6. **Post‑GA expansion** — build plugin marketplace, SaaS, cross-domain modules, further scaling.

---

## Suggested Canvas Layout (Markdown + Visual)

Below is a rough **canvas you can use / transform** (e.g. in a whiteboard or tool) to track states, goals, and features:

```
╔══════════════════════════════════════════════════════════╗
║                   Summit / IntelGraph Canvas             ║
╠════════╦═══════════════╦═════════════════╦══════════════╣
║ Domain │ Current State  │ MVP‑2 Goals       │ GA Goals      ║
║ (Area) │ (today)        │                  │               ║
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Ingest │ CSV, STIX/TAXII│ API + streaming,  │ Full connectors,  │
║       │ minimal ETL     │ schema mapping,    │ federated sync     │
║       │                 │ incremental        │                   │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Graph /│ Neo4j + query   │ caching, query     │ distributed graph  │
║ Scale  │ baseline, some  │ optimization, read │ cluster, shards    │
║        │ limit tests     │ replicas           │                   │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ UX /   │ Basic graph UI,  │ filters, clustering,│ advanced modules,  │
║ Workflow│ search, edit     │ undo/redo, export   │ geo, timeline, case │
║        │                 │                   │ book, offline mode │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Collab /│ Socket.io based, │ locking, snapshot,  │ version branching /│
║ Versioning│ basic multi-user │ conflict UI, audit   │ merge, diff, reviews │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ AI /   │ Extraction engine scaffolded│ feedback loop, versioning, explainability │ retraining, drift detection, plugin models │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Security│ JWT, RBAC, OPA    │ partition isolation, audit logs, per-investigation roles │ multi-tenant isolation, compliance standards │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Ops /  │ Basic metrics, backup, health endpoints │ alerting, backup/restore, failover │ auto-scaling, DR, zero-downtime upgrades │
║ Reliability│              │                   │                   │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Extensibility│ minimal plugin ideas │ public APIs, plugin bootstrapping │ full plugin market, UI hooks │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ Deployment │ Docker / compose, on-prem  │ helm/k8s support, upgrade path │ SaaS + multi-tenant, billing, hybrid deployment │
╠════════╬═══════════════╬═════════════════╬══════════════╣
║ QA /   │ Tests in place   │ performance benchmarking, security testing, pilot rollout │ external audits, SLA validation, full QA cycles │
║ Release│                 │                   │                   │
╚════════╩═══════════════╩═════════════════╩══════════════╝

```

You can annotate this with feature checkboxes, timelines, dependencies, and owner assignments.

---

If you like, I can turn this into a polished internal spec with Gantt / roadmap slides, or generate a prioritized backlog for your next 3 sprints. Do you want me to do that (e.g. backlog)?
