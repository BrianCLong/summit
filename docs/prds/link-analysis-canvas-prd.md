# Link Analysis Canvas — Product Requirements Document (PRD)

| Version | Status | Owner | Last Updated |
| ------- | ------ | ----- | ------------- |
| v1.0    | Decision-ready | Summit Product | 2025-09-29 |

## 1. Executive Summary
- **What**: Deliver a tri-pane investigative workspace (graph, timeline, map) with shared pinboards, annotations, and explainable insights for mission analysts.
- **Why**: Analysts require faster signal triage, provenance tracking, and collaboration on complex networks without exporting data to ungoverned tools.
- **How**: Build on the existing IntelGraph data plane and Canvas Ops Pack to provide deterministic graph operations (pivot, expand, filters) with governance, observability, and rollout guardrails baked in.

## 2. Goals & Non-Goals
### 2.1 Goals
1. Launch a production-ready link analysis canvas embedded in the Summit Maestro control plane.
2. Reduce case triage time by ≥35% through synchronized filtering, guided explain panels, and saved workflows.
3. Provide audit-ready provenance across all canvas actions with secure collaboration primitives.
4. Instrument full telemetry (usage, cost, SLO) to feed Maestro evaluation and budgeting agents.

### 2.2 Non-Goals
- Building net-new graph ingestion pipelines (reuse IntelGraph ingestion + entity resolution).
- Delivering full-spectrum geospatial analytics beyond map tiling, bounding boxes, and region filters.
- Replacing specialized tradecraft workbenches (e.g., IMINT exploitation) outside link analysis scope.

## 3. Personas & User Journeys
- **Mission Analyst (Primary)**: Investigates emerging threats, builds relationship graphs, and briefs leadership. Needs rapid pivoting, timeline correlation, and sharable narratives.
- **Supervisory Reviewer (Secondary)**: Verifies case integrity, ensures policy adherence, and signs off on escalations. Requires audit trails, explain panels, and workflow templates.
- **Partner Liaison (Tertiary)**: Receives curated subsets for coalition sharing. Needs exportable pinboards with attribution and guardrails.

### Key Journeys
1. **Signal to Story**: Analyst ingests STIX feeds → filters by last 48 hours → pivots on suspicious node → pins key entities → exports annotated board for review.
2. **Case Continuity**: Reviewer opens saved board → replays timeline scrubs → validates provenance → adds approval note → publishes to operations channel.
3. **What-if Exploration**: Analyst expands on new alias → applies geofence → toggles ML-suggested communities → bookmarks for follow-on exploitation.

## 4. Scope & Functional Requirements
| ID | Requirement | Details |
| -- | ----------- | ------- |
| FR1 | **Synchronized Tri-Pane Canvas** | Graph, map, and timeline panes update in <250ms when filters change; share a unified query context.
| FR2 | **Deterministic Graph Ops** | Provide `pivot`, `expand`, `filterByTime`, and `filterBySpace` operations with predictable results and support for bulk node selections.
| FR3 | **Command Palette & Saved Workflows** | Keyboard-first command palette triggers saved queries, playbooks, and macros; expose recents in explain panel.
| FR4 | **Pinboards & Annotations** | Users create named pinboards, add notes, and publish read-only or editable variants.
| FR5 | **Explain Panel** | Reflect active filters, pinned counts, last actions, and provenance references; auto-update after each interaction.
| FR6 | **Collaboration** | Support concurrent editing with presence indicators, change history, and comment threads anchored to nodes or boards.
| FR7 | **Access Control** | Enforce tenant isolation, row-level security, and per-board sharing controls (view/comment/edit).
| FR8 | **Export & Handoff** | Generate signed PDF, JSON-LD, and shareable interactive HTML packages with embedded provenance metadata.
| FR9 | **Resilience & Offline Support** | Autosave state locally; provide reconnection flows with diff review when connectivity is restored.

## 5. Non-Functional Requirements
- **Performance**: Maintain 60 FPS rendering on 5k node / 7k edge graphs and <500ms command palette execution.
- **Scalability**: Horizontal scale to 250 concurrent analysts per region with session stickiness and shared caching.
- **Reliability**: 99.9% availability target; autoscale workers and queue background exports with retries.
- **Security**: FedRAMP High baseline, OPA-enforced policies, SCIM-provisioned roles, and encrypted storage (AES-256 at rest, TLS 1.3 in transit).
- **Compliance**: Full audit log coverage with immutable storage; retention aligned to EO 14117 and agency policy.

## 6. Architecture & Integration
- **Frontend**: React/Vite client using Canvas Ops Pack; integrates with React Flow for nodes, Mapbox for geospatial view, and shared state via Zustand (or equivalent) with OT synchronization.
- **Backend Services**: GraphQL gateway exposing graph traversal APIs, map tile service, timeline aggregation service, and export worker queue (BullMQ).
- **Data Sources**: IntelGraph entity store, Maestro knowledge graph, timeline events, geospatial overlays, ML-suggested communities.
- **Security Layer**: OPA policy engine, ABAC enforcement, feature flags (per-tenant, per-agent), and signed provenance bundles.
- **Observability**: OpenTelemetry traces + metrics (latency, FPS, command palette hits, export success), Grafana dashboards, cost guard integration.

## 7. Telemetry & Success Metrics
| Metric | Target | Notes |
| ------ | ------ | ----- |
| Time-to-first-insight | < 3 minutes | From case open to first pinned insight.
| Canvas action latency | p95 < 250ms | Across pivot, expand, filter operations.
| Saved board reuse | ≥ 40% | Boards reopened or shared at least twice within 30 days.
| Collaboration adoption | ≥ 60% sessions with ≥2 participants | Measures multi-analyst adoption.
| Export success rate | 99% without manual retries | Across PDF/HTML/JSON-LD exports.
| AI suggestion acceptance | ≥ 30% | ML-suggested communities/paths accepted.

## 8. Rollout Plan
1. **Alpha (4 weeks)**
   - Enable FR1–FR5 for internal analysts.
   - Instrument telemetry, gather feedback on performance and usability.
   - Gate sharing/export behind feature flag.
2. **Beta (6 weeks)**
   - Enable FR6–FR8 with guarded external sharing.
   - Integrate Maestro evaluation tasks, run load tests, and conduct security reviews.
   - Launch training materials and playbook templates.
3. **GA (4 weeks)**
   - Harden resilience/offline flows (FR9), finalize compliance attestations.
   - Enable self-service workspace provisioning and autop-runbooks.
   - Transition to SLO-based alerting and open pilot program to coalition partners.

## 9. Dependencies & Risks
- **Dependencies**: IntelGraph ingestion stability, Maestro policy updates, export worker infrastructure, access to map tile provider, ML community detection service.
- **Risks**:
  - *Graph scale spikes* → Mitigate with virtualization and progressive rendering.
  - *Policy drift between tenants* → Automate OPA policy regression tests.
  - *Collaboration data leakage* → Enforce workspace scoping, run data loss prevention scans.
  - *User adoption* → Provide guided walkthroughs, embed contextual help, track drop-offs.

## 10. Acceptance Criteria
- All FR1–FR9 delivered with automated coverage (unit + integration + e2e).
- Telemetry dashboards live with daily trend reports.
- SOC2/FedRAMP documentation updated and signed off.
- Pilot customers trained with recorded demo and quickstart runbook.
- Executive go/no-go review complete with risk register sign-off.

## 11. Appendix
- **Test Coverage**: Cypress e2e suite for link analysis canvas interactions; unit tests for Canvas Ops Pack operations.
- **Operational Playbooks**: Incident response (canvas outages), export queue recovery, policy rollback procedures.
- **Glossary**: Pivot (graph neighbors), Expand (multi-node traversal), Pinboard (saved entity/relationship set with annotations).
