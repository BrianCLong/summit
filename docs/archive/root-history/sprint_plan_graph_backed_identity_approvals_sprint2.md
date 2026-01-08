# Sprint 2: Graph-Backed Identity & Entitlements powering Approvals

## Goal

Transform the approvals stack into a reusable, multi-tenant entitlement platform driven by the Company Graph (Person, Team, Service, Tenant) and IdP attributes. At least three internal flows should consume graph-derived approvers with no hardcoded lists.

## Functional Success Criteria

- Company Graph supports `Person`, `Team`, `Service`, `Tenant`, and `ApprovalFlow` entities with relationships (`MEMBER_OF`, `OWNS`, `APPROVES`, `OWNS_BY_TENANT`) and enforced tenant isolation.
- Approvals policies resolve approvers through graph traversal + identity attributes (e.g., team owner, on-call L2, finance approver) with cached reads and fail-closed fallback.
- Minimum three distinct flows use graph-derived approvers (e.g., prod deploy, vendor payout, data export) with receipts showing graph evidence.

## Identity & Entitlements

- IdP (OIDC/SCIM) ingestion materializes `Person` nodes with attributes and entitlements (roles/groups/tags) as ABAC-ready claims.
- Mapping config: IdP group → Company Graph role (example: `prod-deploy-approver` → `role=prod_deploy_approver`), stored per-tenant.
- Expose entitlements to OPA as `input.actor.entitlements`, alongside actor teams, roles, services, and flow config.

## Graph Schema & API

- Schema v0: `Person`, `Team`, `Service`, `Tenant`, `ApprovalFlow`.
  - `Person-[MEMBER_OF]->Team`, `Team-[OWNS]->Service`, `Tenant-[OWNS]->{Team|Service}`, `{Person|Team}-[APPROVES]->ApprovalFlow`.
- API (OAS3): `GET /graph/person/{id}` returns teams, services, entitlements; `GET /graph/service/{id}` returns owning team, approvers, criticality.
- Tests: tenant scoping, traversal correctness, baseline latency budgets.

## Approvals Powered by Graph

- Enrich OPA input per decision with actor graph context, flow approver requirements, service criticality; cache graph lookups with TTL + circuit breaker.
- Policy bundle v2 examples:
  - Prod deploy requires approval from owning team; `criticality=HIGH` requires two distinct teams.
  - Vendor payout requires finance approver + service owner; data export requires security approver for HIGH sensitivity.
- Onboard flows: `prod_deploy`, `high_value_vendor_payout`, `data_export_external` registered as `ApprovalFlow` nodes with bound policies.

## Switchboard UX

- Graph pane v0: search Person/Service; show Person → teams → services and Service → owning team → approver config; tri-pane layout stub with click-through from approval detail.
- Approval detail view surfaces actor teams/roles, service/flow, allowed approvers, and deep link to graph pane.

## Operability & Governance

- Ingest pipeline: periodic + manual force refresh, soft-delete semantics, metrics (processed, errors, lag), DLQ/retry with alerting.
- Dashboards: ingest lag, errors by tenant, graph query latency/error rate; alerts on lag > threshold and error rate >1%/5m.
- Runbook: “Graph/Identity Degraded” covering detection, mitigation (force re-sync, temporary manual approvers with receipts), validation of recovery; linked from Switchboard runbook hub.

## Packaging / White-Label

- Identity Adapter Contract documenting partner-provided users/groups/roles JSON and mapping into graph schema; includes adapter checklist.
- Sample tenant seed + policy profile (YAML/JSON + diagrams) for quickstart; seed script populates org structure, services, flows, and policy bindings.

## Delivery Plan

- **Week 1**: finalize schema + migrations; stand up IdP ingest with metrics; implement graph query API; draft adapter contract.
- **Week 2**: OPA enrichment with caching and fail-closed fallback; author policy bundle v2; onboard three flows; wire Switchboard graph pane + approval detail enhancements.
- **Week 3**: harden observability/alerts; runbook completion; load/perf baselines; seed + quickstart docs; staging smoke with real IdP payloads.

## Risks & Mitigations

- Graph staleness: cache TTL + forced refresh endpoint + alert on ingest lag.
- Cross-tenant leakage: explicit tenant scoping in queries, tests for isolation, and default deny on missing tenant context.
- IdP drift/format changes: versioned adapter contract, validation on ingest, DLQ with replay controls.
- Policy regressions: simulation harness with representative org graphs and regression suite per flow.

## Forward-Looking Enhancements

- Dual-write provenance: emit decision + graph context events to ledger for later replay/audit.
- Just-in-time escalation: auto-page on-call L2 when critical service approvals stall.
- Graph quality scoring: confidence signals on identity freshness to influence approval requirements.
