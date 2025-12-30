# Investigation Workspaces

This document outlines the minimal domain model and in-memory storage layer for investigation workspaces used by the Summit platform. The store is intentionally deterministic and enforces tenant isolation at its API boundary.

## Domain model

- **Workspace**: `{ id, tenant_id, name, created_at }`
- **Case**: `{ id, workspace_id, title, status }`
- **EntityRef**: `{ type, external_id, display_name }`
- **Note**: `{ id, case_id, author_id, body, created_at }`

`created_at` timestamps are captured by the injected clock for determinism.

## In-memory store

The `InMemoryInvestigationStore` implements CRUD operations using Maps and simple arrays. The store never leaks data across tenants and validates tenant ownership before every read or write.

### Construction

```ts
import { InMemoryInvestigationStore } from "../../server/src/investigations/store";

const store = new InMemoryInvestigationStore({
  idGenerator: () => "deterministic-id",
  clock: () => new Date("2024-01-01T00:00:00Z"),
});
```

Both `idGenerator` and `clock` are optional; defaults use `crypto.randomUUID()` and `Date.now()`.

### Supported operations

- `createWorkspace(tenantId, name)`
- `listWorkspaces(tenantId)`
- `getWorkspace(tenantId, workspaceId)`
- `createCase(tenantId, workspaceId, { title, status? })`
- `listCases(tenantId, workspaceId)`
- `getCase(tenantId, caseId)`
- `updateCaseStatus(tenantId, caseId, status)`
- `addNote(tenantId, caseId, { author_id, body })`
- `listNotes(tenantId, caseId)`
- `attachEntityRef(tenantId, caseId, entityRef)`
- `listEntityRefs(tenantId, caseId)`

### Tenant isolation

All read and write methods require a `tenantId` argument. If a resource belongs to a different tenant, the store throws a tenant scope violation to prevent accidental cross-tenant access.

### Determinism

- IDs are produced by the injected `idGenerator` so tests can supply predictable sequences.
- Timestamps derive from the injected `clock` to make note ordering deterministic.
- Listing methods sort by creation time (and ID as a stable tie-breaker) to avoid non-deterministic ordering.
