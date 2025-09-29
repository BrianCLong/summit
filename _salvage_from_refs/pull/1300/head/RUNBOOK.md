# Maestro Conductor Operational Runbook

This document serves as a detailed operational runbook for the Maestro Conductor service, providing guidance on common tasks, troubleshooting, and incident response for SREs and operations teams.

## 1. Overview

Maestro Conductor is the central orchestration engine. This runbook covers its day-to-day operations, monitoring, and incident management.

## 2. Monitoring & Alerting Cribsheet

Maestro exposes Prometheus metrics and OpenTelemetry traces.

### 2.1. Key Metrics & Queries

| Metric Name                              | Description                                    | Prometheus Query Example                                                                |
| :--------------------------------------- | :--------------------------------------------- | :-------------------------------------------------------------------------------------- |
| `maestro_jobs_started_total`             | Counter for initiated orchestration jobs       | `sum(rate(maestro_jobs_started_total[5m]))`                                             |
| `maestro_jobs_succeeded_total`           | Counter for successfully completed jobs        | `sum(rate(maestro_jobs_succeeded_total[5m]))`                                           |
| `maestro_jobs_failed_total`              | Counter for failed jobs                        | `sum(rate(maestro_jobs_failed_total[5m])) by (workflow)`                                |
| `maestro_job_latency_seconds`            | Histogram for job execution latency            | `histogram_quantile(0.95, sum(rate(maestro_job_latency_seconds_bucket[5m])) by (le))`   |
| `maestro_runs_active`                    | Gauge for currently active runs                | `maestro_runs_active`                                                                   |
| `maestro_tasks_inflight`                 | Gauge for tasks currently being processed      | `maestro_tasks_inflight`                                                                |
| `maestro_lease_renew_failures_total`     | Counter for lease renewal failures             | `sum(rate(maestro_lease_renew_failures_total[5m]))`                                     |
| `maestro_orphaned_tasks_reclaimed_total` | Counter for tasks reclaimed due to lost leases | `sum(rate(maestro_orphaned_tasks_reclaimed_total[5m]))`                                 |
| `maestro_queue_depth`                    | Gauge for internal queue depth                 | `maestro_queue_depth`                                                                   |
| `maestro_schedule_latency_ms`            | Gauge for task scheduling latency              | `maestro_schedule_latency_ms`                                                           |
| `http_requests_total`                    | API request rate                               | `sum(rate(http_requests_total{job="maestro"}[5m]))`                                     |
| `http_request_duration_seconds`          | API request latency                            | `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))` |
| `process_cpu_seconds_total`              | Process CPU usage                              | `sum(rate(process_cpu_seconds_total{job="maestro"}[5m]))`                               |
| `process_memory_bytes`                   | Process memory usage                           | `process_memory_bytes{job="maestro"}`                                                   |

### 2.2. Grafana Dashboards

- **IntelGraph Maestro - Full Production Overview**: Provides a comprehensive view of Maestro's health, performance, and activity.
  - **Location**: Imported via `charts/maestro/grafana-dashboard-full.json`.
  - **Key Panels**: Job Success/Failure, Latency, Queue Depth, API Performance, Resource Saturation, Orchestrator Health & Activity.

### 2.3. Alerts & On-Call Rotation

Alerts are configured in Prometheus and routed via Alertmanager to Slack/Teams and PagerDuty.

- **Common Alerts**: High error rates, high latency, pod restarts, queue backlogs, lease failures.
- **On-Call**: Follow standard IntelGraph on-call rotation and incident response procedures.

## 3. Troubleshooting Guide

### 3.1. Pod CrashLoopBackOff

**Symptoms**: Maestro pods repeatedly crash and restart.

**Possible Causes**:

- Missing environment variables or incorrect configuration.
- Application startup failure (e.g., unable to connect to DB/Redis/Kafka).
- Resource limits too low.
- Application bug.

**Steps**:

1.  **Check Pod Logs**:
    ```bash
    kubectl logs -n intelgraph-dev <pod-name> --tail=100 -f
    ```
2.  **Check Pod Events**:
    ```bash
    kubectl describe pod <pod-name> -n intelgraph-dev
    ```
3.  **Verify ConfigMap/Secrets**: Ensure all required `env` variables are correctly mounted and values are valid.
    ```bash
    kubectl -n intelgraph-dev get secret maestro-production-secrets -o yaml
    kubectl -n intelgraph-dev get configmap maestro-production-config -o yaml
    ```
4.  **Test External Dependencies**:
    - **Postgres**: `kubectl exec -it <maestro-pod> -- psql -h <db-host> -U <db-user>`
    - **Redis**: `kubectl exec -it <maestro-pod> -- redis-cli -h <redis-host>`
    - **Kafka**: `kubectl exec -it <maestro-pod> -- kafka-console-consumer --bootstrap-server <kafka-brokers> --topic <some-topic> --from-beginning`
5.  **Check Resource Limits**: Compare `requests`/`limits` in `deployment.yaml` with actual pod usage.

### 3.2. High Latency / Low Throughput

**Symptoms**: Orchestration jobs are slow, API responses are delayed, or queue depth is increasing.

**Possible Causes**:

- Under-provisioned resources (CPU/Memory).
- Database/Redis/Kafka bottlenecks.
- Inefficient application logic.
- External service dependencies (e.g., LLMs, S3).

**Steps**:

1.  **Check Grafana Dashboard**: Look at "API Performance", "Job Latency", "Queue Depth", and "Resource Saturation" panels.
2.  **Scale Up**: Increase `replicaCount` in `charts/maestro/values.yaml` or adjust HPA targets.
3.  **Check Dependent Services**: Monitor performance of Postgres, Redis, Kafka, and external APIs.
4.  **Analyze Logs**: Look for slow queries, external API timeouts, or repeated errors.

### 3.3. Lease Renewal Failures / Orphaned Tasks

**Symptoms**: `maestro_lease_renew_failures_total` is increasing, or tasks are getting stuck/reclaimed.

**Possible Causes**:

- Network issues between Conductor and Workers.
- Worker crashes/unresponsiveness.
- Clock skew between Conductor and Workers.

**Steps**:

1.  **Check Worker Pods**: Ensure worker pods are healthy and not restarting.
2.  **Check NetworkPolicy**: Verify egress rules allow communication to Conductor.
3.  **Review Conductor Logs**: Look for messages related to lease expiration or worker disconnections.
4.  **Verify Clock Sync**: Ensure NTP is configured on all nodes.

## 4. Deployment & Rollback

- **Deployment**: Follow the steps in `README-DEPLOY.md`.
- **Rollback**: Use `helm rollback maestro -n intelgraph-dev <REVISION_NUMBER>`.
  - **Verification**: After rollback, re-run post-deployment verification steps.

## 5. Log & Metric Cribsheet

### 5.1. Accessing Logs

- **Kubernetes Pod Logs**:
  ```bash
  kubectl logs -n intelgraph-dev -l app.kubernetes.io/name=maestro -f
  ```
- **Centralized Logging**: Access logs via your centralized logging solution (e.g., Grafana Loki, ELK Stack, Splunk). Search by `runId`, `taskId`, `tenantId`.

### 5.2. Accessing Metrics

- **Prometheus**: Access Prometheus UI at `http://<prometheus-url>/graph`.
- **Grafana**: Access Grafana UI at `http://<grafana-url>/d/intelgraph-maestro-full-prod`.

## 6. PII Redaction & Security Checks

- **PII Redaction**: Verify logs do not contain sensitive PII.
  - **Test**: Send test data with PII through a workflow and inspect logs.
- **Cosign Verification**: Ensure all deployed images are signed and verified.
  ```bash
  cosign verify --key <public-key-or-keyless-identity> ghcr.io/yourorg/maestro-conductor:<image-tag>
  ```

---

**For high-level deployment instructions, refer to `README-DEPLOY.md`.**
