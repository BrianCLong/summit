# Sprint Plan: CompanyOS Tenants & Guardrails

- **Theme:** CompanyOS Tenants & Guardrails
- **Horizon:** 2 weeks
- **Goal:** Turn CompanyOS from a single-tenant pilot into a multi-tenant governed platform with per-tenant policy config, shared identity, and zero-surprise releases (flags, audit, drift detection).

## Outcome Criteria
By the end of the sprint:

1. **Multi-tenant support:** At least three tenants (`internal`, `pilot-a`, `pilot-b`) with isolated policy bundles and configuration.
2. **Cross-service RBAC+ABAC:** Two services enforce RBAC and ABAC using shared identity and policy sources.
3. **Feature flags:** New behavior wrapped in flags with enable/disable path per tenant.
4. **Drift detection:** Config drift signal and alert for infra and policies.
5. **Observability:** SLO dashboards and runbooks updated for newly covered services.

## Track A — Now-Value

### A1. Multi-tenant CompanyOS Configuration
- **Tenant model:** Canonical Tenant ID and config schema (`tenant_id`, `display_name`, `env`, `policy_bundle_ref`, `feature_flags`, `data_region`, `owner_contact`).
- **Service wiring:** At least two services accept tenant context (header claim) and map tenant to config + policy bundle.
- **Validation:** Validator ensures referenced tenants have matching policy bundles and no orphaned bundles.
- **Acceptance:** Tenants `internal`, `pilot-a`, `pilot-b` respond differently; CI fails on missing/orphaned bundles.

### A2. RBAC + ABAC Enforcement in Two Services
- **Shared authz library:** `companyos/authz` handles subject/resource/action/tenant/policy → allow/deny with reasons.
- **Integrations:** Refactor existing service to shared library; integrate a second resource-facing service.
- **Rules:** RBAC example—only `CompanyAdmin` manages tenant settings; ABAC example—export limited to `data_region == user_region`.
- **Tests:** Cover role allowed/forbidden, attribute allowed/forbidden, tenant mismatch; structured logs carry tenant/policy metadata.

### A3. Feature Flags for Tenant-Specific Rollouts
- **Flag model:** `flag_id`, `description`, `default`, `per_tenant_overrides`, optional `expires_at`.
- **Flag engine:** In-process evaluator returning boolean/variant by tenant/subject/context.
- **Integrations:** Wrap two risky behaviors; `pilot-a` enabled, `pilot-b` disabled.
- **Hygiene:** CI lint warns on expired `expires_at`; docs include flag cleanup guidance.

### A4. CompanyOS Admin: Tenant & Policy Overview
- **UI:** Tenant list (id, name, env, contact, data region) and per-tenant policy bundle tags (e.g., `pii`, `finance`, `export`).
- **Flag visibility:** Show enabled flags per tenant (read-only) with loading/error/empty states and accessibility basics.

## Track B — Moat / Platform

### B1. Shared Identity & Attribute Service (IntelGraph Stub)
- **Identity schema:** `subject_id`, `tenant_id`, `roles`, `attributes` (department, country, employment_type).
- **Service/API:** `GetSubject(tenant, subject_id)` returns enriched identity with pluggable backend (static/DB now, IntelGraph/IdP later).
- **Integration:** Authz library enriches subjects via identity module; extension point documented.

### B2. Drift Detection for Policies and Config
- **Desired vs. actual:** Hash desired config + policy vs. loaded state per service/tenant.
- **Metrics:** `companyos_config_drift` (0/1) with alert on sustained drift; dashboard panel shows drift.
- **CLI/report:** Endpoint or CLI shows drift status with runbook for reconcile/rollback.

### B3. Rollout & Rollback Golden Path
- **Stages:** `dev → staging → pilot-tenants` with signed artifacts, passing tests, and canary gates.
- **Canary rules:** Percent traffic by tenant with guardrails on error/latency/authz failures.
- **Rollback:** Scripted reverts for artifacts, policy bundles, and flag configs; release audit log with versions and notes.

## Cross-Cutting

### C1. ADR: Multi-Tenancy & Identity
- **Content:** Tenant model, isolation boundaries, policy mapping; identity representation and trust assumptions; data classification and residency.
- **Status:** Accepted ADR referenced from authz docs, identity service README, and tenant-config tooling.

### C2. Ops: SLO & Runbook Updates
- **Metrics:** Per-tenant error/latency, authz decision latency; flag usage and drift metrics.
- **Dashboards/Runbooks:** Multi-tenant dashboard linked from alerts; runbooks cover tenant troubleshooting and flag-based mitigations.

## Capacity & Priorities
- **Must-do:** A1, A2, A3, B1, B3.
- **Nice-to-have:** A4, B2 enhancements, SLO/dashboard refinements.

## Next Sprint Options
- **Sprint 3 – Data Spine & Lineage:** Integrate decisions into data catalogs/CDC/audit trails.
- **Sprint 3 – Customer-Facing CompanyOS APIs:** Externalized governance APIs for white-label customers.
