# Monitoring Stack Kustomization

This package codifies the Prometheus + Grafana + Jaeger + ELK stack used by IntelGraph.

## Contents

- `kustomization.yaml` – orchestrates configmaps and deployments.
- `monitoring-workloads.yaml` – Kubernetes manifests for Prometheus, Grafana, Alertmanager, Jaeger, Loki, Elasticsearch, Kibana, and Filebeat.
- `alertmanager.yml` – base routing configuration (wired to Slack by default).

## Usage

```bash
kubectl apply -k ops/observability/monitoring-stack
```

Override targets or credentials by editing the config maps or setting environment variables before applying.

The Grafana dashboard provisioning loads `monitoring-platform.json` automatically and relies on the Prometheus rules defined in `ops/prometheus`.
