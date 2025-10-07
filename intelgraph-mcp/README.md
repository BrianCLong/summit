# IntelGraph MCP Exceedance Kickstart

This workspace seeds the Maestro Conductor differentiation program with runtime, replay, SDK, conformance, and benchmarking scaffolds aligned to ADR-0003/0004 and the 90-day roadmap.

## Packages
- `services/runtime-pooler`: Firecracker pooler API skeleton with deterministic sandbox hooks, OTEL bootstrap, and transport adapters (HTTP+SSE, STDIO).
- `services/replay-engine`: Deterministic recorder/replayer service with storage, redaction stubs, and Fastify API.
- `packages/sdk-ts`: TypeScript SDK for connect/invoke, capability discovery (`listTools/resources/prompts`), SSE streams, and session teardown.
- `tools/conformance-cli`: CLI harness for marketplace conformance validation including transport & JSON-RPC checks.
- `benchmarks/harness`: k6 baseline workload for cold-start and session SLO measurement.

## Getting Started
```bash
pnpm install
pnpm build
pnpm --filter runtime-pooler dev # port 8080
pnpm --filter replay-engine dev  # port 8081
```

> Offline note: repo scripts call `npm run xpnpm`, which looks for a vendored `tools/pnpm/pnpm-9.6.0.cjs` or a `PNPM_BIN`. Drop the pnpm binary there to bypass Corepack downloads.

Makefile shortcuts (calls the pnpm shim automatically):
```bash
make install
make test
make dev-runtime
make policy-sim
make shootout   # starts the shootout UI locally
```

Set up local Firecracker mocks (skips actual VM launches):
```bash
export FC_MOCK=1
```

Run the pooler baseline harness:
```bash
ENDPOINT=http://localhost:8080 TOKEN=dev k6 run benchmarks/harness/k6/pooler-baseline.js
```

Stream over HTTP+SSE:
```bash
curl -i http://localhost:8080/v1/stream/test
```

JSON-RPC smoke test:
```bash
curl -s -X POST http://localhost:8080/jsonrpc \
  -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"echo","params":{"toolClass":"echo","args":{"x":1}}}' | jq .
```

Run conformance CLI:
```bash
pnpm --filter @intelgraph/mcp-conformance-cli start -- -e http://localhost:8080
pnpm --filter @intelgraph/mcp-conformance-cli start -- \
  -e http://localhost:8080 \
  --server echo \
  --server-version 0.1.0 \
  --metrics benchmarks/shootout/results.json \
  --badge-out docs/reports/badges/echo.json
```

SSE latency benchmark:
```bash
ENDPOINT=http://localhost:8080 TOKEN=dev k6 run benchmarks/harness/k6/sse-latency.js
```

Devcontainer (optional) for a fully provisioned toolchain:
```bash
docker build -t intelgraph-mcp-dev -f devcontainer/Dockerfile .
docker run --rm -it -v "$PWD":/workspace -w /workspace intelgraph-mcp-dev bash
```

### Policy Simulation
Ensure changes preserve purpose/retention rules:
```bash
make policy-sim
```

### Shootout UI
Render signed benchmarks and badges locally:
```bash
make shootout
# opens on http://localhost:3000
```

### Environment Variables
- `FC_KERNEL_PATH`, `FC_ROOTFS_PATH`: production Firecracker artifacts (optional locally when `FC_MOCK=1`).
- `NSJAIL_BIN`, `NSJAIL_CONFIG`: override sandbox binary/config for STDIO transports.
- `SSE_BUFFER_SIZE`, `SSE_HEARTBEAT_MS`: tune event buffering + heartbeat cadence.
- `REPLAY_ENGINE_URL`: base URL for deterministic replay ingestion (defaults to `http://localhost:8081`).
- `OPA_URL`: optional Open Policy Agent base URL for on-path authorization decisions.

## Incremental Tickets (ready to open)
### EPIC: Runtime (Pooler)
- RT-01 Implement Firecracker controller (API sock, jailer, snapshot/restore) — 3d
- RT-02 Snapshot cache per toolClass with LRU + prewarm cron — 2d
- RT-03 Deterministic sandbox runner (syscall filter, network egress policy) — 4d
- RT-04 OTEL spans for session start + invoke; pool hit metric — 1d
- RT-05 k6 baseline vs legacy runtime; report deltas — 1d
- RT-TR-06 HTTP+SSE gateway with keepalive; p95 stream latency ≤250 ms — 3d
- RT-TR-07 STDIO adapter with OS sandboxing — 3d
- RT-PR-08 JSON-RPC 2.0 validator + error mapper — 2d
- RT-CB-09 Capability registry enforcing resources/tools/prompts semantics — 3d
- RT-TR-10 STDIO seccomp profile & no-net default — 3d
- RT-TR-11 SSE resume tokens + proxy compatibility matrix — 2d

### EPIC: Replay
- RP-01 Event taps (mcp/net/fs/env) + hashing; seed capture — 3d
- RP-02 Side-effect stubs registry + policy binding — 3d
- RP-03 Divergence detector + causal graph UI (MVP) — 4d
- RP-04 Privacy redaction + retention enforcement — 2d
- RP-TR-05 Record JSON-RPC frames + SSE messages for deterministic replay — 3d
- RP-TR-06 Journey-of-request trace export — 2d

### EPIC: Marketplace/DX
- DX-01 SDK alpha ergonomics (connect/invoke/stream + typings) — 3d
- DX-02 Local emulator for tool authors — 3d
- DX-03 Conformance CLI checks mapped to spec; badges — 4d
- SDK-TR-01 SSE helper with backoff/pause APIs — 3d
- SDK-TR-02 Dual transport support (STDIO + HTTP/SSE) — 4d
- SDK-CP-01 Capability discovery APIs — 2d
- SDK-CP-02 Streaming invokes with cancellation — 2d
- SDK-OBS-01 Map JSON-RPC ids to OTEL spans — 1d
- SDK-CP-03 Extended capability discovery schemas — 2d

### EPIC: Compliance/Benchmarks
- CB-01 Provenance ledger write-path hooks; signed artifacts — 3d
- CB-02 Public shootout dashboard scaffold; signed results — 3d
- BENCH-SSE-01 SSE latency/throughput benchmark — 2d
- BENCH-STDIO-02 Local STDIO invoke benchmark — 1d
- BENCH-SSE-03 k6 jitter/packet-loss scenario — 2d

### EPIC: Conformance & Security
- CONF-TPT-01 Transport matrix checks (HTTP+SSE/STDIO) — 3d
- CONF-JRPC-02 JSON-RPC compliance suite — 2d
- CONF-CAP-03 Capability declaration validation — 2d
- CONF-SEC-04 Transport auth enforcement — 2d
- CONF-JRPC-03 Negative test suite (malformed/unknown/id reuse/batch) — 2d

### EPIC: Documentation & GTM
- DOCS-ROLE-01 Host/Client/Server role guide + diagrams — 2d
- DOCS-COOK-02 Developer cookbook for MCP servers — 2d

## Acceptance Targets
- Session start p95 ≤ 250 ms across transports.
- Cold start p95 ≤ 300 ms with ≥0.8 warm-hit ratio.
- Replay success rate ≥ 95% on golden fixtures with JSON-RPC/SSE fidelity.
- SSE stream p95 latency ≤ 250 ms; STDIO invoke p95 ≤ 20 ms.
- Conformance CLI ≥ 90% pass on partner servers and transport/protocol suites green.
- SBOM generated in CI with signatures verified during publish.
