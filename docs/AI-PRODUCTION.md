# AI in Production

This guide covers strategies for deploying Summit's AI/ML capabilities in a production environment.

## Model Serving

Summit supports multiple strategies for serving AI models:

### 1. Embedded (Default)

Models run directly within the Worker containers. Best for development and low-volume deployments.

- **Pros**: Simple architecture.
- **Cons**: Hard to scale independently, resource contention.

### 2. Dedicated Inference Service (Recommended)

Offload inference to a dedicated service (e.g., FastAPI with TorchServe or Triton).

**Configuration:**
Update `AI_SERVICE_URL` in `.env` to point to your inference service.

```bash
AI_SERVICE_URL=http://summit-inference:8000
```

## GPU Orchestration

For high-throughput, use NVIDIA GPUs with Docker/Kubernetes.

### Docker Compose

Ensure `nvidia-container-toolkit` is installed on the host.

```yaml
# docker-compose.gpu.yml
services:
  ai-worker:
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Kubernetes

Use the NVIDIA Device Plugin for Kubernetes to schedule pods on GPU nodes.

```yaml
resources:
  limits:
    nvidia.com/gpu: 1
```

## Monitoring AI Workloads

### Metrics

We export specific AI metrics via Prometheus:

- `ai_inference_latency_seconds`: Histogram of inference time.
- `ai_jobs_queued`: Gauge of jobs waiting for processing.
- `ai_gpu_utilization`: GPU usage (requires `dcgm-exporter`).

### Alerting

Set up alerts for:
- High Inference Latency (> 2s p95)
- Queue Saturation (> 100 jobs)
- Model Error Rate (> 1%)

## Versioning Models

Use MLflow or DVC to manage model versions.

- Store model artifacts in S3.
- Summit's `ModelRegistry` service can be configured to fetch specific versions at startup.

```bash
MODEL_VERSION=v2.1.0
MODEL_BUCKET=s3://summit-models-prod
```
