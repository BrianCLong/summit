# Kubernetes Resource Optimization Guide

This guide describes how to apply the new resource envelopes for the IntelGraph API (Node.js), worker-python service, and Postgres database using the updated Helm charts and Vertical Pod Autoscalers.

## Prerequisites

1. VPA components (`vertical-pod-autoscaler` chart or manifests) installed in the cluster.
2. Access to the `intelgraph` Helm charts repo with the latest `values.yaml` changes for each service.
3. Chaos Mesh controller installed for validation experiments.

## Update Helm values

1. **Server (Node.js API)**
   - Requests: `cpu: 400m`, `memory: 512Mi`
   - Limits: `cpu: 900m`, `memory: 1Gi`
   - VPA guardrails: min `250m/384Mi`, max `1500m/2Gi` with `updatePolicy: Auto`.
   - File reference: `helm/server/values.yaml`.【F:helm/server/values.yaml†L42-L68】

2. **Worker Python**
   - Requests: `cpu: 200m`, `memory: 384Mi`
   - Limits: `cpu: 600m`, `memory: 768Mi`
   - VPA guardrails: min `150m/256Mi`, max `1000m/1.5Gi`.
   - File references: `helm/worker-python/values.yaml` and the deployment template that now renders the configurable resources.【F:helm/worker-python/values.yaml†L5-L48】【F:helm/worker-python/templates/deployment.yaml†L18-L23】

3. **Postgres**
   - Requests: `cpu: 250m`, `memory: 2Gi`
   - Limits: `cpu: 600m`, `memory: 3Gi`
   - VPA guardrails: min `200m/1.5Gi`, max `2/6Gi`.
   - File reference: `helm/postgres/values.yaml`.【F:helm/postgres/values.yaml†L11-L46】

Use `helm upgrade --install` for each component after merging the new values:

```bash
helm upgrade --install intelgraph-server helm/server -f env/overrides/server.yaml
helm upgrade --install worker-python helm/worker-python -f env/overrides/worker-python.yaml
helm upgrade --install intelgraph-postgres helm/postgres -f env/overrides/postgres.yaml
```

## Deploy Vertical Pod Autoscalers

The charts now render VPA resources automatically when `vpa.enabled: true` (enabled by default):

```bash
kubectl get vpa -n intelgraph-prod
```

You should see entries for the server deployment, worker deployment, and postgres statefulset that match the Helm release names.【F:helm/server/templates/vpa.yaml†L1-L25】【F:helm/worker-python/templates/vpa.yaml†L1-L25】【F:helm/postgres/templates/vpa.yaml†L1-L25】 If you need to pause adjustments, set `vpa.updatePolicy` to `Off` in the relevant `values.yaml` and re-run `helm upgrade`.

## Verify with Prometheus

After rollout, confirm utilisation stays below 80% for CPU and memory using the saved queries:

```bash
# CPU utilisation as a percentage of the new limits
kubectl port-forward svc/prometheus-k8s -n monitoring 9090:9090 &
curl -s "http://localhost:9090/api/v1/query?query=sum(rate(container_cpu_usage_seconds_total{pod=~\"(server|worker-python|postgres).*\"}[5m])) by (pod) * 1000" | jq
```

Compare the live numbers with the baseline snapshot in `monitoring/reports/prometheus-resource-usage-2025-09-23.json` to ensure the buffers remain healthy.【F:monitoring/reports/prometheus-resource-usage-2025-09-23.json†L1-L44】

## Chaos Mesh validation

Run the targeted stress scenario to confirm pods remain stable with the tighter limits:

```bash
kubectl apply -f k8s/chaos/api-resource-stress.yaml
watch -n 30 'kubectl get pods -n intelgraph-prod'
```

During and after the 10 minute run, verify there are no restarts and latency stays below the recorded 215 ms p95 from the baseline run.【F:k8s/chaos/api-resource-stress.yaml†L1-L18】【F:monitoring/reports/prometheus-resource-usage-2025-09-23.json†L45-L61】 Clean up with `kubectl delete -f k8s/chaos/api-resource-stress.yaml` once metrics stabilise.
