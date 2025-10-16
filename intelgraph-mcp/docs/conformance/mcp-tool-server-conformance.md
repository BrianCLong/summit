# MCP Tool Server Conformance Specification

## Overview

IntelGraph's marketplace requires MCP servers to satisfy protocol, security, and performance guarantees across transports (STDIO, HTTP+SSE) and capabilities (tools, resources, prompts).

## Transport Requirements

- **HTTP + SSE:** Servers must stream responses over Server-Sent Events with heartbeat support and resume tokens. Connections secured via mTLS or JWT as issued by the runtime pooler.
- **STDIO:** Local transports execute inside sandbox wrappers (seccomp, cgroups, no-network by default). Servers must gracefully handle stdin/stdout JSON messages separated by `\n`.

Test coverage: `CONF-TPT-01`, `CONF-SEC-04`, `BENCH-SSE-01`, `BENCH-STDIO-02`.

## JSON-RPC 2.0 Protocol

- Accept only `jsonrpc: "2.0"` requests; reject malformed payloads with `-32600`.
- Respond with `-32601` for unknown methods; `-32602` for invalid params.
- Do not accept batch requests unless explicitly listed in registry metadata.

Test coverage: `CONF-JRPC-02`, `CONF-JRPC-03`.

## Capability Semantics

- **Resources:** Read-only data; responses tagged with retention tier, provenance hash.
- **Tools:** Side-effectful actions; must emit effect summaries suitable for provenance ledger.
- **Prompts:** Versioned templated interactions; version increments recorded in registry.

Servers MUST surface capability manifests via `.well-known/mcp-tools`, `.well-known/mcp-resources`, and `.well-known/mcp-prompts` endpoints consumed by the SDK.

Test coverage: `CONF-CAP-03`, replay evidence hooks.

## Observability & Evidence

- Emit OTEL spans annotated with `rpc.method`, `transport.type`, `capability.name`.
- Provide deterministic replay fixtures (JSON-RPC frames, SSE payloads, environment seeds).
- Supply SBOM & signature manifest; zero critical vulnerabilities.

## Submission Checklist

1. Run `pnpm --filter @intelgraph/mcp-conformance-cli start -- -e <endpoint>` and attach JSON output.
2. Provide latency benchmarks (pooler baseline, SSE latency) signed by IntelGraph harness.
3. Upload SBOM, provenance attestations, and replay fixture bundle.
4. Declare supported transports, capabilities, and auth scopes in registry metadata.

## References

- Runtime tickets: `RT-TR-06`, `RT-TR-07`, `RT-CB-09`.
- SDK tickets: `SDK-TR-02`, `SDK-CP-01`, `SDK-OBS-01`.
- Documentation ticket: `DOCS-ROLE-01`.

## Submission Checklist

- Attach `summary.json` signed with developer key.
- Provide latency benchmarks (pooler baseline, SSE latency) signed by IntelGraph harness.
- Upload SBOM, provenance attestations, and replay fixture bundle.
- Declare supported transports, capabilities, and auth scopes in registry metadata.
- Generate Marketplace badge JSON:
  ```bash
  pnpm --filter @intelgraph/mcp-conformance-cli start -- \
    -e https://your-mcp.example \
    --server your-server \
    --server-version 0.1.0 \
    --metrics benchmarks/shootout/results.json \
    --badge-out docs/reports/badges/your-server.json
  ```
