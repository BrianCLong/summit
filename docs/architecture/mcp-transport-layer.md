# MCP Transport Layer (Session Abstraction)

## Purpose

The MCP transport layer provides a stable session interface that decouples MCP
client/server logic from the underlying transport (WebSocket JSON-RPC today,
future gRPC and stdio transports tomorrow). The abstraction enables transport
negotiation without changing existing MCP behavior, and it preserves backward
compatibility for existing MCP deployments.

## Interfaces

### Client Transport Session

A `ClientTransportSession` must provide:

- `connect()` with optional deadlines and metadata headers.
- `send()` for MCP requests.
- `recv()` subscription for MCP responses.
- `close()` to terminate the transport.

Each session is responsible for handling wire-specific concerns such as
connection setup and framing while leaving MCP request/response handling to the
client.

### Server Transport Session

A `ServerTransportSession` exposes:

- `listen()` with optional interceptors (for auth, tracing, policy checks).
- `accept()` handler that receives MCP requests with context and returns MCP
  responses.
- `close()` for graceful shutdown.

Server contexts carry metadata (trace IDs, auth headers, deadline hints), and
interceptors provide standardized hooks for policy enforcement and telemetry.

## Registry and Negotiation

`MCPTransportRegistry` maintains available transport factories. Configuration
selects the preferred transport, and the negotiation policy governs fallback
behavior:

- `prefer_grpc_fallback_http`: when gRPC is unavailable, fall back to HTTP
  (JSON-RPC over WebSocket) with a warning and metric.
- `strict`: fail if the preferred transport is not available.

The default registry keeps existing MCP behavior by mapping `jsonrpc` and `http`
to the WebSocket JSON-RPC transport.

### Configuration

Conductor reads `MCP_TRANSPORT` (default: `jsonrpc`) and
`MCP_TRANSPORT_POLICY` (default: `strict`) to set `mcp.transport` and
`mcp.transportPolicy` values at runtime.

## Adding a New Transport

1. Implement `ClientTransportSession` (and optionally
   `ServerTransportSession`).
2. Register the factory in `createDefaultTransportRegistry()` or a runtime
   registry.
3. Enable via configuration (`mcp.transport`) and select an appropriate
   negotiation policy.

## Compatibility Notes

- Existing MCP servers continue to use JSON-RPC over WebSocket by default.
- No gRPC implementation is included in this layer; the registry only reserves
  the transport name for future use.
