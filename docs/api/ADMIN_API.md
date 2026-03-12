# Admin API Reference

The Admin API provides endpoints for monitoring system health, retrieving metrics, and managing administrative resources like users and audit logs.

## Health Check Endpoints

### `GET /health`

Global health check endpoint for the API gateway.

- **Response**: `200 OK`
- **Schema**:
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-15T10:30:00Z",
    "version": "1.0.0"
  }
  ```

### `GET /coherence/health`

Health check endpoint for the Coherence service.

- **Response**: `200 OK`
- **Schema**: `HealthStatus`

---

## Metrics & Monitoring

### `GET /metrics`

Prometheus-compatible metrics endpoint. Returns system-wide telemetry including:

- HTTP request counts and latencies
- GraphRAG query performance
- Ingestion pipeline throughput
- Resource utilization (CPU, Memory)

**Integration**: This endpoint is automatically scraped by the platform's Prometheus instance every 15 seconds.

---

## Administrative Operations

### User Management

#### `GET /api/admin/users`

List all users in the system.

- **Authentication**: Bearer Token (Admin Role Required)
- **Response**: `200 OK`
- **Schema**: Array of `User` objects.

### Audit Logs

#### `GET /api/admin/audit`

Query system audit logs.

- **Authentication**: Bearer Token (Admin Role Required)
- **Parameters**:
  - `limit` (query): Number of records to return.
  - `offset` (query): Pagination offset.
  - `userId` (query): Filter by user ID.
  - `action` (query): Filter by action type.
- **Response**: `200 OK`
- **Schema**: Array of audit log entries.

#### `POST /api/admin/audit/record`

Manually record an audit event.

- **Rate Limit**: 60 requests per minute.
- **Authentication**: Bearer Token.
- **Request Body**: Audit event details.
- **Response**: `200 OK`.
