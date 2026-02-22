# API Surface

**Status**: v0.1 (Draft)
**Owner**: Jules
**Audience**: Internal Developers

## 1. Overview

The Switchboard API is the **only** entry point for agents to interact with the outside world. It enforces all governance checks.

**Base URL**: `http://localhost:8080/v1`

## 2. Endpoints

### 2.1 Service Management

#### `POST /services/register`
Register a new MCP server dynamically.
*   **Request**: `{"name": "brave", "url": "http://...", "capabilities": ["search"]}`
*   **Response**: `{"id": "srv-123", "status": "active"}`

#### `GET /services`
List available services and their health.
*   **Response**: `[{"id": "srv-123", "name": "brave", "health": "healthy"}]`

### 2.2 Capability Discovery

#### `GET /capabilities`
List all capabilities available to the current tenant.
*   **Query**: `?verb=search` (optional filter)
*   **Response**: `[{"verb": "search", "resource": "internet", "server": "brave"}]`

### 2.3 Policy & Routing (Preflight)

#### `POST /preflight`
Check if a tool call is allowed **before** making it.
*   **Request**: `{"tool": "search_web", "args": {"q": "foobar"}, "context": {...}}`
*   **Response**: `{"allowed": true, "reason": "policy-check-passed", "route": "brave-search"}`
*   **Response (Deny)**: `{"allowed": false, "reason": "deny-by-default: unauthorized domain"}`

### 2.4 Execution

#### `POST /tools/execute`
Execute a tool call via the Switchboard proxy.
*   **Headers**: `X-Tenant-ID: ...`, `X-Trace-ID: ...`
*   **Request**: `{"tool": "search_web", "args": {...}}`
*   **Response**: `{"result": "...", "receipt_id": "rcpt-123"}`

### 2.5 Credentials

#### `POST /credentials/mint`
Request a short-lived credential for a specific scope.
*   **Request**: `{"scope": "s3:read", "resource": "bucket-a"}`
*   **Response**: `{"token": "ey...", "expires_in": 3600}`

### 2.6 Audit & Receipts

#### `GET /receipts/{id}`
Retrieve a cryptographically signed receipt of an action.
*   **Response**: `{"id": "rcpt-123", "tool": "search", "hash": "sha256:...", "signature": "..."}`

#### `GET /health`
System health check.
*   **Response**: `{"status": "ok", "components": {"database": "ok", "policy-engine": "ok"}}`

## 3. Request/Response Shapes

### 3.1 Standard Error Response
All errors follow RFC 7807 (Problem Details).

```json
{
  "type": "https://summit.io/errors/policy-violation",
  "title": "Policy Violation",
  "status": 403,
  "detail": "Action delete_database is not allowed for tenant guest.",
  "instance": "/tools/execute"
}
```

### 3.2 Deny-by-Default Taxonomy

*   `unauthorized_tenant`: Tenant ID missing or invalid.
*   `capability_missing`: Tool not found or not advertised.
*   `policy_deny`: OPA policy returned false.
*   `quota_exceeded`: Rate limit hit.
*   `health_check_failed`: Target service is down.

## 4. Determinism

All state-changing requests must include an `Idempotency-Key` header.
*   If the key is seen within 24 hours, the previous response is returned without re-execution.
*   This is critical for **replayability** of agent runs.
