Provenance Export: Tenants, Signing, and Persisted Queries

Overview
- Export endpoint: `/export/provenance` (GET)
- GraphQL helper mutation: `exportProvenance(incidentId|investigationId, filter, format)` returns a pre-signed URL.
- Tenant enforcement: All exports are tenant-scoped via headers and signature.

Tenant Headers
- Required header: `x-tenant-id: <tenant-id>` (alias: `x-tenant`).
- GraphQL context also carries `tenantId` (from headers or JWT claim `tenantId`/`tid`).

Signature & Expiry
- Parameters included in signature: `scope,id,format,ts,tenant,reasonCodeIn,kindIn,sourceIn,from,to,contains` (omitted ones are excluded).
- HMAC-SHA256 with `EXPORT_SIGNING_SECRET` environment variable.
- Token expires after 15 minutes (`ts` is milliseconds since epoch).

Filters
- `reasonCodeIn`: Comma-separated list.
- `kindIn`, `sourceIn`: Comma-separated lists.
- `from`, `to`: ISO datetime.
- `contains`: Free-text.

Rate Limiting & Caching
- Per-tenant rate limit: 5 requests/minute (Redis-based if `REDIS_URL` set).
- JSON responses are cached in Redis for 60 seconds.

Persisted Queries
- File generated: `persisted-queries.json`.
- CI workflow `Persisted Queries` generates and uploads artifact on push/PR.
- Optional `Persisted Queries (Commit)` workflow (manual) opens a PR updating the file.
- To regenerate locally: `npm --prefix server run persisted:generate`.

Client Usage
- Use GraphQL mutation `exportProvenance` to obtain the signed URL, then `window.open(url)`.
- Include `x-tenant-id` header in all requests.

Troubleshooting
- `tenant_required` (400): Add `x-tenant-id` header and include `tenant` in signed params.
- `tenant_mismatch` (403): Ensure header tenant matches signed `tenant`.
- `invalid_signature` (403): Recompute signature with the exact params and secret.
- `expired` (403): Refresh signature (15-minute validity window).
