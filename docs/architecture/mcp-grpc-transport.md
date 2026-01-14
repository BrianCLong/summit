# MCP gRPC Transport (Summit)

## Summary

This document defines Summit’s first-class gRPC transport for MCP. The design keeps the MCP
semantics intact while adding binary Protobuf envelopes, bidirectional streaming, flow control,
policy-aware authorization, and evidence-grade telemetry.

## Why gRPC for MCP

- **Binary Protobuf** eliminates JSON↔Protobuf transcoding overhead.
- **Bidirectional streaming** supports agentic workflows with built‑in flow control/backpressure.
- **Deadlines & standardized status codes** provide deterministic timeouts and error semantics.
- **Enterprise security** via mTLS, JWT/OAuth bearer auth, and method-level authorization.
- **OpenTelemetry** enables traceable, auditable tool-call trails.

## Architecture

```
+-----------------+            +-----------------------+
| MCP Client SDK  |--(grpc)--> | Runtime Pooler (MCP)  |
|  - transport    |            |  - gRPC server         |
|  - negotiation  |            |  - policy interceptors |
+-----------------+            +-----------+-----------+
                                            |
                                            | sandbox invoke
                                            v
                                   +-------------------+
                                   | Tool Runtime VM   |
                                   +-------------------+
```

## Enable gRPC Transport

**Server (runtime-pooler)**

```bash
export MCP_GRPC_ENABLED=true
export MCP_GRPC_HOST=0.0.0.0
export MCP_GRPC_PORT=9090
export MCP_GRPC_MAX_IN_FLIGHT=32
export MCP_GRPC_DEFAULT_DEADLINE_MS=15000
```

**TLS (optional)**

```bash
export MCP_GRPC_TLS_ENABLED=true
export MCP_GRPC_TLS_CERT=/etc/summit/tls/server.crt
export MCP_GRPC_TLS_KEY=/etc/summit/tls/server.key
export MCP_GRPC_TLS_CA=/etc/summit/tls/ca.crt
export MCP_GRPC_TLS_REQUIRE_CLIENT_CERT=true
```

**Client (SDK)**

```ts
import { McpClient } from "@intelgraph/mcp-sdk";

const client = new McpClient("http://localhost:8080", "token", {
  transport: "auto",
  preferGrpc: true,
  grpcAddress: "localhost:9090",
  grpc: { deadlineMs: 15000 },
});
```

## Security Model

- **mTLS:** Server verifies client certificates when enabled. TLS paths are configurable via env.
- **JWT/OAuth:** Bearer tokens are read from gRPC metadata (`authorization`) and used by policy.
- **Method-level authorization:** Each tool invocation is authorized before execution.
- **Policy receipts:** Authorization decisions emit receipts attached to response metadata.

## Observability & Evidence

- **OpenTelemetry spans** include `rpc.method`, transport type, and session identifiers.
- **Policy receipts** are surfaced via `x-ig-policy-receipt` metadata headers.
- **Transcript hashes** (`x-ig-transcript-hash`) attach deterministic hashes for audit evidence.

## Ops Guidance

- **Deadlines:** Clients must set deadlines for every call. The server enforces defaults when
  omitted.
- **Retry policy:** Only retry safe/idempotent calls (e.g., `listTools`). Avoid retrying tool
  invocations without explicit idempotency.
- **Backpressure:** Streaming RPC (`Connect`) pauses read when in-flight requests exceed bounds.

## Benchmarking (Transport Comparison)

```bash
MCP_HTTP_URL=http://localhost:8080 MCP_GRPC_ADDRESS=localhost:9090 MCP_TOKEN=dev \
  pnpm --filter mcp-bench-harness transport:compare
```

## Migration Strategy

1. **Deploy gRPC server in parallel** with existing HTTP/SSE transport.
2. **Enable transport negotiation** in the SDK (`transport: 'auto'`).
3. **Observe traces & policy receipts**, then increase traffic to gRPC.
4. **Gradually migrate clients** to gRPC-first mode.

## Example Environments

### Local Dev

- HTTP/SSE: `http://localhost:8080`
- gRPC: `localhost:9090`
- TLS optional (self-signed certs)

### Staging

- gRPC enabled with mTLS
- OPA policy checks enabled (`OPA_URL`)
- OTEL exporter configured

### Production

- gRPC enabled with mTLS and rotating certificates
- Strict policy receipts enforced
- Trace + metrics exported to audit store

## Rollback

Set `MCP_GRPC_ENABLED=false` and restart the runtime-pooler. HTTP/SSE remains the default
transport for clients.
