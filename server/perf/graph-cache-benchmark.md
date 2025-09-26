# Graph Cache Benchmark Summary

## Scenario
- Simulated three sequential requests against the `tenantCoherence` resolver using the Apollo metrics plugin instrumentation.
- Two results were served from Redis/memory cache, one required a fresh fetch, mimicking a warm cache under mixed load.
- Metrics were collected via the new `apollo_cache_events_total` counter and `apollo_cache_hit_ratio` gauge emitted by the Prometheus plugin.

## Results
| Metric | Value | Notes |
| --- | --- | --- |
| `apollo_cache_events_total{operation="tenantCoherence",status="hit",store="redis",tenant="tenantA"}` | 1 | Redis hit captured after warm cache.
| `apollo_cache_events_total{operation="tenantCoherence",status="hit",store="memory",tenant="tenantA"}` | 1 | Memory hit recorded from local fallback layer.
| `apollo_cache_events_total{operation="tenantCoherence",status="miss",store="redis",tenant="tenantA"}` | 1 | Redis miss before cache warm.
| `apollo_cache_hit_ratio{operation="tenantCoherence",tenant="tenantA"}` | 0.666 | Reflects 2/3 hits across the simulated sequence.

## Reproduction Steps
1. Run the targeted Jest test to replay the scenario: `cd server && npm test -- apolloPromPlugin`
2. The test asserts the Prometheus registry snapshot via `registry.getSingleMetricAsString`, so a passing run confirms the hit/miss counters and hit-ratio gauge values above. For manual inspection, add `console.log(await registry.metrics())` inside the test to review the raw exposition format.

These measurements confirm the new cache instrumentation is wired through the Apollo request lifecycle and exposes hit-rate telemetry suitable for Prometheus dashboards.
