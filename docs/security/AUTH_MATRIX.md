# API Authorization Matrix

## Roles
- **ADMIN**: Full access to all endpoints.
- **ANALYST**: Read/Write access to operational data (investigations, entities, graphs). Can request AI analysis.
- **VIEWER**: Read-only access to operational data.
- **PUBLIC**: No access (except potentially specific webhooks or health checks if configured).

## Permissions
Defined in `server/src/services/AuthService.ts`:
- `investigation:*` (create, read, update)
- `entity:*` (create, read, update, delete)
- `relationship:*` (create, read, update, delete)
- `tag:*` (create, read, delete)
- `graph:read`, `graph:export`
- `ai:request`

## Route Enforcement Matrix

| Route Path | Method | Description | Required Auth | Required Permission | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Global** |
| `/graphql` | POST | GraphQL API | `ensureAuthenticated` | Managed by `@auth` directive & PBAC | Currently has `authenticateToken` middleware but needs stricter production config check. |
| `/metrics` | GET | Prometheus Metrics | `ensureAuthenticated` | `system:metrics` (Admin) | Currently unprotected in `app.ts`! |
| `/monitoring/*` | ALL | Monitoring Endpoints | `ensureAuthenticated` | `system:monitoring` (Admin) | Currently unprotected! |
| **API** |
| `/api/ai/*` | POST | AI Analysis | `ensureAuthenticated` | `ai:request` | Currently unprotected! |
| `/api/ai/nl-graph-query` | POST | NL Graph Query | `ensureAuthenticated` | `ai:request` | Currently unprotected! |
| `/api/narrative-sim/*` | ALL | Narrative Sim | `ensureAuthenticated` | `simulation:run` | Currently unprotected! |
| `/disclosures/*` | ALL | Disclosures | `ensureAuthenticated` | `disclosure:read/create` | Currently unprotected! |
| `/rbac/*` | ALL | RBAC Mgmt | `ensureAuthenticated` | `admin:rbac` | Currently unprotected! |
| `/api/webhooks/*` | POST | Webhooks | None (Signature verification) | None | Should use signature verification middleware. |
| `/api/support/*` | ALL | Support Tickets | `ensureAuthenticated` | `support:read/write` | Currently unprotected! |
| `/api/scenarios/*` | ALL | Scenarios | `ensureAuthenticated` | `scenario:read/write` | Currently unprotected! |
| `/search/evidence` | GET | Fulltext Search | `ensureAuthenticated` | `evidence:read` | **Inline route in app.ts is unprotected.** |
| **Health** |
| `/health` | GET | Health Check | None | None | Publicly accessible (standard practice). |

## Implementation Plan
1.  **Refactor `app.ts`**:
    -   Define `protectedApiRouter` for all `/api` and sensitive routes.
    -   Apply `authenticateToken` (or `ensureAuthenticated`) to this router.
    -   Move `/search/evidence` to a dedicated router or applying auth.
    -   Apply auth to `/metrics` and `/monitoring`.
2.  **Update `AuthService.ts`**:
    -   Add missing permissions: `system:metrics`, `system:monitoring`, `simulation:run`, `admin:rbac`, `evidence:read`.
    -   Update `ROLE_PERMISSIONS` to include these for ADMIN and ANALYST (where appropriate).
3.  **Harden Routes**:
    -   Update `server/src/routes/*.ts` to use `requirePermission` for finer-grained control where the global auth isn't enough (e.g., specific ADMIN-only routes).

<!-- Verified: 2025-05-15 10:00:00 -->
