# Summit Platform Roadmap Assessment

**Date:** 2026-03-05
**Scope:** Evidence-based assessment of 12 Palantir-class platform components + prioritized build roadmap
**Method:** Full codebase audit — file counts, implementation depth, and gap analysis grounded in actual code

---

## Where You Stand Now (Evidence-Based)

Legend: `GREEN` solid / `YELLOW` partial / `ORANGE` early / `RED` missing
Confidence: **High** / **Med** / **Low** (based on codebase evidence)

### 1. Ontology & Semantic Layer — `GREEN` (High)

**Evidence:**
- Neo4j canonical graph schema with multi-tenant constraints (`schema/neo4j/canonical_graph.cypher`)
- 50+ Cypher migration files with versioned schema evolution (`server/db/migrations/neo4j/`)
- ADR-005 for ontology and temporal model (`docs/ADR/ADR-005_ontology_and_temporal_model.md`)
- Ontology governance via OPA (`policy/ontology.rego`)
- GraphQL federation with 100+ schema files across domains
- Entity types: Person, Organization, Account, Event, DataAsset, Location, Indicator, Provenance
- Relationship constraints: MEMBER_OF, USES, ACCOUNT_OF, TRIGGERED, HOSTED_BY, OCCURRED_AT
- Tactic ontology (`intelgraph/core/tactic_ontology.py`), PII ontology (`docs/compliance/pii-ontology-framework.md`)

**Gap:** Schema linting in CI exists but ontology versioning could be more formalized (e.g., `ontology/v1` → `ontology/v2` migration contract). No single canonical "type registry" file — types are distributed across Cypher, GraphQL, and Python.

### 2. Entity Resolution Engine — `GREEN/YELLOW` (High)

**Evidence:**
- Dedicated microservice: `services/entity-resolution/src/index.ts` (Fastify-based)
  - Deterministic + probabilistic ER with explainable scorecards
  - Reversible merge operations with audit trails
  - H2L (Human-in-the-Loop) adjudication queues
  - Feature vectors: name, identifier, attribute overlap, temporal proximity, source agreement, transitive support
- Python implementation: `entity_resolution.py` — HDBSCAN clustering, Sentence-Transformers embeddings, Redis caching, Neo4j writes
- ADR-0005 covers canonical entity types with JSON-LD support
- MergeEvent tracking with timestamps, actors, reasons
- AML-specific resolver: `services/aml/src/entity-resolver.ts`
- Benchmarks: `summit/benchmarks/deepsearchqa/tests/test_entity_resolution.py`

**Gap:** Multilingual alias handling not explicitly evidenced. No dedicated "alias table" as a queryable first-class object — aliases are embedded in merge logic. Re-scoring pipeline for changed evidence not visible.

### 3. Temporal Intelligence — `GREEN/YELLOW` (High)

**Evidence:**
- Full bitemporal store: `packages/bitemporal/src/BitemporalStore.ts` — dual-time model (valid_time + tx_time)
- PostgreSQL migrations with `valid_from < valid_to` constraints (`server/db/managed-migrations/202602050005_bitemporal_storage.up.sql`)
- Neo4j bitemporal constraints: `ops/bitemporal/neo4j-constraints.cypher`
- Geotemporal fusion algorithms: `packages/geospatial/src/analytics/geotemporal-algorithms.ts`
- Temporal anomaly detection: `server/src/anomaly/detectors/temporal.ts`
- Complex event processing: `packages/cep-engine/src/temporal-patterns.ts`
- Time-travel documentation: `docs/modules/A2-bitemporal-time-travel.md`
- "As-of" query support documented in `docs/bitemporal-time-machine.md`
- Truth operations spec: `docs/truth-operations/temporal-truth.md`

**Gap:** Time-slicing queries ("show network as of 2017-06") exist conceptually in docs but end-to-end UI integration unclear. Conflict handling for contradictory claims at the same time-point not explicitly surfaced.

### 4. Provenance & Source Attribution — `GREEN` (High)

**Evidence:**
- 80+ provenance-related files across the codebase
- Immutable ledger: `server/src/crystal/provenance-ledger.ts` — UUID entries, actor tracking, append-only
- Cryptographic provenance: `server/src/canonical/provenance.ts` — Ed25519 signing, SHA-256 hashing
- Evidence chain: `packages/prov-ledger-extensions/src/evidence-chain.ts` (459 lines) — cycle detection, temporal consistency, confidence propagation
- gRPC protocol: `prov-ledger/protos/provenance.proto`
- OPA enforcement: `policy/provenance.rego`, `policies/provenance-gate.rego`
- SDKs: TypeScript (`packages/sdk-ts/src/provenance.ts`), Python (`packages/sdk-py/src/maestro_sdk/provenance.py`)
- GraphQL resolvers + REST endpoints for provenance queries
- E2E tests: `e2e/provenance.spec.ts`
- SLSA L3 attestation: `.github/scanners/slsa3-attestor.ts`
- Cosign artifact signing: `keys/cosign.pub`, `scripts/cosign_sign.sh`
- In-toto provenance format: `provenance/sample-provenance.intoto.jsonl`
- Evidence bundles with structured manifests: `EVIDENCE_BUNDLE.manifest.json`

**Gap:** Minimal. This is the strongest component. Minor: evidence-required write enforcement at the graph boundary is policy-defined but runtime enforcement depth unclear (is it a hard gate or advisory?).

### 5. Data Ingestion Framework — `GREEN/YELLOW` (High)

**Evidence:**
- 32+ connectors in `/connectors/` with standardized SDK manifest schema (`SDK_MANIFEST_SCHEMA.yaml`)
- Registry system: `connectors/registry.json` + `registry.schema.json`
- Production connectors: CSV, RSS/Atom, STIX/TAXII, JSON, DuckDB, Elasticsearch, Splunk, Chronicle, Sentinel, ESRI, Mapbox, OFAC SDN, Parquet, CISA KEV, S3, GitHub, SpiderFoot
- Built-in capabilities: automatic PII detection/redaction, license enforcement, rate limiting with backoff, lineage tracking
- Ingestion platform: `ingestion/main.py`, `ingestion/wizard.py`, `ingestion/streaming_worker.py`
- Connector features: schema mapping, acceptance tests, golden file testing, manifest validation
- Additional intelgraph quickstart ingestion: `intelgraph-quickstart/ingest/`

**Gap:** The connector interface is not a single formal `discover() → fetch() → normalize() → extract() → load()` contract — it's manifest-driven with per-connector implementation patterns. Queue/job model exists via streaming worker but idempotency guarantees not uniformly documented across all connectors.

### 6. Narrative & Influence Modeling — `YELLOW` (High)

**Evidence:**
- Graph schema: `intelgraph/schema/narrative.graph.yml` — nodes (Artifact, Actor, Community, Event, Narrative, Frame, Claim, Assumption, Handoff) + edges (PUBLISHED, AMPLIFIED, MAKES, DISPUTED_BY, etc.)
- Cognitive modeling: `intelgraph/cognitive_modeling.py` — agent-based with personality profiles, trust networks, behavioral patterns, emotional states, cognitive biases
- Debiasing: `intelgraph/cognitive_bias_detector.py`, `cognitive_bias_mitigation_integration.py`, `debiasing_engine.py`
- Metacognitive system: `intelgraph/metacognitive_system.py`
- Narrative CI pipeline: `intelgraph/pipelines/narrative_ci/` — scoring, handoff, compression, evidence bundling
- Streaming: `intelgraph/streaming/narrative_nodes.py`, `narrative_edges.py`
- Tactic matching: `intelgraph/graph_analytics/tactic_matcher.py`

**Gap:** Influence *propagation algorithms* (how narratives spread through networks, amplification modeling, cascade prediction) not implemented. Counter-narrative detection missing. No explicit "narrative campaign tracker" with longitudinal analysis. Cognitive network analysis partial.

### 7. Autonomous Investigation Agents — `YELLOW` (High)

**Evidence:**
- 24+ agents in `/agents/`: antigravity, jules, maestro, codex, governance, orchestrator, reviewer, release-conductor, runner, executor, audit, policy, predictive, multimodal, psyops, osint, patch, ledger, budgets, preflight
- Orchestration platform: `orchestration/` (Chronos Aeternum) — YAML→DAG intent compiler, Go deterministic runtime, OPA workflow governance
- CompanyOS agent mesh: `companyos/agents/`, `companyos/workflows/`
- Agent contracts: `AGENT_CONTRACT.md`
- Agent runtime tests: `packages/agent-runtime/test/` — policy bypass, forbidden tools, browser restrictions
- Agent registry: `agents/registry.yaml`

**Gap:** Agents operate on tasks but the "agents must write structured artifacts (claims/evidence/relations) to the graph as system of record" pattern is not uniformly enforced. Critic/verifier agent loop exists conceptually but not as a mandatory gate before graph writes. Eval harness for agent regression testing not visible as a standalone system. "Continuous monitoring investigations" (subscriptions) not evidenced.

### 8. Graph Analytics Engine — `YELLOW/ORANGE` (Med-High)

**Evidence:**
- Neo4j graph analytics projections: `server/db/migrations/neo4j/2025-09-01_graph_analytics_projection.cypher`
- Threat analytics: `ga-graphai/packages/threat-analytics/src/temporal-analysis.ts`
- Tactic matcher: `intelgraph/graph_analytics/tactic_matcher.py`
- Graph RAG: `services/graphrag/`, `packages/graph-rag/retrieval.cypher`
- Graph explainability: `graph_xai/`
- Predictive analytics services (11): anomaly-time-warp, causal-horizon-engine, collective-intelligence-weaving, emergent-pattern-genesis, graph-predictive-orchestration

**Gap:** No dedicated, repeatable graph analytics service with standard algorithms (community detection, centrality, flow analysis, influence scoring) exposed as callable jobs that write results back to the graph with provenance. Analytics exist in fragments across services. Missing: "run community detection → save clusters as derived artifacts → explain results" as a standard workflow.

### 9. Investigation Workspace (UI/UX) — `YELLOW/GREEN` (High)

**Evidence:**
- Investigation service: `server/src/services/investigationWorkflowService.ts` (875 lines)
  - Templates: Security Incident, Malware Analysis, Fraud Investigation
  - Workflow stages: INTAKE → TRIAGE → INVESTIGATION → ANALYSIS → CONTAINMENT → ERADICATION → RECOVERY → LESSONS_LEARNED
  - Evidence chain of custody with temporal metadata
  - Findings with severity/confidence scoring
- Frontend: `client/src/components/timeline/InvestigationTimeline.jsx`, `TemporalAnalysis.tsx`
- GraphQL: `client/src/graphql/queries/investigations.graphql`
- Real-time: `server/src/realtime/investigationState.ts`, `investigationAccess.ts`
- E2E tests: `e2e/ui/investigations.spec.ts`
- RBAC: `server/__tests__/rbac/investigation-export-rbac.test.ts`
- Classification levels: PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
- Priority: LOW, MEDIUM, HIGH, CRITICAL, EMERGENCY

**Gap:** Hypothesis board not evidenced as a shipped UI component. "Pin & cite" workflow (every note links to claim/evidence nodes) not visible. Graph view within investigations unclear — timeline and evidence binder exist, but the full "5-tab workspace" (Timeline, Graph, Evidence, Hypothesis, Reports) not confirmed as a unified experience.

### 10. Governance & Access Control — `GREEN` (High)

**Evidence:**
- 100+ OPA/Rego policy files across the repository
- Full ABAC implementation: `companyos/policies/bundles/access-control/abac.rego` — subject attributes, resource classification (secret, top-secret), environment controls (location, device trust, time-based)
- PDP service: `companyos/src/pdp/decide.ts` — budget-based decisions, audit events
- Role hierarchy: global-admin, tenant-admin, operator, security-reviewer, analyst, viewer
- Tenant isolation enforcement, step-up authentication, MFA requirements
- Data residency policies: `companyos/policies/bundles/data-residency/residency.rego`
- PII redaction: `companyos/policies/bundles/redaction/redact.rego`
- Export controls: `companyos/policies/disclosure_export.rego`
- Auth middleware: `server/src/middleware/auth.ts`, `service-authz.ts`, `graphql-authz.ts`, `spiffe-auth.ts`
- CI policy gates: 1,200+ lines in `.ci/policies/`
- Supply chain policies: `.github/policies/supplychain/verify.rego`

**Gap:** Minimal. Audit log end-to-end ("who accessed what, when, why") exists in policy but a unified audit viewer/query interface not explicitly evidenced. Redaction enforcement ubiquity across all export paths unclear.

### 11. Sovereign Deployment Capability — `GREEN` (High)

**Evidence:**
- Air-gapped deployment profile: `deploy-profiles/airgap/README.md` (278 lines, v1.0.0, production ready)
- Helm overlay: `helm/overlays/v041/` (sovereign safeguards)
- Sync service: bidirectional via physical media, CLI (`deploy-profiles/airgap/scripts/sync-cli.sh`), REST API
- Cryptographic: RSA-SHA256 signing (4096-bit), chain of trust, mandatory import verification
- Network isolation: default-deny egress, no external DNS/HTTP/registry
- FIPS enforcement, WORM audit storage
- Offline bundles: `scripts/docs/build-offline-bundle.js`, `scripts/build_offline_bundle.sh`
- Offline verification: `scripts/evidence/verify_evidence_bundle_offline.mjs`
- Field kit: `apps/field-kit/src/lib/sync-engine.ts`, mobile offline queue
- Federal tools: `tools/federal/make-evidence-pack.sh`, `prove-airgap.sh`, `prove-gatekeeper.sh`
- Sovereign safeguards policy: `policy/v041/sovereign-safeguards.rego`
- Data residency: `companyos/policies/bundles/data-residency/residency.rego`
- 100+ Dockerfiles, 50+ compose files, Helm charts

**Gap:** Minimal. Update channels (signed artifact distribution for ongoing updates) not explicitly evidenced beyond build-time signing. "Laptop mode" single-binary packaging not visible.

### 12. Developer & Plugin Ecosystem — `GREEN/YELLOW` (High)

**Evidence:**
- Plugin system types: `packages/plugin-system/src/types/plugin.ts` (202 lines) — full lifecycle (UNLOADED → LOADING → LOADED → INITIALIZING → ACTIVE → PAUSED → UNLOADING)
- Plugin context: logger, storage, API (HTTP + GraphQL), event bus
- Plugin management: `server/src/routes/plugins/plugin-admin.ts`, `server/src/marketplace/plugin-manager.ts`
- Plugin registry: `services/plugin-registry/src/routes/pluginRoutes.ts`
- Plugin CLI: `tools/plugin-cli/src/commands/` (create, build, publish, validate)
- Example plugins: data-source, network-visualization, pattern-analytics, threat-intel-connector, NLQ copilot
- Plugin security: `services/redteam/plugin-hardening.ts`, manifest validation, signature schema
- Plugin metrics: `server/src/metrics/pluginMetrics.ts`
- Observability dashboard: `docs/observability/dashboards/plugins.json`
- Connector SDK with manifest schema for data source extensibility

**Gap:** Plugin registry is internal — no external developer portal or marketplace. Versioning/compatibility policy exists in types but not documented as a public contract. SDK documentation for external developers is guides-level, not reference-level.

---

## Summary Scorecard

| # | Component | Your Assessment | Actual Status | Confidence | Delta |
|---|-----------|----------------|---------------|------------|-------|
| 1 | Ontology & semantic layer | YELLOW | **GREEN** | High | +1 |
| 2 | Entity resolution engine | ORANGE | **GREEN/YELLOW** | High | +2 |
| 3 | Temporal intelligence | ORANGE | **GREEN/YELLOW** | High | +2 |
| 4 | Provenance & source attribution | YELLOW | **GREEN** | High | +1 |
| 5 | Data ingestion framework | YELLOW | **GREEN/YELLOW** | High | +1 |
| 6 | Narrative & influence modeling | ORANGE | **YELLOW** | High | +1 |
| 7 | Autonomous investigation agents | YELLOW | **YELLOW** | High | 0 |
| 8 | Graph analytics engine | ORANGE | **YELLOW/ORANGE** | Med-High | +0.5 |
| 9 | Investigation workspace (UI/UX) | ORANGE | **YELLOW/GREEN** | High | +2 |
| 10 | Governance & access control | YELLOW | **GREEN** | High | +1 |
| 11 | Sovereign deployment capability | ORANGE | **GREEN** | High | +2 |
| 12 | Developer & plugin ecosystem | RED | **GREEN/YELLOW** | High | +3 |

**Bottom line:** You are significantly further along than the initial estimate suggested. 7 of 12 components are at GREEN or GREEN/YELLOW. No component is RED. The weakest areas are graph analytics (fragmented, not unified) and narrative influence modeling (schema exists, propagation algorithms don't).

---

## Revised Practical Roadmap (Adjusted for Actual State)

Since the codebase is far more mature than initially estimated, the roadmap shifts from "build foundations" to "harden, unify, and close gaps."

### Phase 0 (Week 0-1): Unify the Graph Contract

**What exists:** Distributed type definitions across Cypher, GraphQL, Python, and TypeScript.
**What's missing:** A single canonical type registry that all schemas derive from.

**Deliverables:**
1. Create `schema/canonical/types.yaml` — single source of truth for entity types, relation types, required fields
2. Add CI check: all Cypher constraints, GraphQL types, and TypeScript interfaces must derive from this file
3. Enforce evidence-required writes as a hard gate (not advisory) at the graph boundary

**Verification:** `make schema-lint` passes; a write without `source_refs` is rejected at runtime.

---

### Phase 1 (Weeks 1-3): Graph Analytics as a Unified Service

**What exists:** Fragments across threat-analytics, tactic-matcher, graph-xai, predictive services.
**What's missing:** A single analytics service with standard algorithms, reproducible jobs, and provenance on outputs.

**Deliverables:**
1. `services/graph-analytics/` — unified service wrapping Neo4j GDS algorithms
2. Standard jobs: community detection, centrality (betweenness, PageRank), anomaly detection, path analysis
3. All outputs written back to graph as derived artifacts with provenance
4. Job scheduling and reproducibility (same input → same output → same provenance hash)

**Verification:** "Find key brokers in network X" returns ranked results with provenance chain in < 5s.

---

### Phase 2 (Weeks 2-5): Narrative Influence Propagation

**What exists:** Narrative graph schema, cognitive modeling, tactic matcher, debiasing.
**What's missing:** Propagation algorithms, cascade prediction, counter-narrative detection.

**Deliverables:**
1. Influence propagation model: independent cascade or linear threshold on the narrative graph
2. Cascade prediction: given a narrative seed, estimate reach and timeline
3. Counter-narrative detection: identify narratives with high `DISPUTED_BY` density
4. Longitudinal campaign tracker: narrative → amplification timeline → impact metrics

**Verification:** Given a seeded narrative, propagation model produces reach estimate matching backtest within 20%.

---

### Phase 3 (Weeks 3-6): Agent-to-Graph Verification Loop

**What exists:** 24+ agents, orchestration platform, agent contracts.
**What's missing:** Mandatory verification gate before agent writes to graph; critic/verifier agents; eval harness.

**Deliverables:**
1. `AgentGraphWriter` interface — all agent graph writes go through a single gate
2. Verification pipeline: schema check → provenance check → policy check → optional critic agent review
3. Eval harness: regression test suite for agent outputs (golden set of expected graph mutations)
4. Continuous monitoring investigations: agents that subscribe to graph changes and re-evaluate

**Verification:** An agent that produces a malformed claim is blocked; eval harness catches regressions in CI.

---

### Phase 4 (Weeks 4-7): Investigation Workspace Completion

**What exists:** Investigation service (875 lines), timeline, evidence binder, real-time state, RBAC.
**What's missing:** Hypothesis board, pin-and-cite workflow, unified 5-tab workspace.

**Deliverables:**
1. Hypothesis board component: create/link/score/invalidate hypotheses tied to evidence nodes
2. Pin-and-cite: every workspace annotation links to a claim or evidence node in the graph
3. Unified workspace: single view with tabs (Timeline, Graph, Evidence, Hypotheses, Reports)
4. Graph view within investigation: scoped subgraph visualization

**Verification:** A journalist/analyst completes one investigation (intake → findings → report) without leaving the workspace.

---

### Phase 5 (Weeks 5-8): Entity Resolution Hardening

**What exists:** ER service with merge/split, HDBSCAN, H2L queues.
**What's missing:** Multilingual alias handling, re-scoring on new evidence, queryable alias table.

**Deliverables:**
1. First-class alias table: queryable entity showing all known names/identifiers per canonical entity
2. Multilingual support: transliteration-aware fuzzy matching (Cyrillic, Arabic, CJK)
3. Re-scoring pipeline: when new evidence arrives, affected merges are re-evaluated
4. Alias API: `GET /entities/:id/aliases` returns full alias history with provenance

**Verification:** "Putin" variants (Путин, بوتين, プーチン) collapse reliably with audit trail.

---

### Phase 6 (Weeks 6-10): Connector SDK Formalization

**What exists:** 32+ connectors, manifest schema, registry.
**What's missing:** Formal `discover() → fetch() → normalize() → extract() → load()` interface; uniform idempotency.

**Deliverables:**
1. `ConnectorInterface` — typed contract with 5 required methods
2. Idempotency guarantees: every connector must declare and enforce at-least-once or exactly-once
3. Connector test harness: `make test-connector CONNECTOR=rss` runs standard acceptance suite
4. "Adding a new source is writing a connector" documentation with worked example

**Verification:** New connector passes standard acceptance suite on first integration.

---

### Phase 7 (Weeks 8-12): Audit Viewer & Governance Completeness

**What exists:** 100+ OPA policies, ABAC, PDP, tenant isolation.
**What's missing:** Unified audit query interface; redaction enforcement verification across all export paths.

**Deliverables:**
1. Audit query API: "who accessed entity X between dates Y and Z, and why"
2. Audit viewer UI: searchable, filterable, exportable
3. Redaction enforcement test: every export path (GraphQL, REST, file export, sync) verified for policy compliance
4. Governance dashboard: policy coverage metrics, violation trends

**Verification:** Security reviewer can answer "who saw this entity last week" in < 30s.

---

### Phase 8 (Weeks 10-14): Sovereign Distribution Polish

**What exists:** Airgap profiles, offline bundles, field kit, FIPS, federal tools.
**What's missing:** Signed update channels, laptop-mode packaging.

**Deliverables:**
1. Update channel: signed OCI artifacts pushed to internal registry; airgapped environments pull via physical media with verification
2. Laptop mode: single `docker compose up` profile with embedded models, minimal footprint
3. Third-party deployment runbook: step-by-step guide, tested by someone unfamiliar with the codebase
4. Deployment smoke test: automated validation that a fresh deploy is functional

**Verification:** A third party deploys Summit from scratch in < 4 hours using only the runbook.

---

### Phase 9 (Weeks 12-16): Plugin Ecosystem Externalization

**What exists:** Plugin system, registry, CLI, example plugins, security hardening.
**What's missing:** External developer portal, reference-level SDK docs, public versioning contract.

**Deliverables:**
1. Developer portal: hosted docs with API reference, tutorials, changelog
2. Semantic versioning contract: plugin API stability guarantees (breaking vs. non-breaking)
3. Plugin compatibility matrix: which plugin SDK versions work with which Summit versions
4. External registry: publish/discover/install third-party plugins

**Verification:** An external developer builds and publishes a working plugin using only public docs.

---

## Priority Matrix (What to Do First)

Ordered by **impact × gap size** (biggest bang for the buck given current state):

| Priority | Phase | Component | Why |
|----------|-------|-----------|-----|
| 1 | 0 | Unify Graph Contract | Prevents drift; 1 week; enables everything else |
| 2 | 1 | Graph Analytics Service | Biggest functional gap; turns data into insight |
| 3 | 2 | Narrative Propagation | Core differentiator; schema ready, algorithms missing |
| 4 | 3 | Agent Verification Loop | Safety-critical; agents exist but lack guardrails |
| 5 | 4 | Investigation Workspace | User-facing; close to done, needs final tabs |
| 6 | 5 | ER Hardening | Incremental; existing service needs edge cases |
| 7 | 6 | Connector SDK Formalization | Incremental; standardize what already works |
| 8 | 7 | Audit Viewer | Governance completeness; enterprise sales enabler |
| 9 | 8 | Sovereign Polish | Near-complete; packaging and docs |
| 10 | 9 | Plugin Externalization | Platform play; requires stable internals first |

---

## Next 7 Days (Concrete Actions)

1. **Create `schema/canonical/types.yaml`** — single type registry, 1 day
2. **Add `make schema-lint` CI gate** — enforce type derivation, 0.5 day
3. **Scaffold `services/graph-analytics/`** — unified analytics service skeleton, 1 day
4. **Implement community detection + centrality jobs** — first two algorithms, 2 days
5. **Wire agent graph writes through `AgentGraphWriter` gate** — mandatory verification, 2 days

These five actions close the two largest gaps (graph analytics, agent verification) while establishing the contract that prevents future drift.
