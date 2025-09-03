# Maestro Conductor Deployment Guide

This document provides a high-level overview and quick reference for deploying the Maestro Conductor service to a Kubernetes environment. It is intended for DevOps engineers and SREs.

## 1. Overview

Maestro Conductor is the orchestration engine for IntelGraph, managing build, test, and deployment workflows. This guide focuses on its deployment to `dev/build` environments.

## 2. Prerequisites

- Kubernetes cluster (e.g., GKE, EKS, AKS, or local minikube/kind)
- `kubectl` configured to access your cluster
- `helm` (Helm 3+) installed
- Docker and access to a container registry (e.g., GHCR)
- GitHub Actions configured for CI/CD (secrets, environments)
- Prometheus and Grafana installed in your cluster for observability
- OpenTelemetry Collector deployed for tracing
- Sealed Secrets (or similar secret management solution) for secure secret injection

## 3. Deployment Steps (High-Level)

The deployment process is primarily automated via GitHub Actions, but requires initial manual setup and secret management.

### 3.1. Prepare Configuration & Secrets

1.  **Environment Schema**: Review `config/env.schema.yaml` to understand required environment variables and their types.
2.  **Secrets**: Populate `k8s/maestro-production-secrets.yaml` with your actual sensitive values (database URLs, API keys, OIDC credentials, etc.).
    - **Important**: Do NOT commit raw secrets to Git. Use Sealed Secrets or External Secrets Operator to manage these securely.
3.  **ConfigMaps**: Review `k8s/maestro-production-configmap.yaml` for non-sensitive runtime configurations.
4.  **Helm Values**: Customize `charts/maestro/values.yaml` and `charts/maestro/values.dev.yaml` for your specific environment needs (e.g., image repository, replica counts, resource limits).

### 3.2. Apply Base Kubernetes Resources

Ensure your target namespace exists and apply any foundational resources not managed by Helm.

```bash
# Example: Create namespace if it doesn't exist
kubectl get ns intelgraph-dev >/dev/null 2>&1 || kubectl create ns intelgraph-dev

# Apply ConfigMaps and Sealed Secrets (if using)
kubectl -n intelgraph-dev apply -f k8s/maestro-production-configmap.yaml
# If using Sealed Secrets, apply your sealed secret manifest here
# kubectl -n intelgraph-dev apply -f k8s/maestro-production-sealed-secrets.yaml
```

### 3.3. CI/CD Trigger

The primary deployment mechanism is through GitHub Actions.

1.  **Push to `main` branch**: A push to `main` will trigger the `maestro-ci` workflow (`.github/workflows/ci.yaml`).
2.  **Build, Scan, Sign, Push**: This workflow will build the Docker image, run vulnerability scans (Trivy), generate SBOM (Syft), sign the image (Cosign), and push it to your configured container registry.
3.  **Deploy to Dev**: If the `test_build_scan` job succeeds, the `deploy_dev` job will automatically trigger, performing a `helm upgrade --install` to the `intelgraph-dev` namespace.

### 3.4. Manual Deployment (for troubleshooting or specific scenarios)

You can manually trigger a Helm deployment if needed:

```bash
helm upgrade --install maestro charts/maestro \
  --namespace intelgraph-dev \
  --create-namespace \
  --values charts/maestro/values.dev.yaml \
  --set image.repository=ghcr.io/yourorg/maestro-conductor \
  --set image.tag=$(git rev-parse --short HEAD) \
  --wait --timeout 5m
```

## 4. Post-Deployment Verification

After deployment, verify the health and functionality of Maestro.

- **Check Pod Status**: `kubectl get pods -n intelgraph-dev -l app.kubernetes.io/name=maestro`
- **Check Rollout Status**: `kubectl argo rollouts -n intelgraph-dev get rollout maestro-server-rollout`
- **Health Endpoints**:
  ```bash
  # Port-forward to access locally
  kubectl -n intelgraph-dev port-forward deploy/maestro 8080:8080 &
  curl -sf localhost:8080/healthz && echo "healthy"
  curl -sf localhost:8080/readyz && echo "ready"
  ```
- **Metrics**: Access Prometheus and Grafana dashboards to verify metrics are flowing.
- **Smoke Tests**: Run the k6 smoke tests against the deployed environment.

## 5. Rollback

In case of issues, you can rollback to a previous Helm revision:

```bash
helm rollback maestro -n intelgraph-dev <REVISION_NUMBER>
```

---

**For detailed operational runbooks and troubleshooting, refer to `RUNBOOK.md`.**
