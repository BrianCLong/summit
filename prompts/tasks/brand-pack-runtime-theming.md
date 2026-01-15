# Brand Pack Runtime Theming Task Prompt (v1)

## Objective

Deliver a tenant-aware brand pack pipeline with runtime theming, provenance receipts, and audit logging for Switchboard without rebuilds.

## Scope

- Server: brand pack schema/loader/service/routes, provenance receipt emission, audit event emission, cache invalidation.
- Web: runtime theme provider, token overrides, tenant-aware pack fetch.
- Docs: brand pack contract + receipt format, roadmap status update.

## Constraints

- Use policy-as-code patterns where applicable and emit provenance receipts for pack application.
- Preserve existing API behavior and add new endpoints under `/api/brand-packs`.
- Maintain production readiness and conventional commits.

## Required Outputs

- Brand pack schema + loader with tokens, logos, name/URL, nav labels.
- Tenant/partner brand pack endpoint with cache invalidation and receipt query path.
- Provenance receipt emitted on pack application.
- Switchboard runtime theming wired in `apps/web` using tenant context.
- Audit log entry for pack application.
- Documentation updates for contract and receipt.
