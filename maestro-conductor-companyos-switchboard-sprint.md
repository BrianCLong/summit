# Maestro Conductor – Alignment with CompanyOS & Switchboard

## High-level summary & 7th+ order implications
- Conductor becomes a **policy-aware, graph-native orchestration engine**; all runs, approvals, and receipts map directly to the Company Graph, enabling lineage, entitlements, and auditable provenance across Switchboard.
- Tenant, environment, and region scoping are enforced end-to-end (API, graph, storage, policy), eliminating cross-tenant leakage and unlocking hosted/white-label packaging.
- OPA/ABAC gates every lifecycle action and emits policy-decision evidence; high-risk flows require Switchboard approvals with dual-control options, producing end-to-end provenance chains.
- Switchboard UX gains run visibility, filtering, and command-palette triggers; p95 detail loading <1.5s targets operational usability.
- Observability, metering, and SLOs make Conductor an operable product with per-tenant usage insight and alerts tied to error-budget burn.
- Supply-chain hardening (SBOM, attestations, signed images) plus Helm/Terraform modules deliver deployability for internal and partner editions.
- Forward-looking: design keeps graph and policy artifacts portable to future federated multi-region topology and adaptive policy simulation pipelines.

## Architecture overview
- **Core services**: Conductor runtime (task runner), Company Graph ingestion/writer, Policy gateway (OPA/ABAC), Provenance ledger emitter, Metrics/metering exporters.
- **Data model (graph)**: Entities `conductor.workflow`, `conductor.run`, `conductor.task`, `conductor.schedule`; edges to `tenant`, `user`, `system`, `resource`, `policy-decision`, `receipt`, with soft-delete/status edges for archival.
- **Scoping**: All entities carry `tenant_id`, `environment`, `region`; API surface requires these in headers/context, and policy inputs mirror them.
- **Policy plane**: Inline policy-check abstraction for `start_workflow`, `cancel_run`, `rerun_task`, `edit_schedule`; decisions logged with IDs and evidence payloads; policy bundles for internal vs. hosted SaaS.
- **Approvals**: High-risk workflows create pending approval objects linked to run templates; Switchboard Approvals center handles dual-control paths; approval provenance recorded and connected to resulting runs.
- **Switchboard integration**: Graph-backed run viewer (tri-pane: list, detail timeline, graph relationships) plus command-palette triggers that are policy-filtered and parameter-aware.
- **Observability & FinOps**: Metrics for latency, failures, queue depth, policy latency; metering events (`run_started`, `run_completed`, `task_executed`) with tenant/environment tags; dashboards and SLO alerting.
- **Packaging & delivery**: SBOM/SLSA attestations + cosign/signature gates; Helm values for internal/partner editions; Terraform wiring for VPC, secrets, logging; synthetic probe for prod-like health.

## Detailed implementation plan
### Workstream 1 — Conductor ↔ CompanyOS Graph Integration
1. **Graph schema**: Add entity/edge specs for workflows/runs/tasks/schedules with attributes (tenant, environment, region, status, soft-delete markers, lineage refs). Auto-generate API types.
2. **Ingestion pipeline**: On run create/update/delete, emit graph mutations with provenance receipts; include evidence link back to Conductor request and user.
3. **Queries**: Prebuild graph queries for runs-by-tenant/time, workflows touching resource, initiator/approver for a run; add integration tests hitting the graph API.

### Workstream 2 — Policy & Approvals (OPA/ABAC)
1. **Policy abstraction**: Central guard for lifecycle actions; denies on missing/deny; logs decision IDs and inputs.
2. **Bundles**: Two profiles (internal, hosted SaaS) differentiated by risk sensitivity and environment/tenant constraints.
3. **Simulation harness**: Scenario files to replay decisions offline; policy tests required for changes.
4. **Approvals**: High-risk workflows generate pending approvals; Switchboard approval paths (including dual-control). Provenance connects approval decisions to runs.

### Workstream 3 — Switchboard Integration
1. **Run viewer**: Tri-pane UI with list filters (status, workflow, date, environment, tenant), timeline of state changes, graph pane showing linked entities.
2. **Command palette**: Actions to trigger policy-permitted workflows; indicates “Requires Approval” for high-risk; parameter form submission routes to run detail/approval.
3. **Performance**: Target p95 <1.5s on agreed dataset; include caching or pagination as needed.

### Workstream 4 — Observability & FinOps
1. **Metrics**: Export run latency (p50/p95), task failure rate, policy decision latency, queue depth.
2. **Dashboards & SLOs**: Maestro overview, per-tenant volume; SLOs (start→complete, policy p99) with alerting on error-budget burn.
3. **Metering**: Emit usage events with tenant/workflow/environment/resource hints; FinOps report for per-tenant usage.

### Workstream 5 — Security, Packaging, Runbooks
1. **Supply chain**: SBOM + SLSA attestations; signed images; OPA gate in CI/CD to block unsigned artifacts; evidence recorded.
2. **Deploy artifacts**: Helm values for internal vs. partner; Terraform module wiring for VPC/secrets/logging; single-command deployment paths.
3. **Runbooks**: Release/deploy instructions and operational debugging snippets; DRY-run deployment evidence.

## Backlog (ticket-ready), with priorities
- **P0**
  - Graph schema + API generation for Conductor entities and edges.
  - Policy gate for start/cancel/rerun/edit actions with provenance logging.
  - High-risk approval flow (pending approval objects + Switchboard integration + dual-control).
  - Tenant/environment scoping enforcement across APIs and graph writes; cross-tenant leakage tests.
  - Run viewer list/detail with timeline + graph pane; p95 detail load <1.5s.
  - Metrics + SLOs (run latency, policy latency, failure rate) with at least one alert.
  - SBOM + signed images with deploy gate; internal Helm values; release runbook.

- **P1**
  - Policy simulation harness with scenario files and CI coverage gates.
  - Command palette actions with policy-filtered suggestions and approval labeling.
  - Metering events landed in pipeline; basic per-tenant usage dashboard.
  - Terraform module + partner Helm values with theming hooks; staging one-click deploy.
  - Synthetic probe running “hello” workflow in prod-like env.

- **P2**
  - Resource-level lineage enrichment (workflow touches resource Y) with canned queries.
  - Advanced approval policies (tag-driven dual-control permutations) and audit views in Switchboard.
  - Cost hint enrichment on metering (duration/bytes where available) and pricing notes.
  - Policy bundle hardening for hosted SaaS (region pinning, env isolation) with regression tests.

## Testing, observability, and compliance approach
- Unit + integration tests targeting ≥80% coverage on new paths; graph write/read tests for schema; cross-tenant leak-prevention tests.
- Policy regression suite tied to bundle changes; simulation harness in CI.
- Observability validation: synthetic probe + dashboard snapshots; alert dry-run for SLO burn.
- Provenance receipts emitted for graph writes, policy decisions, approvals, deploy evidence.

## Risks & mitigations
- **Cross-tenant leakage**: enforce scoping at API boundary and policy inputs; dedicated negative tests.
- **Policy regressions**: simulation harness and required CI gate before bundle merge.
- **Performance (run detail p95)**: caching/pagination and pre-fetched timelines; load-test dataset.
- **Supply-chain gaps**: CI gate blocks unsigned images; attestations stored in evidence ledger.

## Forward-looking enhancements
- Federated multi-region graph replication with policy-aware data residency.
- Adaptive policy simulations fed by real provenance data to auto-tune defaults.
- Proactive cost guardrails that throttle high-cost workflows per tenant.
- Strong typing for workflow definitions and policy inputs shared across Conductor and Switchboard SDKs.
