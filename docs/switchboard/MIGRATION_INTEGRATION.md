# Switchboard Integration & Migration (v0.1)

## Architecture Overview

Switchboard sits between the Orchestrator (Maestro Conductor) and the MCP Tool Servers.

```
[Maestro Conductor]  --->  [Switchboard (Router/Policy)]  --->  [MCP Server]
       |                            |                               |
       |                            v                               |
    (Identity)                 (Receipt Ledger)                  (Execution)
```

## Integration with Maestro Conductor

### Sequence

1.  **Discovery:** Maestro queries Switchboard for available capabilities.
    *   `GET /v1/capabilities?tenant=...`
2.  **Selection:** Maestro selects a tool (e.g., `github_read`).
3.  **Execution:** Maestro sends execution request to Switchboard.
    *   `POST /v1/execute`
    *   Body: `{ "server_id": "...", "tool": "...", "args": {...} }`
    *   Header: `Authorization: Bearer <maestro_token>`
4.  **Routing:** Switchboard validates, policies, routes to MCP server.
5.  **Result:** Switchboard returns result + Receipt ID.
    *   Response: `{ "result": ..., "receipt_id": "rcpt-..." }`

## IntelGraph & Provenance Linkage

*   **Graph Nodes:** Each execution creates a `Process` node in IntelGraph.
*   **Receipt ID:** The `receipt_id` is stored as a property on the `Process` node.
    *   `(p:Process { receipt_id: "rcpt-123", ... })`
*   **Traceability:** A query for `receipt_id` in the Ledger returns the cryptographic proof of what happened, linking back to the Graph node.

## Minimal Integration Steps (v0.1)

1.  **Deploy Switchboard:** Run the container/service.
2.  **Configure Tenant:** Create a tenant ID (e.g., `default`).
3.  **Register Servers:** Use the CLI or API to register existing tool servers.
    *   `switchboard register --url http://git-mcp:3000 --name github`
4.  **Update Maestro:** Point Maestro's tool client to Switchboard URL instead of direct server URLs.
    *   Before: `http://git-mcp:3000/mcp/execute`
    *   After: `http://switchboard:8080/v1/execute` (with Server ID)

## Backward Compatibility

*   **Sidecar Mode:** Switchboard can run as a sidecar proxy. Existing tools can be registered, and traffic can be gradually shifted.
*   **Bypass Mode:** For emergency debugging, an "admin" token can bypass policy checks (logged heavily), effectively acting as a direct proxy.
*   **API Compat:** Switchboard exposes an MCP-compliant endpoint, so it looks like a single "Mega MCP Server" to Maestro.
