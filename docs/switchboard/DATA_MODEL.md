# Switchboard Data Model (v0.1)

## Core Entities

### 1. Tenant
Logical isolation boundary for resources and policies.
*   `id`: UUID (pk)
*   `name`: String
*   `status`: Active | Suspended
*   `config`: JSON (quotas, default policies)

### 2. Actor / Principal
Identity initiating a request.
*   `id`: String (pk) - e.g., `user:jdoe`, `service:maestro-conductor`
*   `tenant_id`: UUID (fk)
*   `roles`: List<String>
*   `metadata`: JSON (department, clearance)

### 3. MCP Server
A registered Model Context Protocol server.
*   `id`: UUID (pk)
*   `tenant_id`: UUID (fk)
*   `name`: String
*   `url`: String (endpoint)
*   `transport`: HTTP | SSE | Stdio (local only)
*   `status`: Registered | Verified | Healthy | Quarantined | Disabled
*   `version`: String (semver)
*   `capabilities_hash`: SHA256 (of capabilities list)

### 4. Capability
A specific tool or resource exposed by an MCP Server.
*   `id`: UUID (pk)
*   `server_id`: UUID (fk)
*   `type`: Tool | Resource | Prompt
*   `name`: String (e.g., `calculator`, `git_commit`)
*   `schema`: JSON (input/output schema)
*   `tags`: List<String> (e.g., `readonly`, `pii`)

### 5. Policy Decision
Record of a policy evaluation.
*   `id`: UUID (pk)
*   `request_id`: UUID (fk)
*   `policy_id`: String
*   `decision`: Allow | Deny
*   `reasons`: List<String> (e.g., ["dual_use_violation", "quota_exceeded"])
*   `obligations`: JSON (e.g., {"log_retention": "7y"})
*   `timestamp`: ISO8601

### 6. Credential Grant
Ephemeral credential issued for a specific request.
*   `id`: UUID (pk)
*   `request_id`: UUID (fk)
*   `issuer`: String (e.g., `switchboard-vault`)
*   `scope`: String (e.g., `read:repo:123`)
*   `expiry`: ISO8601 (TTL < 5m)
*   `revoked`: Boolean

### 7. Routing Trace (Decision Graph)
The path taken by a request.
*   `id`: UUID (pk)
*   `request_id`: UUID (fk)
*   `steps`: JSON List
    *   `step`: Normalized | Matched | Policed | Dispatched
    *   `node`: Server ID / Policy ID
    *   `latency_ms`: Int
    *   `timestamp`: ISO8601

### 8. Receipt
Cryptographically signed record of execution.
*   `id`: UUID (pk)
*   `request_id`: UUID (fk)
*   `actor_id`: String
*   `server_id`: UUID
*   `tool_name`: String
*   `input_hash`: SHA256
*   `output_hash`: SHA256
*   `policy_version`: String
*   `signature`: String (Ed25519)
*   `previous_hash`: SHA256 (for ledger chaining)

### 9. Health Snapshot
Point-in-time health status of an MCP server.
*   `id`: UUID (pk)
*   `server_id`: UUID (fk)
*   `status`: OK | Error
*   `latency_ms`: Int
*   `error_code`: String (nullable)
*   `timestamp`: ISO8601

### 10. Cache Entry
Cached capability lists or policy results.
*   `key`: String (pk) - `{tenant}:{type}:{hash}`
*   `value`: JSON
*   `ttl`: Int (seconds)

## Persistence Semantics

*   **Registry (Server, Capability, Tenant, Actor):** Mutable, relational (PostgreSQL). Indexed by ID, Name, Tenant.
*   **Ledger (Receipt, Policy Decision, Routing Trace, Credential Grant):** Append-Only, immutable. Stored in TimescaleDB or similar time-series/log store. Indexed by Request ID, Actor ID, Server ID. High write throughput.
*   **Health:** Ephemeral/Time-series. Retention: 7 days.
*   **Cache:** Volatile (Redis). LRU eviction.
