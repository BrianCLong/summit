# Evidence Store Multitenancy Controls

## Summit Readiness Assertion
This document aligns with `docs/SUMMIT_READINESS_ASSERTION.md`.

## Tenant Isolation Model
- Every evidence bundle is namespaced by `tenantId`.
- Content-addressed blobs use tenant-prefixed keys (`tenants/{tenantId}/blobs/...`).
- Metadata indices are partitioned by tenant and subject digest.

## Replay Protection
- Evidence ingest rejects bundles whose subject digest already exists under a different tenant.
- Signed receipts include the tenant identifier and policy bundle digest.

## Access Controls
- Tenant-scoped RBAC for ingest/query/delete.
- Evidence deletion is restricted to compliance-approved workflows (WORM default).

## Residency Boundaries
- Storage tiers map to residency regions; tenant policy selects allowed regions.
- Cross-region replication requires explicit residency waiver.

## Observability
- All evidence reads/writes emit audit events with tenant identifiers and digest hashes.

## MAESTRO Alignment

- **MAESTRO Layers**: Data, Infra, Observability, Security.
- **Threats Considered**: cross-tenant replay, unauthorized access, residency drift.
- **Mitigations**: namespace isolation, policy-bound routing, immutable audit trails.
