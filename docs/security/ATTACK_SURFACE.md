# Attack Surface Inventory

## 1. Public Facing Endpoints

These endpoints are accessible from the public internet.

| Method | Route | Auth Required | Rate Limited | Function |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/health` | No | No (Exempt) | Liveness check |
| `GET` | `/api/health` | No | No (Exempt) | Deep health check |
| `POST` | `/auth/login` | No | Yes (Global) | User Login |
| `POST` | `/auth/refresh` | No | Yes (Global) | Token Refresh |
| `POST` | `/api/webhooks/*` | No (HMAC Signature) | Yes (Global) | External Integrations |

## 2. Tenant API Surface

These endpoints require a valid JWT with `tenant_id` claim and are guarded by `tenantContextMiddleware`.

| Method | Route | Privilege | Function |
| :--- | :--- | :--- | :--- |
| `POST` | `/graphql` | Standard | Primary Data Interface (Read/Write) |
| `GET` | `/api/ingest` | Standard | Data Ingestion |
| `POST` | `/api/maestro/*` | Standard | Agent Execution |
| `GET` | `/api/search/*` | Standard | Unified Search |
| `GET` | `/api/reporting/*` | Standard | Report Generation |

## 3. Administrative API Surface

These endpoints require `role: admin` claim.

| Method | Route | Function |
| :--- | :--- | :--- |
| `GET` | `/api/admin/rate-limits/:userId` | Inspect user quotas |
| `*` | `/api/security/*` | Security Administration |
| `*` | `/api/compliance/*` | Compliance Reporting |
| `*` | `/api/plugins/*` | Plugin Management |

## 4. Background Workers & Jobs

These processes run asynchronously and process data from queues.

*   **`TrustWorker`**: Calculates trust scores.
*   **`RetentionWorker`**: Enforces data retention policies (deletes old data).
*   **`WebhookWorker`**: Processes incoming webhook payloads.
*   **`StreamIngest`**: Consumes high-velocity data streams.
*   **`MaestroService`**: Executes autonomous agent chains.

## 5. Configuration Entry Points

*   **Environment Variables**: `server/src/config.ts` loads critical secrets (`DATABASE_URL`, `JWT_SECRET`).
*   **Feature Flags**: `server/src/middleware/feature-flag-context.ts` loads runtime flags.
*   **Policy Files**: OPA policies in `policy/`.

## 6. Protection Mechanisms Mapping

| Surface | Authentication | Authorization | Rate Limiting | Input Validation |
| :--- | :--- | :--- | :--- | :--- |
| **API** | `authenticateToken` | `tenantContextMiddleware` | `TieredRateLimitMiddleware` | `sanitizeInput`, `zod` |
| **GraphQL** | `authenticateToken` | `pbacPlugin`, `@auth` | `rateLimitAndCachePlugin` | `depthLimit`, `checkType` |
| **Webhooks** | Signature (Header) | Whitelist | `TieredRateLimitMiddleware` | `ingestValidator` |
| **Workers** | N/A (Internal) | N/A | Queue Concurrency | Schema Validation |
