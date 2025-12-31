# Summit GA Canary Strategy

> **Version**: 2.0
> **Last Updated**: 2026-01-15
> **Status**: GA-Ready
> **Audience**: Release Engineers, SRE, DevOps, On-Call

---

## 1. Executive Summary

This document defines the official **canary release strategy** for Summit at General Availability (GA). The strategy ensures that every GA release can be safely rolled out, monitored, and deterministically rolled back, making GA operationally survivable.

**Core Principle**: "No release is so important that it cannot be done safely."

---

## 2. Canary Release Contract

This contract explicitly defines the terms and enforcement mechanisms for a Summit canary release.

### 2.1 Canary Scope

**Canary deployments apply to the following core services:**

*   **`gateway-service`**: The primary API gateway.
*   **`server`**: The core application backend.
*   **`prov-ledger`**: The provenance and audit trail service.
*   **`search`**: The search and indexing service.

Other services (e.g., batch processing, analytics) are not part of the canary process and follow a standard blue-green deployment.

### 2.2 Traffic Split Semantics

Traffic is split at the ingress layer (Istio) using a **percentage-based** approach. During a canary, traffic is progressively shifted from the stable version to the canary version.

**Default Progression:**

| Stage           | Traffic % | Duration |
| --------------- | --------- | -------- |
| **Internal**    | 100% (Internal Users)   | 15 mins  |
| **Canary 5%**   | 5%        | 30 mins  |
| **Canary 25%**  | 25%       | 30 mins  |
| **Canary 50%**  | 50%       | 30 mins  |
| **Full Rollout**| 100%      | N/A      |


### 2.3 Canary Duration and Promotion Criteria

*   **Total Canary Duration**: Approximately **1 hour, 45 minutes**.
*   **Promotion**: Promotion to the next stage is **automatic** if all success criteria are met.
*   **Success Criteria**:
    *   **Health Checks**: All canary pods are healthy and passing liveness/readiness probes.
    *   **Error Rates**: Canary error rate is less than **0.1%** and not more than 20% higher than the stable version's error rate.
    *   **Latency**: Canary P95 latency is within **10%** of the stable version's baseline.
    *   **Policy Violations**: No critical policy violations detected (e.g., authz failures, data access violations).

### 2.4 Automatic Abort Conditions

The canary release is **automatically aborted and rolled back** if any of the following conditions are met:

*   **Critical Error Rate**: Canary error rate exceeds **1%** for more than 2 minutes.
*   **Latency SLO Breach**: Canary P95 latency exceeds the SLO (e.g., >500ms) for more than 5 minutes.
*   **Health Check Failures**: More than **10%** of canary pods are unhealthy.
*   **Policy Violation Spike**: A significant spike in OPA policy evaluation errors or denials.
*   **Manual Abort**: An on-call engineer manually triggers a rollback via the `rollback-release.sh` script.

### 2.5 Required Observability Signals

The following signals are **required** for a canary to proceed:

*   **Metrics**: Prometheus metrics for error rates, latency, and saturation for both stable and canary versions.
*   **Logs**: Centralized logging (e.g., Loki, Splunk) for canary pods, with error logs readily available.
*   **Traces**: Distributed tracing (e.g., Jaeger, OpenTelemetry) to debug issues across services.
*   **Dashboards**: A dedicated Grafana dashboard for canary monitoring, comparing stable vs. canary performance in real-time.

---

## 3. Enforcement and Automation

The canary contract is enforced through a combination of CI/CD workflows, monitoring tools, and automation scripts.

### 3.1 CI/CD Integration

*   The `ga-release.yml` workflow orchestrates the canary process.
*   The workflow calls the `deploy-canary.sh` script to manage the progressive rollout.
*   Each stage of the canary is a separate job in the workflow, with a manual approval step before full promotion.

### 3.2 Monitoring and Alerting

*   Prometheus alerts are configured to fire if the automatic abort conditions are met.
*   These alerts trigger a webhook that initiates the `rollback-release.sh` script.
*   The on-call engineer is immediately notified via PagerDuty and Slack.

### 3.3 Code and Configuration Hooks

*   **Helm Charts**: The application's Helm charts are parameterized to support canary deployments (e.g., `canary.enabled`, `canary.weight`).
*   **Istio**: Istio `VirtualService` and `DestinationRule` resources manage the traffic splitting.
*   **Scripts**: The `deploy-canary.sh` and `rollback-release.sh` scripts provide the automation layer.

---

This document serves as the single source of truth for the Summit GA canary strategy. Any changes to this strategy must be approved by the Release Engineering and SRE teams.
