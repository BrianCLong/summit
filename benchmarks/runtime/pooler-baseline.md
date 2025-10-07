# MCP Runtime Benchmark Harness — Pooler Baseline

## Scope
- Measure cold start, warm start, and platform overhead for Firecracker micro-VM pooler.
- Compare against legacy container runtime and Metorial reference deployment.

## Methodology
1. Provision benchmark environment with identical hardware profiles (c6i.large) across IntelGraph and Metorial platforms.
2. Deploy instrumentation agent emitting OpenTelemetry spans (`benchmark_id=pooler-baseline-2025-09`).
3. Execute workload mix:
   - 40% tool invocations classified as "fast I/O" (≤25 ms external RTT).
   - 40% "standard" (100 ms external RTT) with moderate payloads (64 KB).
   - 20% "heavy" (400 ms RTT, 256 KB payloads).
4. For each tool class, run 5-minute warm-up followed by 30-minute measurement window.
5. Capture metrics:
   - `mcp_cold_start_ms` (distribution p50/p95/p99).
   - `mcp_warm_start_ms`.
   - `mcp_platform_overhead_ms` (wall-clock minus tool RTT).
   - `pooler_warm_hit_ratio`.
   - `error_budget_consumption`.
6. Store raw traces in `s3://intelgraph-benchmarks/mcp-runtime/pooler-baseline/YYYY-MM-DD/` and summarize in `results.json`.

## Acceptance Targets
- Cold start p95 ≤ 300 ms.
- Warm start p95 ≤ 30 ms.
- Platform overhead p95 ≤ 150 ms.
- Warm hit ratio ≥ 85%.

## Evidence Artifacts
- `benchmarks/runtime/artifacts/pooler-baseline-traces.tar.zst` (OpenTelemetry export).
- `benchmarks/runtime/artifacts/pooler-baseline-summary.csv`.
- Grafana dashboard snapshot ID: `runtime-bench-2025-09-30`.

## Next Steps
- Integrate harness into nightly CI once Firecracker pooler is feature complete.
- Extend harness to stress burst traffic (autoscale-to-zero scenarios).
