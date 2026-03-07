# Suite Unification Architecture Blueprint

This blueprint operationalizes the suite-wide unification epics into a concrete architecture, migration path, and governance model. It defines canonical modules, shared primitives, and enforcement mechanisms so each product behaves like part of a cohesive platform rather than an isolated app.

## 1. Canonical Modules and Feature Taxonomy

- **Products (modules):** Navigation shell, Identity & Accounts, Entitlements/Billing, Data Spine, Admin & Governance Plane, Cross-Sell/Discovery, Core Workflows (per domain), Integration Hub.
- **Features (capabilities inside modules):** Auth flows, RBAC/ABAC policies, SCIM, metering, proration, audit logging, feature flags, cross-module search, command palette, onboarding checklists, data quality gates.
- **Principles:** One module owns persistence and policy for its domain; features may be reused but cannot redefine domain nouns. All modules must expose contracts via versioned APIs/events.

## 2. Shared Domain Model and Vocabulary

- **Identifiers:** `tenant_id`, `account_id` (billing entity), `org_id` (hierarchy node), `user_id`, `service_account_id`, `workspace_id`, `team_id`, `role_id`, `plan_id`, `entitlement_id`, `resource_id` (object-level), `event_id` (immutable).
- **Canonical nouns:** Tenant, Account, User, Role, Group, Workspace, Module, Feature, Plan, Entitlement, UsageMeter, Invoice, AuditEntry, Event, Connector, Job, Flag.
- **Reference catalogs:** Shared protobuf/JSON schemas for each noun; include glossary mappings and disambiguation (e.g., `workspace` vs `project`).

## 3. Bounded Contexts and Systems of Record

- **Identity Context (SoR):** owns users, groups, roles, policies, sessions, service accounts; exposes SCIM/SCIM-events, OIDC, introspection.
- **Billing Context (SoR):** plans, entitlements, metering, invoicing, credits; authoritative for plan logic and usage limits.
- **Data Spine Context (SoR):** canonical entities/events, lineage, retention propagation, segmentation primitives, unified reporting APIs.
- **Navigation/UX Shell Context:** routing, global nav, breadcrumbs, notifications, feature availability surfaces, command palette.
- **Admin & Governance Context:** audit streams, retention/hold policies, approvals, tenant health, integration allowlists/scopes.
- **Cross-Sell Context:** discovery surfaces, trials, upgrade flows, guardrails.
- **Application Contexts:** per-product domain logic that must consume Identity/Billing/Data Spine APIs rather than reimplementing.

## 4. API and Event Contracts

- **API style:** gRPC/REST with OpenAPI + GraphQL federation where read aggregation is needed; all endpoints versioned (`/v1`, `/v2`) with explicit deprecation windows.
- **Events:** CloudEvents with schema registry; compatibility rules (additive changes only on existing versions). Each event carries `tenant_id`, `resource_id`, `trace_id`, `provenance` metadata.
- **Contract testing:** Provider/consumer tests in CI for every inter-module API; schema diff checks gated by compatibility rules.
- **Idempotency:** Write APIs accept idempotency keys; events are at-least-once with dedupe keys.

## 5. Interoperability Standards

- **Identity:** OIDC SSO entry, consistent session cookie/refresh semantics, service accounts with scoped tokens, offline rotation enforced.
- **Permissions:** Central policy engine (OPA/Rego) with shared policy bundles; “why can’t I?” introspection endpoint for every module.
- **Events:** Shared event taxonomy, topic naming (`{domain}.{entity}.{verb}.vN`), and replay retention; provenance headers mandatory.
- **Configuration/Flags:** Single flag service; module availability resolved via entitlements + flags with cache TTLs; no hardcoded gates.
- **Jobs/Async:** Standard job contract (retry, DLQ, idempotency key, tracing context) and shared worker library.
- **Logging/Observability:** OpenTelemetry traces/metrics/logs with suite-wide resource attributes; redaction policy enforced in exporters.

## 6. Dependency and Coupling Controls

- **Dependency map:** generate from `pnpm` workspace graph + import graph; block circular references in CI.
- **Allowed directions:** Application modules depend on shared primitives (identity, billing, data spine) via interfaces; shared modules never import application packages.
- **Module boundaries:** Use dependency injection and anti-corruption layers when consuming legacy services; no direct DB reads across contexts.
- **Optional modular monolith core:** Extract cross-cutting primitives into an internal package set (authn/z, config, logging, flags, jobs, audit) with strict public interfaces.

## 7. Migration Plan (from bespoke integrations)

- **Inventory:** catalog existing integrations and duplicate implementations; rank by blast radius and maintenance pain.
- **Strangler steps:**
  1. Wrap legacy APIs behind new contracts with adapters.
  2. Dual-write/dual-emit during compatibility window; add invariant checks.
  3. Enable feature flags per tenant for cutover; add observability SLOs and canary playbooks.
  4. Decommission legacy endpoints after deprecation window and data backfill verification.
- **Data migration:** use deterministic backfills with provenance tagging and reconciliation metrics (counts, checksums, entitlement enforcement deltas).

## 8. Governance and Lifecycle

- **ADRs:** required for new module boundaries, SoR changes, or contract version bumps; include rollback and compatibility impact.
- **Deprecation policy:** minimum 90-day window, changelog + customer comms, contract tests to ensure no breaking changes before EOL.
- **Release safety:** canary + rollback hooks, migration pre-checks, exception registry with expiry.
- **Contract SLAs:** latency/availability/error budgets per module; enforce through SLO dashboards and alerting tied to “suite operating system.”

## 9. Identity & Account Model (Epic 2)

- **Canonical identifiers:** immutable `tenant_id`, `account_id`, `user_id`; mapping table for merges/dedupe with provenance.
- **Org structure:** tenants contain workspaces/teams; RBAC roles + ABAC attributes resolved via central engine; group-to-role mapping via SCIM.
- **Service accounts:** scoped tokens with ownership metadata, rotation schedules, and automated disable-on-expiry.
- **Audit:** immutable append-only log for identity/role changes; tenant isolation tests must fail closed.

## 10. Billing, Packaging, and Entitlements (Epic 3)

- **Entitlement service:** plan → limits → enforcement APIs; supports previews for Sales/CS.
- **Metering:** accurate, idempotent meters with anomaly detection; usage dashboards aligned to billing.
- **Lifecycle:** proration rules, upgrades/downgrades, credits; concession tracking with expirations.
- **Leakage prevention:** revenue scanner for over-grants, orphan access, unmetered usage; delete legacy plan logic once coverage ≥95%.

## 11. Unified Navigation & UX Shell (Epic 4)

- **Shell:** shared layout with global nav, header, breadcrumbs, notifications; deep links resilient to module changes.
- **Standards:** consistent empty/error/loading states; command palette for create/invite/export/troubleshoot.
- **Feature availability:** flags + entitlements decide visibility; top 10 routes migrate first with instrumentation (time-to-destination, rage clicks, abandon rate).

## 12. Cross-Module Data Spine (Epic 5)

- **Canonical entities/events:** suite-wide schemas with compatibility checks; gold tables and unified reporting APIs.
- **Provenance:** every derived dataset stores sources and transforms; lineage available in UI.
- **Quality gates:** tiered data quality checks for Tier-0 metrics; retention/deletion propagation across analytics stores.
- **Segmentation:** plan/ICP/region/cohort attributes standardized for analytics and cross-sell signals.

## 13. Cross-Sell & In-Product Discovery (Epic 6)

- **Value moments:** tie discovery to real workflows (completion milestones, gaps, or repeated friction points).
- **Trials:** scoped, reversible module trials with safe defaults; entitlements + proration integrated.
- **Guardrails:** frequency caps, relevance scoring, opt-outs; instrument funnel (view → trial → activate → adopt → pay).

## 14. Shared Admin & Governance Plane (Epic 7)

- **Admin console:** unified for SSO/MFA, RBAC, audit exports, tenant health dashboard, integration scopes/kill switches.
- **Approvals:** two-person rule for risky actions; break-glass access with expiry and strict logging.
- **Policies:** retention/legal hold propagation; DSAR workflows across modules; data residency controls with evidence.

## 15. Deprecation & Consolidation Program (Epic 8)

- **Overlap inventory:** rank by maintenance pain and risk; select canonical implementations and publish decisions.
- **Compatibility windows:** dual-run with firm end dates; migration tooling (parity checks, redirects, bulk transforms).
- **Delete quota:** per-quarter removal targets (routes, flags, services); track incident/support reduction as ROI.

## 16. Suite Operating System (Epic 9)

- **KPIs:** adoption depth, NRR, reliability, cost, security posture; dashboarded for weekly review.
- **Decision rights:** escalation SLAs for cross-module conflicts; exception registry with expirations.
- **Release safety:** canary, rollback, migration checks standardized; quarterly GameDays covering incidents, migrations, entitlements, DSAR flows.
- **Adoption metric:** % of modules using shared primitives; reward consolidation and deletion.

## 17. Forward-Leaning Enhancements

- **Schema federation with evolution service:** automated schema diffing + contract checks per PR, with guided remediation suggestions.
- **Context-aware navigation:** ML scoring to reorder nav/command palette based on tenant usage patterns while respecting entitlements.
- **Policy sandboxing:** ephemeral environments to test new RBAC/ABAC or billing rules against synthetic event streams before promotion.
- **Cross-module observability graph:** overlay traces/metrics/logs to surface coupling hotspots and optimize dependency cuts.
