# CompanyOS: Missing Foundations Audit & Build Map

**Date:** October 2025
**Scope:** `companyos-switchboard` (Next-Gen), `companyos-api` (Service), `server/` (Legacy Monolith)

## 1. Executive Summary

The "CompanyOS" initiative is currently fragmented across three layers:
1.  **Legacy Monolith (`server/`)**: Contains a rich, enterprise-grade schema (`maestro.*`) and services for Incidents, Deployments, and Governance, but is tightly coupled to the old architecture.
2.  **Switchboard (`october2025/companyos-switchboard`)**: A "Local-First" prototype with a modern UX (Next.js/Tauri) but lacking almost all enterprise foundations (RBAC, Workflow, Persistence).
3.  **CompanyOS API (`companyos/services/companyos-api`)**: A skeletal service shell.

**Critical Finding:** `Switchboard` is positioned as the new interface but operates on a "Toy Schema" (`db/schema.sql`) that is incompatible with the operational reality defined in the Monolith (`009_create_companyos_operational_tables.sql`).

## 2. Missing Foundations Audit

| Foundation Area | Status in Switchboard | Status in Monolith | Gap / Missing Component |
| :--- | :--- | :--- | :--- |
| **Governance** | 🔴 Minimal (`switchboard.rego`) | 🟢 Rich (ADRs, Postmortems) | **Policy Sync**: No mechanism to sync enterprise policies to Switchboard. **Audit**: No audit logging in Switchboard. |
| **RBAC / ABAC** | 🔴 None (Ad-hoc flags) | 🟡 Service-level | **Identity Model**: Switchboard lacks `User`, `Role`, `Permission` entities. **Policy**: `switchboard.rego` is trivial and needs to consume strict RBAC claims. |
| **Workflows** | 🔴 None (In-memory Router) | 🟢 `Maestro` / `SOAR` | **Workflow Engine**: Switchboard has no state machine for long-running processes (e.g., Incident workflows). |
| **Schema** | 🔴 Minimal (SQLite) | 🟢 Comprehensive (`maestro.*`) | **Schema Parity**: Switchboard is missing 90% of the operational schema (Incidents, SLOs, On-Call). |
| **Jobs / Compute** | 🔴 None | 🟢 `BullMQ` / `PgBoss` | **Job Queue**: No background processing for Switchboard (e.g., "Dispatch Action" is synchronous). |
| **Pipelines** | 🟡 Basic CI (`ci.switchboard.yml`) | 🟢 Extensive | **Release Pipeline**: No release/deploy automation for the Switchboard desktop/web artifacts. |
| **Notifications** | 🔴 None | 🟡 `NotificationService` | **Routing**: No way to notify users of Switchboard events (PagerDuty/Slack integration missing). |
| **Migrations** | 🔴 **MISSING** | 🟢 Custom Tool | **Migration Framework**: Switchboard has `schema.sql` but no migration tool or history tracking. |

## 3. The Build Map

This roadmap defines the path to unify Switchboard with the Enterprise Core.

### Phase 1: Foundation & Schema Parity
*   [ ] **Establish Migration Framework**: Implement a migration tool (e.g., `db-migrate` or `atlas`) in `companyos-switchboard/db/`.
*   [ ] **Port Operational Schema**: Create migrations to replicate the `maestro` schema in Switchboard's local DB (SQLite compatible):
    *   `incidents`, `deployments`, `slo_violations`, `alerts`
    *   `runbooks`, `runbook_executions`, `on_call_schedules`
    *   `postmortems`, `adrs`, `roadmap_items`
*   [ ] **Entity Unification**: Define canonical `User` and `Tenant` entities in Switchboard matching the Monolith.

### Phase 2: Governance & Identity
*   [ ] **Identity Provider Integration**: Connect Switchboard to OIDC (Auth0/Keycloak) to populate `User` claims.
*   [ ] **Enhanced OPA Policies**: Rewrite `policies/switchboard.rego` to enforce ABAC based on the ported schema (e.g., `allow` if `input.user.role == "commander"`).
*   [ ] **Audit Logging**: Implement `AuditService` in Switchboard to write immutable logs to a simplified `audit_events` table.

### Phase 3: Orchestration & Compute
*   [ ] **Connect to Maestro**: Implement a "Maestro Bridge" in Switchboard to offload heavy compute to the Server Monolith via `BullMQ` or Webhooks.
*   [ ] **Local Job Queue**: Add a lightweight local queue (e.g., `pg-boss` over SQLite or in-memory) for local background tasks (e.g., data sync).

### Phase 4: Operations & Visibility
*   [ ] **Notification System**: Port `NotificationService` logic to Switchboard (or bridge to Server) for routing alerts to Slack/PagerDuty.
*   [ ] **Release Pipelines**: Upgrade `.github/workflows/ci.switchboard.yml` to support multi-platform builds (Tauri/Web) and semantic release.

## 4. Missing Database Migrations (Detail)

The following schema elements from `server/.../009_create_companyos_operational_tables.sql` are completely missing in `companyos-switchboard`:

1.  **`incidents`**: Critical for the "War Room" feature.
2.  **`deployments`**: Required for the "Release" view.
3.  **`slo_violations`**: Required for "Health" view.
4.  **`alerts`**: Required for "Triage" view.
5.  **`runbooks` & `runbook_executions`**: Core to the "Switchboard" operator experience.
6.  **`on_call_schedules`**: Essential for "Roster" widget.
7.  **`postmortems`**: Governance requirement.
8.  **`adrs`**: Governance requirement.
9.  **`roadmap_items`**: Product Ops requirement.
10. **`customer_requests`**: Sales Ops requirement.

**Recommendation:** Create a `db/migrations/` directory and port these tables immediately to enable the specific UI widgets defined in `policies/switchboard.rego` (`AgentRoster`, `LiveTiles`, `MeetingStage`).
