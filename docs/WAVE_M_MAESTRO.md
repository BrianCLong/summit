# Wave M Maestro Plan (Productization + Multi-Tenant SaaS + Customer Audit Package)

## Global Rules

- One atomic PR per agent with small, merge-safe surface area.
- Prefer additive changes; avoid broad refactors or deleting failing tests.
- Behavior changes must be gated behind feature flags default **OFF** unless additive and non-breaking.
- Each PR must include: title, summary, exact file list (approx paths), step-by-step plan, tests to add/run, and an acceptance checklist.
- CI must be green; new CI jobs must be fast and deterministic.
- Include explicit “Non-goals / Out of scope” sections.
- Provide exact local verification commands (lint/test/build or targeted commands).
- Do **not** touch files outside the agent’s allowlist; shared index edits are reserved for the Docs Indexer.

## Wave M Goals

- Tenant bootstrap flow (API-only, flagged).
- Plans/entitlements with feature gating by plan.
- Billing stub (plan state, no payments).
- Admin console API stubs (safe, flagged).
- Customer audit package export (offline bundle).
- Tenant data export & delete stubs (compliance groundwork).

## Assignments and Allowlists

- **M1 — Tenant Bootstrap Types + In-memory Provisioner**  
  Allowlists: `server/src/tenancy/bootstrap/types.ts`, `server/src/tenancy/bootstrap/provisioner.ts`, `test/tenancy-bootstrap/**`, `docs/saas/TENANT_BOOTSTRAP.md`.  
  Non-goal: No DB migrations.
- **M2 — Tenant Bootstrap API (flagged OFF)**  
  Allowlists: `server/src/tenancy/bootstrap/routes.ts`, `test/tenancy-bootstrap-routes/**`, `docs/saas/TENANT_BOOTSTRAP_API.md`.  
  Non-goal: No auth overhaul; use existing admin auth context.
- **M3 — Plans + Entitlements Registry (new)**  
  Allowlists: `server/src/billing/plans.ts`, `server/src/billing/entitlements.ts`, `test/entitlements/**`, `docs/saas/PLANS_ENTITLEMENTS.md`.  
  Non-goal: No payment processors.
- **M4 — Billing State Stub (tenant → plan) (flagged OFF if wired)**  
  Allowlists: `server/src/billing/state.ts`, `server/src/billing/routes.ts` (optional), `test/billing/**`, `docs/saas/BILLING_STUB.md`.  
  Non-goal: No Stripe or invoices.
- **M5 — Admin Console API Stubs (safe, flagged OFF)**  
  Allowlists: `server/src/admin/routes.ts`, `server/src/admin/viewModels.ts`, `test/admin-console/**`, `docs/saas/ADMIN_CONSOLE_API.md`.  
  Non-goal: No UI; avoid dangerous actions without step-up auth.
- **M6 — Customer Audit Package Export Tool (offline)**  
  Allowlists: `scripts/audit/export-audit-package.ts`, `scripts/audit/package-schema.json` (optional), `test/audit-export/**`, `docs/saas/AUDIT_PACKAGE.md`.  
  Non-goal: No external uploads.
- **M7 — Tenant Data Export/Delete Stubs (flagged OFF)**  
  Allowlists: `server/src/compliance/tenantData/export.ts`, `server/src/compliance/tenantData/delete.ts`, `test/tenant-data/**`, `docs/saas/TENANT_DATA_LIFECYCLE.md`.  
  Non-goal: No destructive operations by default.
- **M8 — “SaaS GA Gates” Checklist (docs-only)**  
  Allowlists: `docs/saas/SAAS_GA_GATES.md`.  
  Non-goal: Code changes are out of scope.
- **M-DI — Docs Indexer Wave M**  
  Allowlists: `README.md` (docs links section only), `docs/index.md` or `docs/README.md` (links only).  
  Responsibility: add links to all Wave M docs.

## Merge Choreography

- Merge order: M3 before any API referencing plans (M4/M5); M1 before M2; M6 and M7 independent; M8 anytime; M-DI last.
- Conflict avoidance: agents must stay within allowlists; only M-DI edits shared docs indexes.

## Copy/Paste Codex Prompts

### M1 — Tenant Bootstrap Types + In-memory Provisioner

```
Objective:
ONE atomic PR adding tenancy bootstrap types and an in-memory provisioner that creates a tenant + default settings deterministically.

ALLOWLIST:
- server/src/tenancy/bootstrap/types.ts
- server/src/tenancy/bootstrap/provisioner.ts
- test/tenancy-bootstrap/**
- docs/saas/TENANT_BOOTSTRAP.md

Deliverables:
1) types.ts:
   - TenantSpec, TenantRecord, BootstrapRequest, BootstrapResult
2) provisioner.ts:
   - createTenant(spec) returns deterministic IDs in tests
   - validates slug uniqueness (in-memory)
3) tests for:
   - valid bootstrap
   - duplicate slug rejected
   - deterministic output
4) TENANT_BOOTSTRAP.md

Non-goals:
- No DB migrations/persistence

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M2 — Tenant Bootstrap API (flagged OFF)

```
Objective:
ONE atomic PR adding a minimal tenant bootstrap API behind TENANT_BOOTSTRAP_API_ENABLED=false.

ALLOWLIST:
- server/src/tenancy/bootstrap/routes.ts
- test/tenancy-bootstrap-routes/**
- docs/saas/TENANT_BOOTSTRAP_API.md

Deliverables:
1) routes.ts:
   - POST /api/admin/tenants/bootstrap
   - GET /api/admin/tenants (list; optional)
   - gated behind flag; returns consistent disabled response
2) tests:
   - disabled behavior
   - enabled behavior using in-memory provisioner
3) docs with request/response examples

Non-goals:
- No auth overhaul; assume existing admin auth context

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M3 — Plans + Entitlements Registry

```
Objective:
ONE atomic PR defining plans and entitlements used to gate features.

ALLOWLIST:
- server/src/billing/plans.ts
- server/src/billing/entitlements.ts
- test/entitlements/**
- docs/saas/PLANS_ENTITLEMENTS.md

Deliverables:
1) plans.ts: FREE/PRO/ENTERPRISE (or repo-appropriate)
2) entitlements.ts:
   - function hasEntitlement(plan, entitlement)
   - mapping table
3) tests for mapping and defaults
4) PLANS_ENTITLEMENTS.md with a matrix

Non-goals:
- No payment processor

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M4 — Billing State Stub (tenant → plan) [flagged OFF if wired]

```
Objective:
ONE atomic PR adding a billing state stub that stores/returns a tenant’s plan (in-memory) and optional minimal API behind BILLING_API_ENABLED=false.

ALLOWLIST:
- server/src/billing/state.ts
- server/src/billing/routes.ts (optional)
- test/billing/**
- docs/saas/BILLING_STUB.md

Deliverables:
1) state.ts:
   - getPlan(tenant_id), setPlan(tenant_id, plan)
   - deterministic for tests
2) optional routes.ts:
   - GET /api/admin/billing/plan
   - POST /api/admin/billing/plan
   - gated behind flag
3) tests for state and routes (if added)
4) BILLING_STUB.md

Non-goals:
- No Stripe/invoices

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M5 — Admin Console API Stubs (safe, flagged OFF)

```
Objective:
ONE atomic PR adding safe admin console read-only endpoints (tenants, plans, gates status) behind ADMIN_CONSOLE_ENABLED=false.

ALLOWLIST:
- server/src/admin/routes.ts
- server/src/admin/viewModels.ts
- test/admin-console/**
- docs/saas/ADMIN_CONSOLE_API.md

Deliverables:
1) viewModels.ts defines response shapes
2) routes.ts:
   - GET /api/admin/overview (gates summary, version)
   - GET /api/admin/tenants (read-only)
   - gated behind flag
3) tests for disabled/enabled behavior
4) ADMIN_CONSOLE_API.md

Non-goals:
- No dangerous admin actions
- No UI

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M6 — Customer Audit Package Export Tool (offline zip manifest)

```
Objective:
ONE atomic PR adding a script that generates a customer audit package directory (or zip if dependency-free) with manifest, evidence report, and exports.

ALLOWLIST:
- scripts/audit/export-audit-package.ts
- scripts/audit/package-schema.json (optional)
- test/audit-export/**
- docs/saas/AUDIT_PACKAGE.md

Deliverables:
1) export script:
   - input: fixture “tenant snapshot” JSON (receipts/provenance/evidence summaries)
   - output: folder structure:
     - manifest.json
     - evidence/
     - reports/
     - exports/
   - deterministic ordering and filenames
2) tests using fixtures verifying stable outputs
3) AUDIT_PACKAGE.md describing structure and how to generate

Non-goals:
- No uploads, no external services

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M7 — Tenant Data Export/Delete Stubs (compliance groundwork) [flagged OFF]

```
Objective:
ONE atomic PR adding export/delete stubs for tenant data lifecycle, with strong safety defaults (no destructive delete unless flag enabled).

ALLOWLIST:
- server/src/compliance/tenantData/export.ts
- server/src/compliance/tenantData/delete.ts
- test/tenant-data/**
- docs/saas/TENANT_DATA_LIFECYCLE.md

Deliverables:
1) export.ts:
   - interface exportTenantData(tenant_id) returns deterministic list of artifacts (stub)
2) delete.ts:
   - deleteTenantData(tenant_id) returns plan and requires TENANT_DELETE_ENABLED=true to proceed (stub)
3) tests for flag gating and deterministic artifact lists
4) TENANT_DATA_LIFECYCLE.md

Non-goals:
- No real deletion

Acceptance:
- [ ] deterministic
- [ ] CI green
```

### M8 — SaaS GA Gates Checklist (docs-only)

```
Objective:
ONE atomic PR adding SaaS productization GA gates checklist.

ALLOWLIST:
- docs/saas/SAAS_GA_GATES.md

Deliverables:
Checklist covering:
- tenant bootstrap flag behavior + tests
- entitlements correctness
- admin console read-only safety
- audit package reproducibility
- tenant data lifecycle safety flags
- observability + provenance completeness
- release train + nightly checks alignment

Acceptance:
- [ ] only this file changed
```

### M-DI — Docs Indexer Wave M

```
Objective:
ONE atomic PR updating shared docs indexes to link Wave M docs.

ALLOWLIST:
- README.md (docs links section only)
- docs/index.md or docs/README.md (links only)

Add links to:
- docs/saas/TENANT_BOOTSTRAP.md
- docs/saas/TENANT_BOOTSTRAP_API.md
- docs/saas/PLANS_ENTITLEMENTS.md
- docs/saas/BILLING_STUB.md
- docs/saas/ADMIN_CONSOLE_API.md
- docs/saas/AUDIT_PACKAGE.md
- docs/saas/TENANT_DATA_LIFECYCLE.md
- docs/saas/SAAS_GA_GATES.md

Acceptance:
- [ ] links only
- [ ] CI green
```
