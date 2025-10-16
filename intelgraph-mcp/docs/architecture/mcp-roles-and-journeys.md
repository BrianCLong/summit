# MCP Roles and Request Journey

This note aligns IntelGraph Maestro Conductor with the industry-standard MCP mental model popularized by ByteByteGo (Sep 30, 2025).

## Roles

- **Host App (CompanyOS / Switchboard):** Orchestrates agent workflows, enforces policy, and brokers sessions.
- **MCP Client (Runtime Pooler):** Maintains 1:1 connections to MCP servers, manages transport selection (STDIO vs HTTP+SSE), and issues capability-scoped tokens.
- **MCP Server (Partner / Internal Integration):** Implements tools, resources, and prompts surfaced to Host Apps.

## Transport Stack

1. **Transport Layer**
   - `stdio://` for local/edge servers — sandboxed with seccomp & cgroups, default no-network.
   - `https://` for remote servers — HTTP requests with SSE streaming responses, mTLS + heartbeat.
2. **Protocol Layer**
   - JSON-RPC 2.0 framing, strict error codes (`-32600`, `-32601`, `-32602`, `-32603`).
   - Batches disabled unless explicitly whitelisted per server manifest.
3. **Capability Layer**
   - **Resources:** Read-only data sources; immutable responses; tagged with retention tier.
   - **Tools:** Side-effectful actions; audited via provenance ledger.
   - **Prompts:** Versioned templates; changes bump semver + hash.

## Request Journey

1. Host establishes session using capability token → Runtime Pooler selects transport per server.
2. JSON-RPC request sent; OTEL span annotated (`rpc.method`, `transport.type`, `capability`).
3. Server executes tool/resource/prompt; downstream I/O recorded by Recorder.
4. Response streamed (SSE) or returned inline; provenance ledger entry sealed.
5. Replay Engine rehydrates JSON-RPC + SSE frames for deterministic debugging.

## Evidence Hooks

- OTEL traces link `rpc.id` ↔ span id for causal graphs.
- Recorder stores raw frames (`channel: 'mcp' | 'net' | 'env'`) with deterministic seeds.
- Conformance CLI verifies transport continuity, JSON-RPC compliance, and capability semantics.

## Next Steps

- Implement SSE resume tokens + keepalive probes.
- Harden STDIO adapter with seccomp profile and egress policy.
- Publish developer cookbook aligning Host/Client/Server responsibilities.
