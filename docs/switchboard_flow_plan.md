# Switchboard Flow Expansion Plan

This document outlines the architecture and implementation plan to deliver the Switchboard graph, workflow, and compliance capabilities requested in Tracks A–G. The goal is to stage the work into incremental, testable slices that respect the existing Summit/IntelGraph patterns.

## Scope Highlights

- Graph entities for people, roles, systems, approvals, changes, and incidents with PostgreSQL migrations plus Neo4j alignment.
- Switchboard UI surfaces: approvals inbox, timeline, and graph slice view.
- Workflow pipeline: intake (form + chat), OPA policy evaluation, multi-approval, execution hooks (webhooks/scripts/tickets), receipt generation, and event-bus fanout.
- Flow Studio v0.1 canvas with simulate mode and policy-aware configuration pane.
- Playbook catalog with seeded data and dashboard hooks.
- Tier-1 integrations (Slack, IdP OIDC/SCIM, Jira/Linear, GDrive/Notion, warehouse/DB) with connector framework and observability.
- Trust Pack evidence/receipt schema, pricing telemetry, developer SDK alignment, and golden-path install/readiness expectations.

## Delivery Principles

- **Event-first**: emit immutable workflow events and receipts to the provenance ledger, then project to read models for Switchboard surfaces.
- **Policy-first**: centralize OPA bundles and ABAC enforcement for both runtime execution and Flow Studio edits.
- **Testable slices**: each track adds unit, integration, and e2e coverage plus seed data to enable smoke validation.
- **SLO-backed**: instrument latency/error-rate metrics with Prometheus/Grafana alerts; ensure dashboards ship with defaults.

## Near-Term Implementation Steps

1. **Schema foundation (Track A)**
   - Add PostgreSQL migrations under `server/db/migrations/postgres` for entities: `entities_people`, `entities_roles`, `entities_systems`, `workflow_changes`, `workflow_approvals`, `incidents`, and junction tables for relationships.
   - Extend `server/db/seeds` with representative graph slices for approvals and incidents.
   - Expose GraphQL/REST models in `server/src` for CRUD and graph traversal hooks.

2. **Workflow execution path (Tracks A/B)**
   - Build request intake endpoints plus chat handoff in `server/routes` with policy hooks from `server/policies`.
   - Implement OPA check step using existing policy client; enforce multi-approval gates with dynamic approver resolution.
   - Add execution hooks: outbound webhooks, script runners, and ticket emitters (Jira/Linear) with retry/backoff.
   - Generate signed receipts per workflow step and publish to event bus (if configured) for downstream analytics.

3. **Switchboard UI surfaces (Track A)**
   - Create React components in `web/` or `webapp/` for: approvals inbox, timeline, and graph slice (“who approved what on which system”).
   - Use shared graph client utilities and add loading/error states; wire to the new backend endpoints.

4. **Flow Studio v0.1 (Track B)**
   - Canvas with trigger + basic step nodes (API/tool call, policy check, approval, wait, notify, graph write, receipt emit).
   - Right-hand configuration pane for parameters and policy guard dropdowns (security approver, VP thresholds).
   - Simulate mode: backend dry-run endpoint to evaluate policy, compute approver sets, and emit preview receipts; surface results in UI.
   - Persist flow definitions with versioning and ABAC/OPA enforcement on edits.

5. **Playbook catalog (Track C)**
   - Seed internal playbooks: high-risk change approval, data export/deletion, incident intake/resolution.
   - External demos: customer data access request, large discount/non-standard deal approval.
   - Bundle dashboards (time-to-approve, high-risk changes/week, breached SLOs) using the existing analytics stack.
   - Provide catalog UI entry point with “activate” flows and add documentation with screenshots.

6. **Integrations tier (Track D)**
   - Implement connector framework in `server/services` with secrets handling, health checks, metrics, and event subscription handlers.
   - Ship connectors: Slack, IdP (OIDC + SCIM), Jira/Linear, storage (GDrive/Notion), and warehouse/DB.
   - Add validation scripts, contract tests, onboarding wizards, and Helm/Terraform values for credentials.
   - Document failure modes and retry/backoff policies; expose status/health UI.

7. **Trust & compliance (Track E)**
   - Define evidence/receipt schema under `schema/` with signing/retention rules; generate examples for high-risk approval, incident, and purge actions.
   - Add purge-manifest demo flow plus export CLI/API; map SOC2/ISO controls to CompanyOS workflows with screenshots.
   - Automate integrity checks and audit-query tests.

8. **Telemetry & pricing (Track F)**
   - Instrument per-tenant ingest, storage GB-month, workflow runs, and LLM token usage; persist in telemetry tables.
   - Build unit economics dashboard and SKU skeleton; add billing/metering APIs and anomaly alerts.
   - Link telemetry to Trust Pack and pricing documentation.

9. **Developer surface (Track G)**
   - Publish OAS3 spec under `docs/api`, keep CI sync.
   - Produce TS SDK v0.1 in `sdk/` with auth helpers, graph CRUD, and workflow invoke/status.
   - Add examples, quickstart, and 60-minute validation script/workshop.

## Testing & Observability

- Add unit tests for schema models, policy resolution, and connector health checks.
- Integration/e2e coverage for Switchboard flows, Flow Studio build/edit/simulate, and playbook installs.
- Prometheus/Grafana configs under `observability/infrastructure` to track p95 latency (<1.5s) and p99 error rate (<0.5%) with alerts.
- Receipt integrity tests and compliance checks for audit queries.

## Forward-Looking Enhancements

- Introduce verifiable compute receipts using signed Merkle proofs per workflow step to strengthen provable-audit guarantees.
- Consider WASM sandboxing for execution hooks to harden multi-tenant isolation while preserving extension velocity.
