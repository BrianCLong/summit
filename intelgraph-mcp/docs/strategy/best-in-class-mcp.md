# Best-in-Class MCP Blueprint

## North Star Metrics
- Cold start p95 ≤ 200 ms; session start p95 ≤ 180 ms; overhead p95 ≤ 100 ms.
- Replay success ≥ 99%; divergence MTTR ≤ 1 day.
- Cost overhead ≤ $0.06 / 1k calls; budget alerts at 80% / 90%.
- DX: time-to-first-tool < 5 minutes; SDK NPS ≥ +50.

## Pillars & Differentiators
1. **Runtime Superiority** – Firecracker snapshot pooler v2, deterministic sandboxes, adaptive concurrency.
2. **Truth & Safety** – Provenance ledger, OPA ABAC on-path, signed artifacts.
3. **Replay-as-a-Feature** – Causal graph UI, side-effect stubs, replay-driven fixes.
4. **Developer Experience** – Emulator/hot-reload, typed codegen, persisted queries, cookbook.
5. **Marketplace Quality** – Conformance + latency/sandbox/auth badges, remote health/quota introspection.
6. **Economics & Guardrails** – Tenant dashboards, budget-aware autoscale, transparent pricing.

## 30 / 60 / 90 Execution
- **0–30d**: Alpha mock lane green, conformance v0.9, replay signing, public preview dashboard.
- **31–60d**: Snapshot dedupe + forecast, causal replay UI, OPA CI sim, SDK Go/Py, Shootout v1.
- **61–90d**: Multi-region, self-service marketplace, SOC2-ready pack, Shootout v2 (live top ranks).

## Acceptance Gates
- CI (mock & live) green; conformance 100% pass; SBOM + cosign; policies enforced; evidence pack published with each release tag.

## Evidence Pack
- `benchmarks/shootout/results.json` (signed)
- `sbom.spdx.json` + cosign attestations
- `docs/evidence/provenance-ledger.md`
- OTEL trace exports & replay recording IDs
- Marketplace badge manifests
