# Deployment Guide

This guide documents how to package, ship, and operate the Liquid Nano pilot using Docker Compose and Kubernetes.

## Prerequisites

- Node.js 18.18+
- Docker 24+
- kubectl + Helm (for Kubernetes deployment)
- Access to a container registry (e.g., GHCR or ECR)

## Build and Package

```bash
npm install
npm run --workspace @summit/liquid-nano build
```

## Docker Image

1. Build the container image:
   ```bash
   docker build -t ghcr.io/example/liquid-nano:pilot -f deploy/Dockerfile .
   ```
2. Push the image to your registry:
   ```bash
   docker push ghcr.io/example/liquid-nano:pilot
   ```

## Docker Compose Pilot

A Compose stack is provided for local or single-node pilots:

```bash
cd packages/liquid-nano/deploy
docker compose up
```

Services provisioned:

- `runtime`: Liquid Nano HTTP bridge (port 8080)
- `otel`: OpenTelemetry Collector forwarding traces/metrics
- `grafana`: Dashboard UI preconfigured with pilot panels

## Kubernetes Deployment

1. Update `deploy/kubernetes/values.yaml` with registry coordinates and secrets.
2. Apply ConfigMap & secrets:
   ```bash
   kubectl apply -f deploy/kubernetes/configmap.yaml
   kubectl apply -f deploy/kubernetes/secret-example.yaml
   ```
3. Deploy the runtime workload:
   ```bash
   kubectl apply -f deploy/kubernetes/deployment.yaml
   kubectl apply -f deploy/kubernetes/service.yaml
   kubectl apply -f deploy/kubernetes/hpa.yaml
   ```
4. Verify health:
   ```bash
   kubectl get pods -l app=liquid-nano
   kubectl logs deployment/liquid-nano
   ```

## CI/CD Integration

- The package runs `npm run build`, `npm run lint`, and `npm run test:coverage` inside CI.
- Coverage thresholds are enforced at 80%+ and fail the pipeline on regression.
- `deploy/scripts/publish.sh` demonstrates a GitHub Actions step for building and pushing the container.

## Rollback Strategy

- Maintain at least two deployment revisions via `kubectl rollout history deployment/liquid-nano`.
- Use `deploy/scripts/rollback.sh` to automate rollback to a known-good image.
- For Compose pilots, downgrade with `docker compose up runtime=<previous_tag>`.

The deployment assets are optimized for rapid pilot delivery while leaving room for production hardening (service mesh, TLS termination, or GitOps-driven updates).
