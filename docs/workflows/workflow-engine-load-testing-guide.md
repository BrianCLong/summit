# Workflow Engine Load Testing Guide

This guide describes how to run automated load tests against the workflow-engine using [k6](https://k6.io), capture metrics in Prometheus, and visualize live results in Grafana.

## Overview

The workflow-engine drives Summit's orchestration by dispatching Argo Workflows. The provided automation simulates concurrent workflow submissions, records system behavior, and highlights bottlenecks. The toolkit includes:

- [`k6-argo-workflow-load-test.js`](./k6-argo-workflow-load-test.js): parameterized k6 script that submits and monitors workflows via the Argo Workflows API.
- [`prometheus-workflow-load-test.yml`](./prometheus-workflow-load-test.yml): scrape configuration for k6, the Argo controller, and the workflow-engine.
- [`grafana-workflow-load-test.json`](./grafana-workflow-load-test.json): Grafana dashboard focused on load, latency, and reliability metrics.

## Prerequisites

1. **Argo Workflows access**
   - API endpoint reachable from the k6 runner (default `http://localhost:2746`).
   - Service account token with permission to submit workflows (set `ARGO_TOKEN`).
   - Target namespace (default `argo`) and workflow template name to submit (`WORKFLOW_TEMPLATE`).
2. **k6 >= 0.46** with the [Prometheus remote write output](https://grafana.com/docs/k6/latest/results-output/prometheus-remote-write/).
3. **Prometheus** with write permissions to a storage backend or remote write endpoint.
4. **Grafana** with access to the Prometheus data source.
5. Optional: Kubernetes cluster context if deploying the helper components via manifests/Helm.

## Architecture

```text
┌────────┐       submit       ┌────────────────┐       metrics        ┌────────────┐
│  k6    │ ───────────────▶  │ Argo API/WS    │ ───────────────────▶ │ Prometheus │
│ script │ ◀──── status ───── │ workflow-engine│                      │  (remote)  │
└────────┘                    └────────────────┘                      └─────┬──────┘
        │                                                               │
        └────────── Grafana dashboard (PromQL queries) ◀─────────────────┘
```

## k6 Execution

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `ARGO_BASE_URL` | Base URL of the Argo Workflows API server. | `http://localhost:2746` |
| `ARGO_NAMESPACE` | Namespace for workflow submissions. | `argo` |
| `ARGO_TOKEN` | Bearer token used for API authentication. | _empty_ |
| `WORKFLOW_TEMPLATE` | Template name to submit. | `stress-test-dag` |
| `START_RATE` | Initial workflow submissions per second. | `5` |
| `STAGES` | JSON array describing the ramping arrival rate stages. | `[{"target":20,"duration":"2m"},{"target":60,"duration":"5m"},{"target":0,"duration":"1m"}]` |
| `PREALLOCATED_VUS` | Preallocated virtual users. | `100` |
| `MAX_VUS` | Maximum virtual users allowed during the test. | `500` |
| `MAX_STATUS_POLLS` | Maximum polls for workflow completion. | `120` |
| `STATUS_POLL_INTERVAL` | Seconds between status checks. | `5` |
| `MAX_RETRIES` | Submission retries before flagging an error. | `3` |
| `PAUSE_BETWEEN_WORKFLOWS` | Delay between iterations. | `1` |

### Run locally with Prometheus remote write

```bash
k6 run \
  --out prometheus-remote-write=${PROM_REMOTE_WRITE_URL:-http://localhost:9090/api/v1/write} \
  docs/workflows/k6-argo-workflow-load-test.js
```

If Prometheus requires authentication, export `PROM_REMOTE_WRITE_USERNAME` and `PROM_REMOTE_WRITE_PASSWORD` before running.

### Running inside Kubernetes

1. Package the script into a ConfigMap:
   ```bash
   kubectl create configmap k6-argo-script \
     --from-file=docs/workflows/k6-argo-workflow-load-test.js \
     --dry-run=client -o yaml | kubectl apply -f -
   ```
2. Deploy a k6 job (example snippet):
   ```yaml
   apiVersion: batch/v1
   kind: Job
   metadata:
     name: k6-argo-load-test
   spec:
     template:
       spec:
         serviceAccountName: argo-workflow-tester
         restartPolicy: Never
         containers:
           - name: k6
             image: grafana/k6:0.49.0
             args:
               - run
               - --out
               - prometheus-remote-write=$(PROM_REMOTE_WRITE_URL)
               - /scripts/k6-argo-workflow-load-test.js
             envFrom:
               - secretRef:
                   name: argo-api-credentials
             env:
               - name: PROM_REMOTE_WRITE_URL
                 value: http://prometheus.monitoring:9090/api/v1/write
             volumeMounts:
               - name: k6-script
                 mountPath: /scripts
         volumes:
           - name: k6-script
             configMap:
               name: k6-argo-script
   ```
3. Monitor the job logs for threshold violations.

## Prometheus Setup

Merge [`prometheus-workflow-load-test.yml`](./prometheus-workflow-load-test.yml) with your existing Prometheus configuration. For a standalone instance:

```bash
cat docs/workflows/prometheus-workflow-load-test.yml >> /etc/prometheus/prometheus.yml
systemctl restart prometheus
```

Ensure DNS or hostnames resolve to the k6 runner, Argo controller (`argo-workflows-controller:9090`), and workflow-engine service (`workflow-engine:8080`). Adjust scrape intervals and authentication to match production settings.

## Grafana Dashboard Import

1. Open Grafana → **Dashboards** → **Import**.
2. Upload [`grafana-workflow-load-test.json`](./grafana-workflow-load-test.json) or paste the JSON definition.
3. Choose the Prometheus data source that receives the k6 metrics.
4. Save the dashboard into a folder such as `Load Tests`.

Key visualizations include:

- Virtual users vs. request rate to verify target load.
- Workflow submission and completion latency (p95).
- Error rate and completion distribution to spot failures.
- Workflow engine resource consumption (CPU/memory).

## Test Lifecycle

1. **Plan**: Align load stages with anticipated peak throughput and define success thresholds beyond the defaults.
2. **Dry Run**: Execute a short (5–10 min) test to validate connectivity and dashboards.
3. **Soak Test**: Increase stage durations to observe resource saturation and memory growth.
4. **Analyze**: Use Prometheus queries and Grafana annotations to correlate errors with system events.
5. **Iterate**: Tune the workflow-engine concurrency, queue depth, and Argo controller settings based on findings.

## Troubleshooting

| Symptom | Possible Cause | Resolution |
| --- | --- | --- |
| `401 Unauthorized` on submit | Missing or incorrect `ARGO_TOKEN`. | Refresh the service account token, verify API server audience. |
| Workflows stuck in `Pending` | Insufficient workflow-engine capacity or Kubernetes quota. | Scale the workflow-engine deployment and review pod quotas. |
| Prometheus missing k6 metrics | Incorrect `--out` URL or network policy blocking port 6565. | Validate the remote write endpoint and network connectivity. |
| Grafana panels show `No data` | Dashboard PromQL queries don't match metric labels. | Confirm scrape config labels (`service="k6-load-test"`) and namespace filter. |

## Next Steps

- Integrate k6 execution into CI by running staged loads nightly and alerting on threshold breaches.
- Expand the script with additional checks (e.g., verifying workflow outputs or artifacts).
- Store historical runs in a time-series database (Prometheus + Thanos) to track performance trends over time.

