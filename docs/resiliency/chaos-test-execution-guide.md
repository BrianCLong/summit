# Chaos Test Execution Guide

This guide describes how to run Chaos Mesh experiments against the Summit production-like Kubernetes environment to validate resiliency of the Node.js backend, Python analytics API, and PostgreSQL database tiers.

## 1. Prerequisites

- Access to the `intelgraph-production` Kubernetes cluster with permissions to create custom resources in the `chaos-testing` namespace.
- [`kubectl`](https://kubernetes.io/docs/tasks/tools/) configured against the target cluster.
- [`helm`](https://helm.sh/docs/intro/install/) 3.8+.
- Chaos Mesh CLI tooling (installed by the Helm chart).
- Dashboards: Grafana (SLO view), Prometheus, and application APM traces.

## 2. Install Chaos Mesh

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
kubectl create namespace chaos-testing || true
helm upgrade --install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace chaos-testing \
  --set dashboard.create=true \
  --set controllerManager.replicaCount=2 \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

Wait for all pods in `chaos-testing` to reach `Running`. Verify CRDs:

```bash
kubectl get crds | grep chaos-mesh
```

## 3. Map Services to Chaos Experiments

| Service | Chaos Object | Purpose |
| --- | --- | --- |
| Node.js backend (`app=intelgraph, component=backend`) | `nodejs-backend-pod-chaos.yaml` | Validate pod auto-recovery and load balancer health.
| Python analytics API (`app.kubernetes.io/name=analytics-api`) | `python-api-network-latency.yaml` | Validate graceful degradation and retry logic under latency.
| PostgreSQL primary (`app.kubernetes.io/name=intelgraph-postgres, role=primary`) | `postgres-primary-failure.yaml` | Validate failover and connection pooling behavior.

Update the label selectors if your deployment uses different labels or namespaces.

## 4. Load Prerequisite Dashboards

Before running experiments, open the following dashboards to capture baselines:

- **SLO Overview** – watch `chaos_recovery_time_*` and `chaos_error_rate_*` indicators.
- **Application Health** – p95 latency, 5xx rate, worker throughput.
- **Database Health** – replication lag, failover status, checkpoint age.

Capture screenshots or export snapshots for runbook evidence.

## 5. Execute Experiments

Apply one experiment at a time, letting the system fully recover before the next injection.

```bash
kubectl apply -f ops/chaos/nodejs-backend-pod-chaos.yaml
kubectl apply -f ops/chaos/python-api-network-latency.yaml
kubectl apply -f ops/chaos/postgres-primary-failure.yaml
```

Use `kubectl describe` to confirm the experiment started and monitor status via the Chaos Mesh dashboard.

### 5.1 Node.js Pod Kill

1. Ensure at least two backend pods are healthy.
2. Apply the manifest and observe the terminated pod.
3. Verify the Horizontal Pod Autoscaler or rollout controller reschedules a replacement within 60 seconds.
4. Confirm HTTP 5xx rate stays below 0.5% during the disruption window.

### 5.2 Python API Latency

1. Ensure synthetic traffic is running (k6 scenario `chaos-latency.json`).
2. Apply the manifest and monitor p95 latency for the analytics API.
3. Validate retries, circuit breakers, and user-facing SLAs remain inside the defined objectives.

### 5.3 PostgreSQL Primary Failure

1. Ensure streaming replicas are healthy and failover automation is armed.
2. Apply the manifest; Chaos Mesh will mark one primary pod as failed for 15 minutes.
3. Observe failover controller promotion and application reconnection.
4. Verify read/write traffic resumes within 120 seconds and that the error budget consumption alert stays below warning.

## 6. Rollback and Cleanup

After validating recovery, delete the experiments to prevent cron schedules from re-triggering in production.

```bash
kubectl delete -f ops/chaos/nodejs-backend-pod-chaos.yaml
kubectl delete -f ops/chaos/python-api-network-latency.yaml
kubectl delete -f ops/chaos/postgres-primary-failure.yaml
helm uninstall chaos-mesh -n chaos-testing  # optional when finished
```

## 7. Evidence Collection

- Export Prometheus metrics for `chaos_experiment_recovery_seconds_*` and `http_requests_total` covering the chaos window.
- Capture Grafana dashboard snapshots for SLO compliance.
- Record incident timeline (start, detection, mitigation, recovery) and on-call actions.
- File findings in `docs/resiliency/resiliency-report.md`.

## 8. Safety Checklist

- ✅ Change approval obtained from SRE manager.
- ✅ Blast radius capped (single namespace, single service).
- ✅ PagerDuty overrides on-call during experiment.
- ✅ Rollback procedure rehearsed.

Adhering to this runbook ensures chaos experiments deliver actionable insights while staying within error budget constraints.
