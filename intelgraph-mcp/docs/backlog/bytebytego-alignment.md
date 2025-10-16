# ByteByteGo Alignment Backlog (Sep 30, 2025)

This backlog supplement tracks tickets introduced by the MCP transport + capability deepening effort.

## Runtime

- `RT-TR-06` HTTP+SSE gateway with keepalive and telemetry.
- `RT-TR-07` STDIO adapter with sandbox policies.
- `RT-PR-08` JSON-RPC validator & mapper.
- `RT-CB-09` Capability registry enforcing resources/tools/prompts semantics.
- `RT-TR-10` STDIO seccomp profile, no-network default.
- `RT-TR-11` SSE resume tokens & proxy matrix.

## Replay & Observability

- `RP-TR-05` Capture JSON-RPC/SSE frames in recordings.
- `RP-TR-06` Journey-of-request causal traces.

## SDK & DX

- `SDK-TR-01` SSE helper.
- `SDK-TR-02` Dual transport.
- `SDK-CP-01` Capability discovery.
- `SDK-CP-02` Streaming invoke.
- `SDK-OBS-01` Span correlation.
- `SDK-CP-03` Enhanced capability schemas.

## Conformance & Security

- `CONF-TPT-01` Transport matrix.
- `CONF-JRPC-02` JSON-RPC compliance.
- `CONF-CAP-03` Capability behavior validation.
- `CONF-SEC-04` Auth enforcement.
- `CONF-JRPC-03` Negative testing suite.

## Benchmarks

- `BENCH-SSE-01` SSE latency harness.
- `BENCH-STDIO-02` STDIO latency harness.
- `BENCH-SSE-03` Packet-loss scenario.

## Documentation

- `DOCS-ROLE-01` Role guide.
- `DOCS-COOK-02` Developer cookbook.

## Acceptance Criteria Additions

- Dual transport green in conformance.
- JSON-RPC negative suite passes 100%.
- SSE p95 ≤ 250 ms; STDIO p95 ≤ 20 ms.
- Capability semantics evidenced in provenance ledger.
