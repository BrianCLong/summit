# Performance Benchmarks

The pilot ships with a deterministic benchmark script (`scripts/benchmark.mjs`) to validate throughput on edge hardware.

## Benchmark Scenario

1. Launch the runtime with telemetry disabled for minimal overhead.
2. Emit 10,000 synthetic sensor events with randomized payload sizes.
3. Measure p50/p95 plugin execution duration and event throughput.

## Running the Benchmark

```bash
node scripts/benchmark.mjs --events 10000 --concurrency 4
```

Sample output:

```
Events processed: 10000
Throughput: 2,500 events/sec
Plugin duration p95: 6.5ms
```

## Optimization Tips

- Increase `performance.maxConcurrency` gradually and observe throughput improvements.
- Enable adaptive throttling (`performance.adaptiveThrottling=true`) to smooth bursty workloads.
- Deploy multiple replicas with the provided HPA manifest to scale horizontally.
- Profile plugin logic using the Node.js profiler (`node --prof`) when CPU-bound.

Document benchmark results after each firmware or plugin revision to establish regressions early.
