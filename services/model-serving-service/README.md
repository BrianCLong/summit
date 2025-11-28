# Model Serving Service

Production-grade inference service with TensorFlow Serving/ONNX runtime routing, model versioning, A/B testing, batching, monitoring, and drift detection.

## Features

- **Runtime routing:** Pluggable runtimes for TensorFlow Serving, ONNX Runtime Server, or mock inference with configurable timeouts and signatures.
- **Model versioning:** Deploy multiple versions per model, promote active versions, and keep shadow deployments for validation.
- **A/B testing:** Weighted traffic splits across versions with variant registration per model.
- **Batch prediction API:** Dynamic batching with latency-aware flush thresholds to maximize throughput.
- **Inference optimization:** Per-deployment optimization profiles (target latency, batching preference, quantization hints, hardware profile).
- **Monitoring:** Rolling latency percentiles, throughput, and error rates per version exposed via HTTP.
- **Drift detection:** Lightweight population stability checks on numeric features with status summaries per version.

## Key Endpoints

- `POST /api/v1/models/deploy` — Deploy a model version with runtime + optimization config.
- `POST /api/v1/models/:modelId/promote` — Promote a version to active.
- `GET /api/v1/models/:modelId/versions` — List versions and metadata.
- `POST /api/v1/models/:modelId/ab-tests` — Register an A/B test variants array.
- `POST /api/v1/predict` — Single inference with optional A/B test participation.
- `POST /api/v1/predict/batch` — Batch inference payload.
- `GET /api/v1/models/:modelId/monitoring` — Metrics snapshot per version.
- `GET /api/v1/models/:modelId/drift` — Drift signal summaries per version.

## Configuration

- `MODEL_SERVING_PORT` — HTTP port (defaults to `3002`).
- Runtime config requires `type` (`tensorflow`, `onnx`, or `mock`) and optional `endpoint`, `modelSignature`, and `timeoutMs`.
- Optimization config allows `targetLatencyMs`, `preferBatching`, `quantization`, `cacheTtlSeconds`, `warmTargets`, `hardwareProfile`.

## Development

Install dependencies from the repository root using the standard workspace workflow. Start the service in watch mode:

```bash
npm run dev --workspace services/model-serving-service
```

Build for production:

```bash
npm run build --workspace services/model-serving-service
```

## Observability & Safety

- Metrics and drift are stored in-memory for the active process; persist externally for multi-replica deployments.
- Runtime calls use request timeouts and fall back to mock predictions when upstream serving endpoints are unreachable, ensuring the API remains responsive during incidents.
- All schema validation uses `zod` to guard inputs at the edge.
