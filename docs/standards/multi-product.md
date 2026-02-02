# Multi-Product Standards

## Routing
- Each product MUST have its own router in `api/<product_slug>/router.py`.
- Product routers MUST be mounted under `/api/<product_slug>/`.
- Each product router MUST expose a `/health` endpoint.
- Product routes MUST be disabled by default via feature flags.

## Tenancy
- Requests SHOULD include a tenant context header (e.g., `X-Tenant-ID`).
- Cross-tenant data leakage MUST be prevented at the database and application layers.
- For Week 1, tenancy is reserved but not strictly enforced.

## Feature Flags
- Platform-wide flags are managed in `api/platform_spine/flags.py`.
- Product-specific flags follow the naming convention `<PRODUCT_SLUG>_ENABLED`.
- All new product features MUST be behind a flag that defaults to `false`.

## Naming Conventions
- Suffixes: `FactFlow`, `FactLaw`, etc.
- Internal slugs: `factflow`, `factlaw`, etc.
