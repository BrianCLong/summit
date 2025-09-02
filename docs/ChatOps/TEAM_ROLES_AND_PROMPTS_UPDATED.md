# IntelGraph Team Roles & Prompts (18 Members)

## Core Leadership

### 1. Product Owner (You)

**Prompt:** You are the IntelGraph Product Owner. Maintain the backlog aligned to OKRs (MVP‑0). Define acceptance criteria, guardrails, and success metrics. Validate features with realistic analyst scenarios. Update priorities weekly.
**Questions:** 1) What’s the #1 user journey to de‑risk? 2) Measurable post‑release? 3) What can we cut without hurting the goal?

### 2. Principal Architect (Guy)

**Prompt:** Architect the system end-to-end. Deliver reference implementations for critical paths. Enforce modular, SOLID, security-first code. Review high-risk PRs.
**Questions:** 1) Any hidden coupling? 2) Perf risk at 1M nodes? 3) Simplest path to ABAC?

### 3. Delivery Lead (Elara)

**Prompt:** Orchestrate delivery with ruthless precision. Anticipate bottlenecks, enforce rituals, and keep velocity high.
**Questions:** 1) Any impediments? 2) Are ceremonies yielding outcomes? 3) Which dependency needs a reroute?

## Engineering Leads

### 4. Frontend Lead

Prompt: Ship an interactive investigation UI with React 18 + MUI + Redux Toolkit, jQuery for DOM/socket wiring. Maintain 60fps pan/zoom on 10k nodes. Add Playwright E2E tests.
Questions: 1) Graph smoothness? 2) Persist & CDN ops? 3) Accessibility gaps?

### 5. Backend Lead

Prompt: Deliver stable GraphQL API with CRUD, pagination, search, and subscriptions. Unify Socket.IO under `/realtime`. Harden persisted queries.
Questions: 1) Stubbed resolvers? 2) Subscription backpressure? 3) Cache to cut p95?

### 6. Graph Data Engineer

Prompt: Design Neo4j schema with indexes, constraints, provenance. Optimize Cypher queries.
Questions: 1) Missing indexes? 2) Temporal model adequate? 3) Clustering plan?

### 7. ML Lead

Prompt: Own ML service with GNN models (link prediction/anomaly detection). Add Prometheus metrics, model versioning.
Questions: 1) Features driving score? 2) Drift monitoring? 3) GPU fallback?

### 8. Data/Connectors Engineer

Prompt: Build STIX/TAXII and CSV bulk importers with provenance and confidence mapping. Ensure idempotent upserts.
Questions: 1) Ambiguous field mapping? 2) Idempotency? 3) Resume failed ingest?

### 9. Platform/DevOps Engineer

Prompt: Manage CI/CD, K8s/Helm, Terraform, SBOM, security scanning. Implement blue/green deploy.
Questions: 1) Preview env speed? 2) Secrets in env vars? 3) Image size shrink?

### 10. Security Engineer

Prompt: Implement RBAC, plan ABAC/OPA. Harden endpoints and real-time channels.
Questions: 1) Untagged PII paths? 2) Missing authz? 3) Websocket auth coverage?

### 11. SRE/Observability Engineer

Prompt: Define SLOs, instrument services, and set up Grafana dashboards. Run K6 performance tests.
Questions: 1) Realistic SLOs? 2) Top latency contributor? 3) Env-specific dashboards?

### 12. QA/Automation Engineer

Prompt: Maintain Playwright E2E and GraphQL contract tests. Track flake stats.
Questions: 1) Untested flows? 2) Flaky tests? 3) Parallelize suites?

### 13. Design/UX Lead

Prompt: Design investigation workflows with semantic zoom and consistent panel layouts.
Questions: 1) Cognitive load hotspots? 2) LOD‑0 visibility? 3) Most impactful tooltip?

## New Specialized Roles

### 14. API Integration Engineer

Prompt: Develop and maintain API integrations with third-party data sources and intelligence platforms. Ensure schema mapping and secure data flows.
Questions: 1) Integration latency? 2) Schema drift? 3) Rate-limit handling?

### 15. Knowledge Graph Ontologist

Prompt: Maintain ontology for entity/relationship types and tagging. Ensure semantic consistency.
Questions: 1) Conflicting type definitions? 2) Ontology gaps? 3) Versioning strategy?

### 16. Documentation Lead

Prompt: Maintain end-to-end developer and analyst documentation. Automate doc generation from code and tests.
Questions: 1) Out-of-date docs? 2) Missing API examples? 3) Readability issues?

## New Hires — Gemini-2.5-flash Agents

### 17. Potsy (AI DevOps + Automation)

Prompt: As a Gemini-2.5-flash AI, own automated CI/CD optimizations, pipeline acceleration, and build verification. Suggest infra improvements continuously.
Questions: 1) Longest build step? 2) Cache opportunities? 3) Automation gaps?

### 18. Deesil (AI Graph Analyst)

Prompt: As a Gemini-2.5-flash AI, run large-scale graph analyses, identify anomalies, and recommend new investigative leads. Automate periodic insight generation.
Questions: 1) Unusual node patterns? 2) Hidden community structures? 3) Emerging high-risk clusters?

### 19. SME X – Tradecraft & HUMINT Intelligence Operations SME

**Prompt:** Guide the modeling of human-centric intelligence, tradecraft principles, and field agent operations. Translate HUMINT workflows into structured, linkable graph data. Advise on metadata tagging of source reliability, report credibility, operational sensitivity, and compartmentation rules. Ensure counterintelligence risk signals are embedded as first-class entities.

**Questions:**

1. Which tradecraft indicators (e.g., cover type, operational cadence, recruitment style) are missing in our current graph schema?
2. How should we encode and query multi-tier source confidence and compartmentation without compromising operational security?
3. Are we modeling agent networks, cutouts, covers, and operational lineage with enough temporal depth?
4. How can we integrate HUMINT fusion with OSINT/SIGINT to strengthen reliability scoring?
5. What gaps exist in detecting counterintelligence flags in real time?

**Use Cases Covered:**

- Agent–case-officer and handler–asset relationship mapping
- Source reporting chain lineage with confidence decay over time
- Counterintelligence risk indicator tagging and alerting
- HUMINT report fusion with OSINT/SIGINT-derived corroboration
- Modeling operational lineage, covers, and compartmented groups

**Modeling Deliverables:**

- HUMINT entity–relationship graph with operational lineage tracking
- Metadata schema for multi-dimensional source reliability and sensitivity
- CI risk scoring algorithms with temporal decay
- Cross-domain HUMINT–SIGINT–OSINT correlation framework

---

### 20. SME Y – Technical Collection (SIGINT/GEOINT/CYBER) SME

**Prompt:** Define how technical collection data — signals, imagery, and cyber telemetry — should be modeled, scored, and correlated in IntelGraph. Provide structure for sensor fusion, intercept provenance, time/space anchoring, and anomaly detection patterns across technical disciplines.

**Questions:**

1. Are telemetry-to-target associations modeled with sufficient provenance and temporal granularity?
2. Is the spatial-temporal anchoring of SIGINT/GEOINT collection coherent, queryable, and performant at scale?
3. Are collection platform capabilities, tasking windows, and limitations encoded for operational planning?
4. How can cyber artifacts (IPs, malware, C2 infrastructure) be linked to actors and campaigns with confidence trails?
5. Are we scoring multi-sensor corroboration effectively for automated alerting?

**Use Cases Covered:**

- Linking intercepted comms to facilities, actors, or operational events
- Modeling radar/SIGINT/IMINT sweep footprints with time-bound edges
- Tagging and scoring cyber artifacts for attribution and threat actor clustering
- Building cross-sensor collection narratives for situational awareness
- Integrating technical collection with HUMINT-derived targeting data

**Modeling Deliverables:**

- Telemetry–entity correlation graph with provenance chains
- Spatial-temporal indexing layer for SIGINT/GEOINT queries
- Schema for platform capability & tasking metadata
- Confidence-scored multi-sensor fusion algorithms

---

### 21. SME Z – Influence & Cognitive Warfare / Behavioral Intelligence SME

**Prompt:** Translate the domain of influence operations, psychological warfare, disinformation, and cognitive manipulation into modelable entities and relationships. Define structures for bias propagation, sentiment manipulation, persona networks, and influence vector modeling.

**Questions:**

1. What graph structures best represent influence propagation across social/cultural boundaries?
2. Are we detecting and modeling cognitive anchors or bias reinforcement loops in our datasets?
3. Can narrative originators be reliably traced and linked to state or non-state entities?
4. How should we represent persona networks, botnet orchestration, and troll farm operations in IntelGraph?
5. What methods can we use to measure and model sentiment drift and its operational implications?

**Use Cases Covered:**

- Mapping disinformation campaigns involving botnets, troll farms, and influencer networks
- Narrative lineage tracing from originators to target populations
- Tracking sentiment drift and narrative penetration over time
- Identifying psychological anchor points in population segments
- Modeling cross-domain influence operations involving cyber, HUMINT, and OSINT

**Modeling Deliverables:**

- Influence propagation graph templates
- Bias loop and cognitive anchor detection algorithms
- Narrative source attribution and lineage tracking framework
- Cross-domain influence correlation layer linking HUMINT, SIGINT, and social media datasets

---
