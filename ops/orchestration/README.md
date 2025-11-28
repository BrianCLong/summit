# Summit Orchestration Toolkit

This package standardizes local and production deployments for the core Summit stack using Docker Compose for development, Kubernetes manifests for production, and Helm charts for repeatable releases. It layers in autoscaling, health checks, Istio service mesh policies, rolling updates, and resource protections.

## Components
- **API**: Node/Express service from `server/` on port 4000.
- **Worker**: Background conductor worker from `server/` on port 4100.
- **Web**: React/Vite client from `client/` on port 4173 (fronted by the mesh).
- **Data/infra**: Postgres, Redis, OpenTelemetry collector, and Jaeger for tracing.

## Development (Docker Compose)
- File: [`docker-compose.dev.yml`](./docker-compose.dev.yml)
- Start the stack:
  ```bash
  docker compose -f ops/orchestration/docker-compose.dev.yml up --build
  ```
- Included features:
  - Live-reload for API, worker, and web services via bind mounts.
  - Health checks on API (`/healthz`), Redis/ Postgres, and worker TCP port.
  - Tracing/export via the OpenTelemetry collector to Jaeger.
- Stop and remove resources when finished:
  ```bash
  docker compose -f ops/orchestration/docker-compose.dev.yml down -v
  ```

## Production (Kubernetes)
Manifests live in [`k8s/`](./k8s) and are designed for the `summit-platform` namespace.

Apply in order (after creating the `summit-gateway-tls` secret and the `summit-app-secrets` secret with `database-url` and `redis-url` keys):
```bash
kubectl apply -f ops/orchestration/k8s/namespace.yaml
kubectl apply -f ops/orchestration/k8s/api.yaml
kubectl apply -f ops/orchestration/k8s/worker.yaml
kubectl apply -f ops/orchestration/k8s/web.yaml
kubectl apply -f ops/orchestration/k8s/istio-gateway.yaml
```

Key behaviors:
- **Rolling updates** with max 1 unavailable and 1 surge for all Deployments.
- **Health checks**: API probes `/readyz` and `/healthz`; worker uses TCP socket; web probes `/`.
- **Autoscaling**: HPAs scale API (3–10 replicas), worker (2–8), and web (2–6) on CPU/memory.
- **Service mesh**: Istio sidecar injection enabled, mesh mTLS enforced via DestinationRules, and VirtualServices fronted by the `summit-gateway`.
- **Resilience**: PodDisruptionBudgets protect capacity; topology spread/anti-affinity keep replicas on separate nodes.
- **Resource controls**: Namespace-level `ResourceQuota` and `LimitRange` enforce sane defaults.

## Helm chart
The [`helm/summit-platform`](./helm/summit-platform) chart bundles the Kubernetes objects so environments can be parameterized.

Quickstart:
```bash
helm upgrade --install summit-platform ops/orchestration/helm/summit-platform \
  --namespace summit-platform --create-namespace \
  --set api.image.repository=ghcr.io/summit-platform/api \
  --set api.image.tag=latest \
  --set web.image.repository=ghcr.io/summit-platform/web \
  --set web.image.tag=latest \
  --set worker.image.repository=ghcr.io/summit-platform/worker \
  --set worker.image.tag=latest \
  --set istio.hosts.api=api.summit.example.com \
  --set istio.hosts.web=summit.example.com
```

Notable settings in [`values.yaml`](./helm/summit-platform/values.yaml):
- `autoscaling.*` for target utilization and min/max replica counts.
- `resources.*` for CPU/memory requests and limits per component.
- `serviceMesh.enabled` to toggle Istio resources.
- `ingress.tls.credentialName` for the Gateway TLS secret reference.

## Observability and runtime checks
- The mesh-enforced mTLS plus HTTP/TCP probes provide early failure detection.
- The OpenTelemetry collector exports traces for API/worker; configure `OTEL_EXPORTER_OTLP_ENDPOINT` as needed.
- Jaeger UI is exposed on `localhost:16686` in Docker Compose.

## Operational tips
- Keep `summit-gateway-tls` rotated regularly and align DNS to `api.summit.example.com` and `summit.example.com`.
- Resource quotas are intentionally conservative—update `namespace.yaml` when moving to larger clusters.
- Rolling updates pair with HPAs; adjust `maxUnavailable` if your workloads require stricter SLOs.
