# GA Cut List (Must-Have vs. Defer)

This document strictly defines the feature set for the General Availability (GA) release.
**Rule:** If it is not in the "MUST HAVE" list, it is deferred. No gray zones.

## MUST HAVE (GA Blockers)

**Criteria:** Critical to completing a Tier-0 Journey, ensuring security/compliance, or meeting core SLOs.

### 1. Core Workflow (Tier-0)

- **Auth**: Self-serve Sign-up, Login (MFA), Tenant Switching.
- **Ingest**: Connectors Catalog (5+ certified), Ingest Wizard (Schema Mapping), Streaming ETL (10k/sec), Entity Resolution (Deterministic).
- **Explore**: Global Search, Link-Analysis Canvas (10k nodes), Tri-pane View (Map/Graph/Timeline).
- **AI**: NL->Cypher Copilot, RAG with Citations (Redaction Aware).
- **Admin**: User Management (RBAC), Audit Logs (Immutable), Export Data.

### 2. Platform & Security (Epic F + K)

- **Security**: Multi-tenant Isolation (RLS), OIDC/SSO, RBAC/ABAC, Secret Management.
- **Governance**: OPA Policy Gates (CI/Release), SBOM Generation, Container Signing.
- **Compliance**: Comprehensive Audit Trail, K-anonymity for Exports.

### 3. Collaboration (Epic E)

- **Cases**: Case spaces with immutable audit.
- **Collaboration**: Comment threads bound to graph nodes.

### 4. Ops & Reliability (Epic H)

- **Observability**: Metrics/Prometheus Baseline, Structured Logging, Distributed Tracing.
- **Resilience**: Rate Limiting, Basic Circuit Breaking.

## DEFER (Post-GA)

**Criteria:** "Nice to have", "Delight" features, or complex analytics not strictly required for the core loop.

### 1. Advanced Analytics (Epic C)

- **Deferred**: Dynamic Community Detection (Real-time), Predictive Anomaly Scoring, Advanced COA Planner.
- **Reason**: Core pathfinding and basic canvas are sufficient for MVP3.

### 2. Advanced Integrations (Epic G)

- **Deferred**: Magic Paste (Auto-entity from text), Visual Chat Snippets, Bi-directional MISP sync (Basic export is sufficient).
- **Reason**: Manual ingest and standard connectors cover 90% of use cases.

### 3. UX Polish (Epic I)

- **Deferred**: Advanced Graph Animations, "Cognitive Load Guardrails" (Dimming), Drag-and-drop Narrative Builder.
- **Reason**: Functional Tri-pane view is the priority.

### 4. Advanced Ops

- **Deferred**: Predictive Latency Heatmaps, Smart Query Budgeter with Hints.
- **Reason**: Standard scaling and alerts are sufficient for initial GA load.

### 5. Experimental / Beta

- **Deferred**: Any "Black Project" not explicitly whitelisted.
- **Deferred**: "Fearsome Delight" features.
