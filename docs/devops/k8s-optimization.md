# Kubernetes Optimization

This guide outlines practices for scaling IntelGraph in production.

## Horizontal Pod Autoscaling
- **Helm**: Enable via `hpa` values. CPU and memory targets scale workloads between 1 and 5 replicas.
- **Manifests**: `deploy/k8s/server.yaml` and `deploy/k8s/ml-gpu.yaml` include `autoscaling/v2` HPAs.

## Service Mesh (Istio)
- Pods annotate `sidecar.istio.io/inject: "true"` for mTLS and traffic control.
- Mesh policies reside under `deploy/k8s/istio/`.

## GPU Node Affinity
- AI services pin to GPU nodes using `nodeAffinity` with label `accelerator=nvidia-tesla-k80` and matching tolerations.
- Example configuration lives in `deploy/k8s/ml-gpu.yaml` and `helm/ai-service/values.yaml`.

## Cost & Performance Dashboards
- Grafana dashboard `monitoring/dashboards/cost-performance.json` tracks CPU, memory, and estimated cloud spend.
- Integrate Prometheus metrics `cloud_cost_hourly` for budget visibility.
