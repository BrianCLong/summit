# Multi-Tenancy & Blast-Radius Controls

This document describes the runtime guardrails that enforce hard tenant isolation across Summit’s API, ingestion, and retrieval (RAG) paths.

## Canonical Tenant Identity

- **TenantContext** now carries:
  - `tenantId` – required on every request.
  - `environment` – `prod` | `staging` | `dev` (propagated from headers or inferred from runtime).
  - `privilegeTier` – `standard` | `elevated` | `break-glass` (defaults to the most restrictive tier).
- The context is extracted once at the edge (middleware) and attached to `req.tenant`, then reused by ingestion and RAG flows.
- Requests without a valid context are rejected before hitting business logic.

## Isolation & Policy Enforcement

- All guarded operations call the policy hook before executing:
  - Deny-by-default when `tenantId` is missing or mismatched to the resource.
  - Environment mismatches (`prod` vs `dev`) fail closed to prevent cross-sandbox leakage.
  - Per-tenant kill switch short-circuits requests with `423 Locked` and logs an audit event.
- Database helpers refuse to proceed without an explicit `tenantId`, ensuring row-level isolation.

## Blast-Radius Controls

- **Rate limits:** Per-tenant buckets for `api`, `ingestion`, and `rag/llm` traffic with conservative defaults and explicit reset headers.
- **Ingestion caps:** Requests over the per-tenant cap are rejected with `429` and warnings when approaching limits.
- **LLM ceilings:** Soft-fail ceilings emit warnings as the budget approaches exhaustion and block overage attempts gracefully.
- Defaults are intentionally conservative to bias toward containment; raise them explicitly per tenant when needed.

## Kill Switch (Emergency Brake)

- Configuration file: `config/tenant-killswitch.json` (path overrideable via `TENANT_KILL_SWITCH_FILE`).
- Checked at request time—no redeploy required to disable/reenable a tenant.
- Activation/deactivation is logged with tenant identifiers for auditability.

## GA Gate Coverage

- CI includes isolation guard tests that fail if:
  - Cross-tenant access is permitted.
  - Per-tenant limits are not enforced.
  - Kill-switch configuration is missing or ignored.

## Known Limits

- Privilege tier is coarse (`standard`/`elevated`/`break-glass`) and does not yet encode fine-grained roles.
- Redis-backed rate limiting fails open if the cache is unavailable; metrics still capture the event.
- Inference of environment from runtime is a safe default but should be overridden for production tenants via headers.

## Future Hardening

- Integrate OPA policy bundles for richer, signed policy evaluation at the edge.
- Add per-tenant keys and isolated connection pools for data planes (Postgres/Neo4j/Vector stores).
- Support per-tenant LLM provider credentials and token accounting for stronger blast-radius guarantees.
- Extend kill-switch triggers to include automated thresholds (error-rate, latency spikes) with staged rollback.
