# Switchboard Sprint 3 – Command Palette + Tri-Pane Shell (Execution Plan)

## Theme & Goal
- **Theme:** Command Palette + Graph/Timeline Tri-Pane v1 as the default Switchboard cockpit.
- **Goal:** Ship a unified tri-pane layout (Graph / Timeline / Details) powered by a global command palette so operators can jump to entities, incidents, runbooks, and approvals in ≤1.5s with full context and evidence.

## Objectives & Success Criteria
- **Command palette v1**: Cmd/Ctrl+K everywhere, fuzzy search across entities/incidents/runbooks/approvals/tenants, action verbs, keyboard a11y, OPA-filtered results, telemetry for open/latency/CTR.
- **Tri-pane shell default**: Graph (left) + Timeline (center) + Detail (right) for incident/approval/runbook/entity contexts with saved pane sizes and OPA route guards.
- **Timeline & evidence viewer v1**: Queryable by entity/incident/runbook/tenant with evidence receipts and redaction.
- **Perf/Resilience**: p95 tri-pane load < 1.5s for 50k-node context; p95 search < 700ms; p99 search error < 0.5%.

## Architecture (Target v1)
- **Frontend shell (Switchboard UI)**
  - New tri-pane layout route: `/:tenant/:contextType/:id` with panes rendered via lazy-loaded microfeatures.
  - **Graph pane**: mini-explorer showing focus entity + N neighbors with chip filters (Incidents, Runbooks, Approvals, Assets). Uses CompanyOS graph API with pagination and OPA-sanitized edge expansion.
  - **Timeline pane**: virtualized timeline component with filter bar (time range presets, event type, risk). Selecting an event raises a `context:focus` event consumed by graph/detail panes.
  - **Detail pane**: adaptive renderer for incident/approval/runbook execution/entity; evidence drawer reused for event inspection.
  - **State sync bus**: event emitter (or Zustand slice) to broadcast `focus:update`, `timeline:center_on`, `graph:select` messages between panes.
  - **Global command palette**: Cmd/Ctrl+K overlay with grouped results, fuzzy scoring, and action schema; respects active tenant selector.
  - **Telemetry**: OpenTelemetry spans for palette open/search, tri-pane render, graph fetch, timeline query; metrics for load/search latency and click-through rate.
- **Backend**
  - **Search aggregator endpoint** `/api/search`: federates graph entity search, incidents, runbooks, approvals with tenant/ABAC filtering; caches hot queries per-tenant; metrics for `search_requests_total`, `search_latency_ms`, `search_errors_total`.
  - **Command actions** `/api/commands/resolve`: validates action schema + OPA `can_invoke_command`; resolves navigation target and initial pane payloads.
  - **Timeline service** `/api/timeline`: accepts `entity|incident|runbook_execution|tenant` scopes, filter params, and pagination; streams evidence receipts with redaction applied via OPA.
  - **Graph context** `/api/graph/context`: fetch focus entity and paginated neighbors; honors chip filters and OPA edge policies.
  - **Provenance**: every tri-pane load and command invocation emits decision + data access receipts with hashes for evidence bundles.

## Data Contracts
- **Command palette result**: `{ id, type, label, subLabel, tenantId, action?: CommandAction, recentRank? }` with grouped result sets.
- **CommandAction schema**: `{ verb: "open|run|view", targetType, targetId, contextId?, tenantId, params?, auditMeta }` (OPA-evaluable).
- **Timeline event**: `{ id, type, ts, tenantId, entityRefs[], severity?, summary, evidenceRef?, hashes[], redactions[] }`.
- **Graph node/edge**: minimal typed payload with `allowed` flag derived from OPA to prevent forbidden edges leaking.

## Delivery Plan (2-week sprint)
- **Week 1**
  - Implement tri-pane shell + routing, pane resizing, user prefs.
  - Command palette UI (keyboard + mouse + accessibility) with mocked data; start telemetry plumbing.
  - Backend search aggregator stub with tenant-aware filters; contract tests; OpenAPI update.
  - Timeline component scaffold with query/virtualization and evidence drawer shell.
  - Graph mini-explorer integrating graph API pagination and chip filters.
- **Week 2**
  - Wire palette to search endpoint + action resolver; add recent-items suggestion cache.
  - Context synchronization (timeline → detail/graph, graph → timeline/detail) with E2E happy-path tests.
  - OPA policies for search scope, command invocation, graph expansion, evidence redaction; add unit tests.
  - Perf passes: cache tuning, request bundling, lazy loading; instrument p95/p99 metrics and alerts (Grafana panel “Switchboard Shell Health”).
  - Synthetic probe: palette → tri-pane for golden-path incident with evidence inspection.

## Testing & Quality Gates
- **Unit**: palette component (keyboard, grouping, selection), chip filter logic, action schema validator, timeline ordering/filters, OPA policies.
- **Integration**: search aggregator against fixtures; command action → navigation resolution; timeline + evidence redaction flows.
- **E2E**: tri-pane sync scenarios (incident ↔ approval ↔ runbook execution), tenant switch behavior, command palette navigation.
- **Perf**: synthetic load for search (<700ms p95) and tri-pane load (<1.5s p95 for 50k-node graph context); capture span links across panes.
- **Security/Governance**: ABAC/OPA coverage ≥90% for `search`, `tri_pane`, `command`; provenance receipts emitted for tri-pane loads and actions.

## Risks & Mitigations
- **Cross-tenant leakage** → strict OPA guards on search/graph/timeline plus regression tests.
- **Latency regressions** → per-tenant caching + request coalescing; virtualized timeline and graph pagination; synthetic perf gates.
- **UX overload** → chip filters to declutter graph; recent/suggested palette items; defaults tuned for golden-path entities.
- **Evidence sensitivity** → redaction policies with hashes for verification; evidence viewer honors role-based visibility.

## Observability & Ops
- Metrics: `command_palette_open_total`, `search_latency_ms`, `result_click_through_rate`, `tri_pane_load_ms`, `timeline_query_latency_ms`, `graph_load_ms`, `evidence_view_open_total`.
- Tracing: span links between command palette search, tri-pane load, and downstream API calls.
- Dashboards: Grafana “Switchboard Shell Health” showing latency, error rates, click-through, and cache hit ratios.
- Alerts: search/tri-pane p99 error rate >0.5%, latency SLO breaches, tenant-switch anomalies.

## Rollout & Guardrails
- Feature flags for tri-pane shell and palette; progressive rollout per-tenant.
- Fallback navigation to legacy views if tri-pane load fails >p99 0.5%.
- Audit events for `tenant_context_changed`, `command_invoked`, `tri_pane_opened` with actor and reason.

## Stretch/Forward-Looking
- Prefetch + offline cache for recently opened entities; speculative navigation from palette keystrokes.
- ML-assisted result ranking using click-through signals.
- Saved timeline queries and shared tri-pane deep links once v1 stabilizes.
