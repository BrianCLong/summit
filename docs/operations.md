# Maestro Operations Guide

This document provides essential information for Site Reliability Engineers (SREs) and operations teams responsible for maintaining and operating the Maestro Orchestration System.

## 1. Overview

Maestro is a critical component for building, testing, and deploying IntelGraph services. This guide covers its operational aspects, including monitoring, incident response, and common runbooks.

## 2. Monitoring & Alerting

Maestro exposes comprehensive metrics via Prometheus and traces via OpenTelemetry.

- **Metrics Endpoint**: `/metrics` (port 8080)
- **Health Endpoints**: `/healthz` (liveness), `/readyz` (readiness)
- **Key Metrics**:
  - `maestro_jobs_started_total`: Counter for initiated orchestration jobs.
  - `maestro_jobs_succeeded_total`: Counter for successfully completed jobs.
  - `maestro_jobs_failed_total`: Counter for failed jobs.
  - `maestro_job_latency_seconds`: Histogram for job execution latency.
- **Alerting**: Configure alerts based on SLOs (e.g., p95 orchestration latency < 2s, job success ratio > 99%). Refer to Grafana dashboards for visualization.

## 3. Incident Response Runbooks

This section outlines step-by-step procedures for common operational incidents related to Maestro.

### 3.1. Deployment Failure

**Incident**: A new deployment of Maestro fails or rolls back.

**Symptoms**:

- Helm upgrade/install command fails.
- Pods are not coming up (CrashLoopBackOff, ImagePullBackOff).
- Liveness/readiness probes fail.

**Steps**:

1.  **Check Deployment Logs**:
    ```bash
    kubectl logs -n maestro-system -l app.kubernetes.io/name=maestro
    ```
2.  **Check Pod Events**:
    ```bash
    kubectl describe pod <maestro-pod-name> -n maestro-system
    ```
3.  **Verify Configuration**: Ensure `maestro-secrets` and `maestro-config` ConfigMaps/Secrets are correctly applied and populated.
4.  **Rollback**: If necessary, initiate a Helm rollback:
    ```bash
    helm rollback maestro -n maestro-system
    ```
5.  **Analyze**: Investigate root cause (e.g., image issue, misconfiguration, resource limits).

### 3.2. Queue Backlog

**Incident**: The Maestro orchestration queue (Kafka) is experiencing a growing backlog.

**Symptoms**:

- `maestro_queue_depth` metric is increasing.
- Orchestration jobs are taking longer to start.
- `maestro_jobs_started_total` rate is decreasing.

**Steps**:

1.  **Check Kafka Consumer Group Lag**:
    ```bash
    # Use Kafka tools to check consumer group lag for Maestro topics
    ```
2.  **Scale Maestro Workers**: Increase the number of Maestro pods (e.g., by adjusting HPA `minReplicas` or manually scaling the deployment).
3.  **Check Dependent Services**: Ensure Redis and PostgreSQL are healthy and responsive.
4.  **Identify Poison Messages**: Look for recurring errors in Maestro logs that might indicate a poison message blocking processing.

### 3.3. Poison Message Handling

**Incident**: A specific message in the Kafka queue is causing repeated failures and blocking processing.

**Symptoms**:

- Repeated `maestro_jobs_failed_total` for a specific job ID.
- Logs show continuous errors related to a single message.
- Queue backlog is not decreasing despite available workers.

**Steps**:

1.  **Identify Message**: Locate the problematic message ID from logs or monitoring.
2.  **Move to DLQ**: If a Dead-Letter Queue (DLQ) is configured, move the message to the DLQ.
3.  **Analyze & Fix**: Investigate why the message is poisoned (e.g., malformed data, unhandled edge case in code).
4.  **Replay (if fixed)**: If the issue is resolved, replay the message from the DLQ (if applicable) or manually re-trigger the job.

### 3.4. Authentication/Authorization Drift

**Incident**: Maestro is rejecting legitimate requests due to authentication or authorization failures.

**Symptoms**:

- Users report "unauthorized" or "forbidden" errors.
- Logs show JWT validation failures or OPA policy denials.
- `maestro_auth_failures_total` metric is increasing.

**Steps**:

1.  **Check JWT Secret Rotation**: Verify that the JWT secret used by Maestro matches the issuer's secret and has not expired or been rotated incorrectly.
2.  **Review OPA Policies**: Examine the OPA policies applied to Maestro for any recent changes that might be overly restrictive.
3.  **Verify Service Account RBAC**: Ensure the Kubernetes ServiceAccount used by Maestro has the necessary permissions (RoleBindings).
4.  **Check OIDC Provider**: Confirm the OIDC provider (e.g., Okta, Auth0) is operational and accessible.

## 4. Maintenance & Upgrades

- **Rolling Updates**: Maestro deployments are configured for rolling updates, minimizing downtime during upgrades.
- **Database Migrations**: Ensure database migrations are run as part of the deployment process (e.g., via Helm hooks or init containers).
- **Dependency Updates**: Regularly update Node.js, Docker base images, and npm/Helm dependencies to incorporate security patches and performance improvements.

## 5. Troubleshooting

- **Accessing Pod Logs**: `kubectl logs -f <maestro-pod-name> -n maestro-system`
- **Executing Commands in Pod**: `kubectl exec -it <maestro-pod-name> -n maestro-system -- bash`
- **Port Forwarding**: `kubectl port-forward <maestro-pod-name> 8080:8080 -n maestro-system` (for local access to health/metrics)

---

**For more detailed information, refer to the full "Maestro Conductor — Production Readiness & Go-Live Plan (Dev/Build)" document.**
