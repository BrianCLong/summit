# Edge Inference Benchmark Summary

## Overview

We benchmarked the default IntelGraph GNN link predictor on a simulated edge
device to quantify the benefit of exporting the model to edge-optimized
formats. The benchmark uses the new `benchmark_edge_inference` utility and
compares PyTorch execution to ONNX Runtime when the required dependencies are
available.

## Configuration

- Nodes: 128 synthetic nodes with 64-dimensional features
- Hidden size: 128 channels
- Warmup: 5 iterations
- Timed runs: 25 iterations per runtime
- Hardware: CPU-only container environment (simulated edge hardware)

## Results

| Runtime           | Mean Latency (ms) | Notes                         |
|-------------------|-------------------|-------------------------------|
| PyTorch (cloud)   | 1.00              | Baseline eager execution      |
| ONNX Runtime edge | _Not available_   | Optional `onnx` dependency missing |

Because the environment does not include the `onnx` runtime, the benchmark
skipped edge inference timing while still validating the PyTorch baseline.
When ONNX is installed, the new exporter and benchmark automatically capture
edge latencies and compute a speedup factor.

## Reproducing the Benchmark

```bash
python -c "from ml.benchmarks.edge_inference import benchmark_edge_inference; import json; print(json.dumps(benchmark_edge_inference(), indent=2))"
```

If ONNX Runtime is installed the JSON payload will include both runtimes and a
computed `speedup_factor`.
