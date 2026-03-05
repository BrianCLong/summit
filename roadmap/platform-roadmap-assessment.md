# Summit Platform Roadmap Assessment

**Date:** 2026-03-05
**Scope:** 12 Palantir-class component assessment + phased build roadmap
**Method:** Codebase audit against `/home/user/summit` repository (v4.2.3)

---

## Part 1: Where You Stand Now

Legend: 🟢 solid / 🟡 partial / 🟠 early / 🔴 missing
Confidence: **High** / **Med** / **Low** (based on codebase evidence)

### 1. Ontology & Semantic Layer — 🟡 Partial (High confidence)

**Evidence found:**
- `intelgraph/schema/` — graph schema definitions exist
- `intelgraph/packages/contracts/` — type definitions for Entities, Claims, Decisions, Sources
- `server/src/provenance/schema.ts` — provenance schema types
- `schemas/provenance/narrative-lineage.v1.json` — narrative lineage schema

**Gaps:**
- No versioned ontology migration mechanism (no `ontology/v1` → `ontology/v2` tooling)
- No schema linting or CI enforcement of ontology constraints
- Type registry and relation registry are implicit in code, not governed as first-class artifacts
- No backward-compatibility policy for schema evolution

### 2. Entity Resolution Engine — 🟠 Early (High confidence)

**Evidence found:**
- IntelGraph has entity CRUD (`POST /entities`, `GET /entities/{id}/context`)
- Entity types defined in contracts package

**Gaps:**
- No dedicated ER service (no probabilistic merges, alias tables, blocking keys)
- No fuzzy matching pipeline
- No merge/unmerge workflow with human-in-the-loop
- No confidence scoring on entity merges
- No multilingual entity normalization

### 3. Temporal Intelligence — 🟠 Early (High confidence)

**Evidence found:**
- Timestamps exist on entities and claims (creation timestamps)
- Events referenced in graph model

**Gaps:**
- No first-class temporal edges (`valid_from`, `valid_to`, `observed_at`)
- No time-slicing queries ("show network as of date X")
- No interval validity model
- No "as-of" views for investigations
- No conflict handling for contradictory claims across time

### 4. Provenance & Source Attribution — 🟡 Partial (High confidence)

**Evidence found (extensive):**
- `packages/provenance/` — dedicated provenance package with receipt schema, tests, replay runner
- `server/src/provenance/` — 20+ modules: ledger, hashChain, lineage, merkle-ledger, witness, evidenceExport, invariants
- `server/src/provenance-integrity-gateway/` — C2PA validation, content signing, deepfake detection, truth bundles
- `provenance/` root — export manifests, signed manifests, schema, in-toto JSONL
- `agents/orchestrator/src/context/provenance/` — ProvenanceGraph, PolicyEngine, ReplayEngine
- `packages/provenance-visualizer/` — UI components (ChainOfCustodyViewer, MerkleTreeViewer, ProvenanceChainViewer)
- `cogwar/provenance/ledger.py` — Python-side provenance

**Gaps:**
- End-to-end enforcement incomplete — CRITICAL_NEEDS_LEDGER CN-005 confirms audit logging is console-only
- Graph does not reject claims without `source_refs` + `extraction_ref` (no write-time policy gate)
- Multiple provenance implementations across services (server, intelgraph, maestro, cogwar) — not unified
- Provenance integrity gateway services appear to be defined but integration status unclear

### 5. Data Ingestion Framework — 🟡 Partial (Med-High confidence)

**Evidence found:**
- `services/` directory contains 30+ service directories suggesting modular architecture
- Switchboard service referenced as ingestion layer in CRITICAL_PATH_MAP
- Pipeline infrastructure in `intelgraph/pipelines/`
- Multiple data source integrations referenced

**Gaps:**
- No standardized Connector SDK interface (`discover()`, `fetch()`, `normalize()`, `extract()`, `load()`)
- Services exist in isolation — CRITICAL_PATH_MAP explicitly states "no shared event bus, API gateway, or unified contract repository"
- Adding a new source requires custom integration work, not "write a connector"
- No idempotent queue/job model documented

### 6. Narrative & Influence Modeling — 🟠 Early (Med confidence)

**Evidence found:**
- `cogwar/` directory — cognitive warfare modules exist
- `cogwar/provenance/` — narrative provenance
- `schemas/provenance/narrative-lineage.v1.json` — narrative lineage schema
- `server/src/provenance-integrity-gateway/NarrativeConflictService.ts` — narrative conflict detection
- `intelgraph/cognitive_bias_detector.py`, `deception_detector.py`, `cognitive_modeling.py`

**Gaps:**
- No unified graph schema for narrative propagation networks
- No influence flow algorithms as a concrete subsystem
- Cognitive warfare modules appear research-grade, not integrated into investigation workflows
- No UI workflows for narrative analysis

### 7. Autonomous Investigation Agents — 🟡 Partial (High confidence)

**Evidence found:**
- `agents/` directory with orchestrator, governance agents
- `services/agent-execution-platform/`, `agent-gateway/`, `agent-runtime/`, `agentic-mesh-evaluation/`
- `AGENTS.md` — agent registry
- `AGENT_CONTRACT.md` — binding contract for agent behavior
- `roadmap/agentic-roadmap.md` — comprehensive agentic capabilities roadmap
- Multi-agent orchestration (Maestro/Conductor) architecture

**Gaps:**
- Agents don't write structured artifacts to the evidence graph as system of record (gap between chat output and graph writes)
- No verification loop: critic/verifier agents with deterministic checks before graph merge
- No eval harness for agent regression testing
- Agent security audit (CN-010): federal intelligence integration uses mock data

### 8. Graph Analytics Engine — 🟠 Early (Med confidence)

**Evidence found:**
- `intelgraph/graph_analytics/` — graph analytics module exists
- Neo4j 5.x as graph database (full Cypher support)
- NL2Cypher service for natural language to graph queries

**Gaps:**
- No repeatable analytics job framework (community detection, centrality, anomaly, flow analysis)
- Analytics outputs not saved back to graph as derived artifacts with provenance
- No "find key brokers in this network" as a one-click operation
- Graph analytics appear exploratory, not productionized

### 9. Investigation Workspace (UI/UX) — 🟠 Early (Med confidence)

**Evidence found:**
- `intelgraph/client/` — React frontend exists
- `packages/provenance-visualizer/` — provenance chain visualization components
- Report Studio service referenced in architecture
- `packages/intelgraph-server/src/provenance/components/NodeDetailsPanel.tsx`

**Gaps:**
- No evidence of core workspace primitives shipped:
  - Timeline view (temporal)
  - Evidence binder (per-investigation)
  - Hypothesis board
  - Graph exploration view with pin & cite
- Investigation object model (scope, goal, hypotheses) not found as first-class entity
- Cannot confirm an analyst can run a complete investigation without leaving Summit

### 10. Governance & Access Control — 🟡 Partial (High confidence)

**Evidence found:**
- `governance/`, `policy/`, `compliance/` directories exist
- OPA/ABAC referenced in architecture (Policy-LAC service)
- Extensive compliance documentation: ISO mapping, SOC mapping, controls inventory
- `agents/orchestrator/src/context/provenance/PolicyEngine.ts`
- SLSA/SBOM/cosign infrastructure referenced

**Gaps (per CRITICAL_NEEDS_LEDGER):**
- CN-001: API routes lack authentication middleware (🔴 CRITICAL)
- CN-002: Policy enforcement missing at execute time (🔴 CRITICAL)
- CN-003: Tenant isolation not enforced in core API (🔴 CRITICAL)
- CN-005: Audit logging is console-only (🔴 CRITICAL)
- CN-011: RBAC is in-memory only, no persistence
- CN-012: RBAC never integrated with API routes
- Pattern: "well-designed frameworks with incomplete enforcement"

### 11. Sovereign Deployment Capability — 🟠 Early (Med confidence)

**Evidence found:**
- `compose/` — Docker Compose files
- `terraform/` — Infrastructure as Code
- `charts/` — Helm charts for Kubernetes
- `architecture_and_plan.md` — AWS EKS migration plan with detailed runbooks
- Multiple environment profiles suggested

**Gaps:**
- No offline bootstrap bundle
- No local model gateway option
- No signed artifact update channels
- No "laptop mode" vs "cluster mode" packaging
- Third-party deployment without your help not yet achievable

### 12. Developer & Plugin Ecosystem — 🔴 Missing (High confidence)

**Evidence found:**
- Monorepo structure with `packages/` for shared code
- `.claude/commands/` — 50+ reusable command templates (internal tooling)
- `.claude/skills/` — structured skill definitions

**Gaps:**
- No plugin interface contracts (connectors, analytics modules, UI panels, agent skills)
- No plugin SDK or registry
- No versioning + compatibility policy for extensions
- No external developer documentation
- Platform extensibility is internal-only

---

## Part 2: Summary Scorecard

| # | Component | Status | Confidence | Blocking Issues |
|---|-----------|--------|------------|-----------------|
| 1 | Ontology & semantic layer | 🟡 Partial | High | No versioning/migration, no CI enforcement |
| 2 | Entity resolution engine | 🟠 Early | High | No ER service, no fuzzy matching |
| 3 | Temporal intelligence | 🟠 Early | High | No temporal edges, no time-slicing |
| 4 | Provenance & source attribution | 🟡 Partial | High | Not end-to-end enforced, fragmented implementations |
| 5 | Data ingestion framework | 🟡 Partial | Med-High | No connector SDK, services isolated |
| 6 | Narrative & influence modeling | 🟠 Early | Med | Research-grade, not productionized |
| 7 | Autonomous investigation agents | 🟡 Partial | High | No graph-write contract, no eval harness |
| 8 | Graph analytics engine | 🟠 Early | Med | No repeatable job framework |
| 9 | Investigation workspace | 🟠 Early | Med | Core primitives not shipped |
| 10 | Governance & access control | 🟡 Partial | High | 4 CRITICAL gaps per needs ledger |
| 11 | Sovereign deployment | 🟠 Early | Med | No offline/portable packaging |
| 12 | Plugin ecosystem | 🔴 Missing | High | No plugin contracts or SDK |

**Overall:** 4 partial, 7 early, 1 missing. Strong architectural intent with significant enforcement and integration gaps.

---

## Part 3: Practical Roadmap (Prioritized, Step-by-Step)

Sequenced for maximum compounding value and minimum rebuilds.
Core principle: **Graph-first + Evidence-first**.

### Phase 0 — Lock the Platform Contract (Week 0–1)

**Goal:** Prevent architectural drift.

**Deliverables:**
- **Summit Canonical Data Contract v1**
  - Primitives: Entity, Event, Relationship, Evidence, Claim, Narrative (Narrative can be stubbed)
  - Required fields: `id`, `type`, `time`, `confidence`, `source_refs`, `provenance`
- **Graph-as-SoR rule:** "No final outputs without writing structured artifacts to the graph"
- **Versioned ontology module** + migration mechanism (`ontology/v1`, `ontology/v2`)

**Why first:** If skipped, everything else gets refactored later.

**Verification:**
- Contract schema passes JSON Schema validation
- At least one service enforces required fields on write

---

### Phase 1 — Evidence + Provenance End-to-End (Weeks 1–3)

**Goal:** Every claim is traceable and reproducible. ("Proof Moat" foundation)

**Build:**
1. **Provenance engine hardening** — unify the 5+ provenance implementations into one canonical service
   - Source objects (URL/doc/file hash, capture timestamp, fetch method)
   - Extraction objects (model/tool version, prompt hash, parameters)
   - Transformation objects (normalization steps)
2. **Evidence binder** — per investigation: all sources + all extractions + all derived claims
3. **Policy: evidence required** — graph rejects claims without `source_refs` + `extraction_ref`

**Exit criteria:**
- Any UI/agent output links to a claim node and its evidence chain
- Write without provenance returns 400

**Verification:**
- Integration test: create claim without source_refs → rejected
- Integration test: create claim with full provenance → accepted + chain verifiable

---

### Phase 2 — Ingestion Framework as Connector SDK (Weeks 2–6)

**Goal:** Scale data ingestion without bespoke work each time.

**Build:**
- **Connector interface:**
  - `discover()` — what's available
  - `fetch()` — retrieve artifacts
  - `normalize()` — canonical format
  - `extract()` — entities/relations/events/claims
  - `load()` — write to graph with provenance
- **Queue + job model** (idempotent, retryable, debuggable)
- **Golden 5 connectors** that prove generality:
  1. RSS/news
  2. SEC/corporate filings (or equivalent)
  3. Sanctions list ingestion
  4. Court docket or public records source
  5. Social platform capture (minimal)

**Exit criteria:**
- Adding a new source is "write a connector," not "hack the core"

**Verification:**
- New connector added in <1 day by following SDK docs
- All 5 connectors pass ingestion → graph → provenance chain test

---

### Phase 3 — Ontology + Entity Resolution (Weeks 4–8)

**Goal:** Stop graph rot; unify identities.

**Build:**
- **Ontology governance:**
  - Type registry, relation registry, constraints
  - Schema linting + CI checks
  - Migrations and backward compatibility
- **Entity Resolution v1:**
  - Alias table + canonical entity IDs
  - Fuzzy matching + blocking keys
  - Merge/unmerge workflow (human-in-the-loop)
  - Confidence scoring + provenance on merges

**Exit criteria:**
- Name variants collapse reliably (with audit trails)
- Analysts can trust entity profiles

**Verification:**
- ER test suite: 100+ known alias pairs resolve correctly
- Merge audit trail queryable in graph

---

### Phase 4 — Temporal Intelligence (Weeks 6–10)

**Goal:** Investigations require timeline truth.

**Build:**
- **Temporal edges:** `valid_from`, `valid_to`, `observed_at`
- **Time-slicing queries:** "show network as of 2017-06"
- **Event model:** events as first-class nodes
- **Conflict handling:** contradictory claims coexist with confidence + sources

**Exit criteria:**
- Timeline view powered by real temporal semantics, not just sorting

**Verification:**
- Cypher query returns different graph state for two different "as-of" dates
- Contradictory claims both visible with respective confidence scores

---

### Phase 5 — Graph Analytics Engine (Weeks 8–12)

**Goal:** Surface structure automatically.

**Build:**
- **Analytics service** with repeatable jobs:
  - Community detection (clusters)
  - Centrality (key nodes)
  - Anomaly detection (sudden connectivity changes)
  - Flow analysis (money/shipping/ownership paths)
- **Save outputs back to graph** as derived artifacts (with provenance)

**Exit criteria:**
- "Find key brokers in this network" works in seconds, reproducibly

**Verification:**
- Analytics job on test dataset produces deterministic results
- Derived artifacts have full provenance chain

---

### Phase 6 — Investigation Workspace v1 (Weeks 10–14)

**Goal:** Make Summit where investigations actually happen.

**Minimum viable workspace:**
- Investigation object (scope, goal, hypotheses, tags)
- Tabs:
  1. Timeline
  2. Graph view
  3. Evidence binder
  4. Hypothesis board
  5. Reports/Exports
- "Pin & cite" workflow: every note links to claim/evidence nodes

**Exit criteria:**
- An analyst can run one complete investigation without leaving Summit

**Verification:**
- End-to-end walkthrough: create investigation → ingest data → explore graph → cite evidence → export report

---

### Phase 7 — Autonomous Investigation Agents (Weeks 12–18)

**Goal:** Agents that update the graph, not just chat.

**Build:**
- **Agent contracts:**
  - Agents must write structured artifacts (claims/evidence/relations)
  - Agents must pass verifiers before merge-to-graph
- **Verification loop:**
  - Critic/verifier agents
  - Deterministic checks (schema, provenance, policy)
  - Eval harness for regressions
- **Continuous monitoring investigations** (subscriptions)

**Exit criteria:**
- Agents run unattended but cannot pollute the graph without gates

**Verification:**
- Agent writes claim → verifier rejects (missing provenance) → agent retries with provenance → accepted
- Eval harness catches regression on known test cases

---

### Phase 8 — Governance & ABAC/OPA Everywhere (Weeks 16–22)

**Goal:** Enterprise readiness. Resolve all CRITICAL items from CN ledger.

**Build:**
- **ABAC/OPA policies applied to:**
  - Graph reads/writes
  - Connector access
  - Agent tool use
  - Exports
- **Audit log end-to-end:** who accessed what, when, and why (resolve CN-005)
- **Redaction + data handling rules**
- **Resolve:** CN-001 (auth middleware), CN-002 (execute-time policy), CN-003 (tenant isolation)

**Exit criteria:**
- Credibly pitch "governed intelligence platform," not "cool OSINT toy"

**Verification:**
- Penetration test: unauthenticated request → 401
- Cross-tenant query → 403
- Audit log query returns full access history

---

### Phase 9 — Sovereign Deployment Kit (Weeks 18–26)

**Goal:** Ship Summit into constrained environments.

**Build:**
- **Reproducible deployment:**
  - Docker/K8s profiles (extend existing Helm charts)
  - Offline bootstrap bundle
  - Local model gateway option
- **Update channels:** signed artifacts, verified updates
- **"Laptop mode"** + **"Cluster mode"**

**Exit criteria:**
- A third party can deploy without your help in a week

**Verification:**
- Cold-start deployment on clean VM succeeds (scripted, no manual steps)
- Offline mode: all core features work without internet

---

### Phase 10 — Plugin Ecosystem + Registry (Weeks 22–30)

**Goal:** Become a platform others extend.

**Build:**
- **Plugin interface contracts:**
  - Connectors
  - Analytics modules
  - UI panels
  - Agent skills
- **Versioning + compatibility policy**
- **Plugin registry** (internal at first)

**Exit criteria:**
- External teams can build features without touching core

**Verification:**
- Third-party connector built using only SDK docs + registry
- Plugin passes compatibility checks in CI

---

## Part 4: Critical Sequencing

**Do not reorder.** Each phase builds on the prior:

```
Phase 0: Platform Contract
    ↓
Phase 1: Provenance (enforced)
    ↓
Phase 2: Ingestion SDK ←── parallel start with Phase 1
    ↓
Phase 3: Ontology + ER
    ↓
Phase 4: Temporal
    ↓
Phase 5: Analytics
    ↓
Phase 6: Workspace ←── parallel start with Phase 5
    ↓
Phase 7: Agents
    ↓
Phase 8: Governance ←── can start partial in Phase 1 (CN criticals)
    ↓
Phase 9: Sovereign Deploy
    ↓
Phase 10: Plugin Ecosystem
```

**Compounding logic:**
- Contract → Provenance: can't enforce evidence without defining what evidence is
- Provenance → Ingestion: connectors must produce provenance-compliant artifacts
- Ingestion → ER: can't resolve entities you haven't ingested cleanly
- ER → Temporal: temporal edges need stable entity IDs
- Temporal → Analytics: analytics need time-aware graph
- Analytics → Workspace: workspace surfaces analytics results
- Workspace → Agents: agents need a workspace to write into
- Agents → Governance: governance gates agent behavior
- Governance → Sovereign: deployment must enforce governance
- Sovereign → Plugins: plugins must work in sovereign environments

---

## Part 5: Next 7 Days — Risk Reduction Sprint

| Day | Action | Artifact |
|-----|--------|----------|
| 1 | Write Canonical Graph Contract v1 (primitives + required fields) | `schemas/canonical-contract-v1.json` |
| 2 | Enforce evidence-required writes at graph boundary | Integration test + write-gate middleware |
| 3 | Stand up Connector SDK skeleton | `packages/connector-sdk/` with interface + 1 connector |
| 4 | Add ontology versioning + schema linting in CI | CI workflow + `ontology/v1/` directory |
| 5 | Start ER v1 (alias table + merge audit) | `services/entity-resolution/` skeleton |
| 6 | Unify provenance implementations (audit the 5+ copies) | Dependency graph + consolidation plan |
| 7 | Resolve CN-001 (auth middleware on API routes) | Auth middleware + integration tests |

---

## Assumption Ledger (per S-AOS §1)

**Assumptions:**
- Assessment based on file/directory presence and content sampling, not full execution
- Service functionality inferred from code structure; some services may be more/less complete than indicated
- CRITICAL_NEEDS_LEDGER (dated 2025-12-30) assumed still current
- Week estimates assume 2–3 engineers focused; adjust linearly for team size

**Ambiguities:**
- Exact state of graph analytics module (`intelgraph/graph_analytics/`) — could be more complete than assessed
- Integration status of provenance-integrity-gateway services — may be further along than file presence suggests
- Whether `cogwar/` modules are actively maintained or experimental

**Tradeoffs:**
- Chose to sequence governance (Phase 8) late despite CRITICAL needs — rationale: governance enforcement is more effective when applied to a stable contract (Phase 0) and unified provenance (Phase 1). However, CN-001 (auth) should be fixed immediately as a security prerequisite.
- Plugin ecosystem last because premature platformization creates API surface debt

**Stop condition:**
- If any Phase 0 contract decision is contested, stop and align before proceeding
- If CN-001/CN-002/CN-003 are exploitable in production, prioritize governance over all other phases
