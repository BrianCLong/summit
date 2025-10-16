# docling-svc

Granite Docling 258M inference microservice that powers build artifact understanding and compliance automation.

## Features

- Streaming-safe `/v1/parse`, `/v1/summarize`, and `/v1/extract` endpoints with idempotent `requestId`
- Purpose/retention and license policy enforcement before any model invocation
- Provenance ledger emission for every request (inputs, outputs, model metadata)
- Prometheus metrics, OTEL spans, and structured logs with aggressive redaction
- In-memory request cache with TTL to guarantee idempotency and lower latency
- Automatic heuristic fallback when the upstream Granite endpoint is unavailable

## Local Development

```bash
cd services/docling-svc
npm install
npm run dev
```

Environment variables are validated via `zod`. Key options:

| Variable                             | Description                             | Default                |
| ------------------------------------ | --------------------------------------- | ---------------------- |
| `PORT`                               | HTTP listen port                        | `7100`                 |
| `GRANITE_DOCLING_ENDPOINT`           | Optional upstream Granite REST endpoint | unset (heuristic mode) |
| `GRANITE_DOCLING_API_KEY`            | Bearer token for upstream calls         | unset                  |
| `GRANITE_DOCLING_PRICE_PER_1K_CHARS` | Cost accounting rate                    | `0.04`                 |
| `MTLS_ENABLED`                       | Require mTLS (requires cert/key paths)  | `false`                |

## Testing

```bash
npm test
```

The Jest suite includes idempotency and fallback regression coverage. Golden fixtures live under `tests/` and can be extended with additional artifact samples.

## Deployment

A Helm chart is provided under `helm/docling-svc`. It provisions:

- Argo Rollout with blue/green strategy and preview service
- Horizontal Pod Autoscaler scoped to CPU and custom QPS metrics
- ServiceMonitor for Prometheus scraping
- ConfigMap-driven policy toggles and Vault secret mounts for API keys

Deploy with:

```bash
helm upgrade --install docling-svc ./helm/docling-svc \
  --namespace platform-ml --create-namespace \
  -f overrides.yaml
```

Use `helm template` to preview and `kubectl argo rollouts get rollout docling-svc` to monitor blue/green transitions.
