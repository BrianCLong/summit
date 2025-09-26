# IntelGraph ML Engine – GPU Deployment Guide

This guide describes how to enable GPU acceleration for the `ml-engine` service when deploying IntelGraph on Kubernetes. It covers cluster prerequisites, Helm chart configuration, performance benchmarking, and ongoing monitoring of GPU utilisation.

## 1. Prerequisites

Before enabling GPU workloads ensure the following are in place:

- **GPU-enabled worker nodes.** Nodes must expose NVIDIA GPUs supported by the NVIDIA Kubernetes device plugin.
- **NVIDIA drivers.** Install the appropriate host drivers that match the CUDA runtime required by your TensorFlow/PyTorch stack.
- **Container runtime configuration.** Confirm the runtime (Docker or containerd) is configured to expose NVIDIA GPUs (e.g., via `nvidia-container-toolkit`).
- **Namespace access.** You must have permission to install cluster-scoped resources such as `DaemonSet` objects.

## 2. Enable the NVIDIA device plugin

The Helm chart ships with an optional DaemonSet for NVIDIA’s device plugin. Enable it and configure any scheduling constraints by creating a GPU-specific `values` file (or reuse the provided [`deploy/helm/intelgraph/values-gpu.yaml`](../../deploy/helm/intelgraph/values-gpu.yaml)).

```yaml
# gpu-values.yaml
services:
  mlEngine:
    nodeSelector:
      nvidia.com/gpu.present: "true"
    tolerations:
      - key: nvidia.com/gpu
        operator: Exists
        effect: NoSchedule
    resources:
      requests:
        cpu: "1"
        memory: "4Gi"
        nvidia.com/gpu: 1
      limits:
        cpu: "4"
        memory: "12Gi"
        nvidia.com/gpu: 1
    env:
      # override defaults where required
      - name: GPU_ENABLED
        value: "true"
      - name: GPU_DEVICE_ORDINAL
        value: "0"
      - name: GPU_POLL_INTERVAL_MS
        value: "10000"
      - name: GPU_HALF_PRECISION
        value: "true"

gpuDevicePlugin:
  enabled: true
  nodeSelector:
    nvidia.com/gpu.present: "true"
  tolerations:
    - key: nvidia.com/gpu
      operator: Exists
      effect: NoSchedule
```

Deploy the changes:

```bash
helm upgrade --install intelgraph deploy/helm/intelgraph \
  --namespace intelgraph \
  --create-namespace \
  -f deploy/helm/intelgraph/values.yaml \
  -f gpu-values.yaml
```

Verify the DaemonSet is running on GPU nodes:

```bash
kubectl -n intelgraph get daemonset -l app.kubernetes.io/component=gpu-device-plugin
kubectl -n intelgraph describe ds intelgraph-nvidia-device-plugin
```

## 3. Runtime configuration and metrics

The chart now injects GPU-related environment variables into the `ml-engine` deployment:

- `GPU_ENABLED` controls whether the Python runtime attempts to allocate CUDA devices (`auto` by default).
- `GPU_DEVICE_ORDINAL` selects a specific GPU when multiple devices are present.
- `GPU_POLL_INTERVAL_MS` controls how frequently the service samples GPU telemetry for Prometheus export.
- `GPU_HALF_PRECISION` toggles FP16 inference when running on CUDA.

The Node.js service exposes Prometheus metrics on the standard metrics port. GPU gauges include:

- `ml_engine_gpu_utilisation_percent`
- `ml_engine_gpu_memory_utilisation_percent`
- `ml_engine_gpu_temperature_celsius`
- `ml_engine_gpu_telemetry_available`

Example PromQL snippets:

```promql
max_over_time(ml_engine_gpu_utilisation_percent[5m])
max_over_time(ml_engine_gpu_memory_utilisation_percent[5m])
```

Alerts for missing telemetry, high utilisation, and memory pressure are automatically generated via the bundled `PrometheusRule` resources.

## 4. Benchmarking GPU inference

A lightweight benchmarking harness is provided at [`apps/ml-engine/src/python/benchmarks/gpu_benchmark.py`](../../apps/ml-engine/src/python/benchmarks/gpu_benchmark.py). It compares CPU and GPU inference performance using the updated `SentenceEncoder`.

1. Install Python requirements (`npm run setup-python` from the `apps/ml-engine` directory).
2. Prepare or reuse the sample corpus at [`apps/ml-engine/src/python/benchmarks/sample_corpus.txt`](../../apps/ml-engine/src/python/benchmarks/sample_corpus.txt).
3. Run the benchmark on a GPU-enabled pod:

```bash
python3 apps/ml-engine/src/python/benchmarks/gpu_benchmark.py \
  --corpus apps/ml-engine/src/python/benchmarks/sample_corpus.txt \
  --devices cpu cuda \
  --batch-size 64 \
  --runs 5 \
  --output /tmp/gpu-benchmark.json
```

Sample results (see [`latest_gpu_results.json`](../../apps/ml-engine/src/python/benchmarks/latest_gpu_results.json)) show a ~6× latency reduction when moving from CPU (≈415 ms) to GPU (≈69 ms) for batch inference workloads.

## 5. Operational tips

- **Cache warmup:** the Python runtime automatically performs a warmup encode pass to avoid counting lazy initialisation in benchmarks.
- **Half precision:** FP16 can be disabled via `GPU_HALF_PRECISION=false` if models require full precision.
- **Telemetry gaps:** the metrics exporter logs warnings when `nvidia-smi` is unavailable and sets `ml_engine_gpu_telemetry_available` to `0`, triggering the bundled alert.
- **Scaling:** adjust `services.mlEngine.replicaCount` alongside GPU resource requests to control parallelism.

By following this guide the `ml-engine` service will take advantage of GPU acceleration, expose detailed utilisation metrics, and provide reproducible benchmarks to validate performance gains.
