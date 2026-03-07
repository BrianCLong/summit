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

# AI Production Guide

This playbook covers model serving, versioning, GPU scheduling, and monitoring patterns to keep Summit's AI features production-ready.

## Model Serving Strategy

- **FastAPI inference gateway**: Wrap fine-tuned models behind FastAPI with pydantic validation and `/health` probes matching `make smoke` expectations.
- **Deployment target**: Containerize with `Dockerfile.ai` using `uvicorn --workers 4 --proxy-headers`. Publish to GHCR and deploy via Helm alongside the core API.
- **Batch vs. realtime**: Use RabbitMQ/Redis queues for batch extraction jobs; route realtime GraphQL requests to the FastAPI gateway via gRPC or HTTP/2.
- **Schema contracts**: Define request/response contracts in `schema/ai/*.json` and generate clients with `openapi-generator`.

### Sample FastAPI server

```python
from fastapi import FastAPI
from pydantic import BaseModel
import time

app = FastAPI()

class ExtractionRequest(BaseModel):
  text: str

class ExtractionResponse(BaseModel):
  entities: list[str]
  latency_ms: int

@app.post("/extract", response_model=ExtractionResponse)
async def extract(req: ExtractionRequest):
  start = time.perf_counter()
  entities = [token for token in req.text.split() if token.istitle()]
  return ExtractionResponse(entities=entities, latency_ms=int((time.perf_counter() - start) * 1000))
```

Expose Prometheus metrics using `prometheus_fastapi_instrumentator` and secure with API keys from `AI_GATEWAY_TOKEN`.

## Versioning with MLflow

- Track experiments with `mlflow server --backend-store-uri postgresql://... --default-artifact-root s3://mlflow-artifacts`.
- Log model metrics (precision/recall, latency) per dataset slice and promote artifacts to the `Production` stage.
- Store the MLflow run ID in GraphQL metadata so investigations reference the model that produced insights.

## GPU Orchestration

- Build GPU images with `Dockerfile.ai` and `--gpus all` using NVIDIA Container Toolkit.
- Define `runtimeClassName: nvidia` in K8s deployments and request GPU resources:

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

    memory: 8Gi

requests:
cpu: 2000m
memory: 6Gi

```

- Node pools: separate GPU node groups (taints `accelerator=gpu:NoSchedule`) with tolerations on AI workloads.

## Monitoring & Alerting

- **Metrics**: Export inference latency histograms, queue depth, and GPU utilization via DCGM Exporter. Scrape with Prometheus and alert when p95 latency > 400ms for 5 minutes.
- **Tracing**: Propagate `traceparent` from GraphQL resolvers into FastAPI to visualize end-to-end spans in Jaeger/Tempo.
- **Logging**: Use structured JSON with request IDs and model version tags; ship to Loki/ELK.

## Production Deploy Checklist

1. `make up-full` passes locally with AI services enabled.
2. FastAPI health probes green: `/health`, `/metrics`, `/ready`.
3. MLflow artifacts promoted to `Production` and referenced in `config/ai/models.yaml`.
4. GPU nodes sized and autoscaler buffer capacity ≥ 1 spare GPU.
5. Synthetic tests hitting `/extract` run via `scripts/smoke-test.js --ai`.
6. Dashboards updated: Prometheus alerts, Grafana panels for p50/p95 latency and GPU utilization.

## Incident Response

- Throttle GraphQL AI entrypoints using feature flags stored in Redis.
- Drain GPU nodes with `kubectl cordon` and `kubectl drain --ignore-daemonsets` before driver upgrades.
- Keep a fallback rules-based extractor deployed alongside ML models for graceful degradation.
```
