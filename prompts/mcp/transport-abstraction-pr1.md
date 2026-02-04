# PR1 Transport Abstraction Prompt

Implement a pluggable MCP transport abstraction, registry, and negotiation
policy without adding gRPC runtime support. Keep existing JSON-RPC over
WebSocket behavior intact and default to the current transport unless explicitly
configured.

## Scope

- Introduce client/server transport session interfaces with metadata and
  deadline support.
- Add a transport registry with negotiation policy
  (`prefer_grpc_fallback_http`, `strict`).
- Ensure existing MCP flows still run over WebSocket JSON-RPC by default.
- Add unit tests for registry selection, negotiation, and metadata propagation
  surfaces.
- Add architecture documentation for the transport layer.
- Update `docs/roadmap/STATUS.json` with a revision note.

## Non-Goals

- Implement gRPC transports.
- Modify MCP tool semantics or handlers.

## Acceptance

- No behavior change unless configuration opts into the new transport
  negotiation.
- Tests cover registry selection and metadata propagation.
