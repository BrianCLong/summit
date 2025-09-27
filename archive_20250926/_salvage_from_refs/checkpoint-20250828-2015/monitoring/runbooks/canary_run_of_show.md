# Canary Run-of-Show (RoS) for IntelGraph GA

**Date:** August 28, 2025

**Release Version:** [To be filled: e.g., v1.0.0]

**Deployment Target:** [To be filled: e.g., Production]

---

## 1. Overview

This document outlines the step-by-step procedure and critical guardrails for executing a canary release of the IntelGraph platform. The goal is to safely roll out new features to a small subset of users before a full production deployment, minimizing risk and ensuring stability.

## 2. Pre-Canary Checklist (T-60 minutes)

*   **Freeze Deployments:** No other deployments are allowed to the target environment.
*   **Health Check:** All existing services are healthy and operating within normal parameters.
    *   _Command:_ `make health-check` (or equivalent)
    *   _Evidence:_ [Link to Health Dashboard Snapshot]
*   **Snapshot Dashboards:** Capture baseline metrics and dashboards for comparison.
    *   _Evidence:_ [Link to Grafana Dashboard Snapshots]
*   **Database Backup:** Ensure a recent, validated database backup is available for quick recovery.
    *   _Evidence:_ [Link to Backup Confirmation]
*   **On-Call Handover:** Confirm on-call SREs are aware and ready.

## 3. Canary Execution Timeline

**Time Zone:** America/Denver (adjust as needed)

*   **T-0: Enable Canary at 5% (30 minutes soak)**
    *   _Action:_ Deploy the new release to 5% of production traffic.
    *   _Command:_ `make ga-canary PERCENT=5` (conceptual)
    *   _Monitoring:_ Closely monitor all guardrail metrics for the next 30 minutes.

*   **T+30 minutes: Scale to 25% (30 minutes soak)**
    *   _Action:_ If 5% soak is stable, increase traffic to 25%.
    *   _Command:_ `make ga-canary PERCENT=25` (conceptual)
    *   _Monitoring:_ Continue close monitoring of guardrail metrics.

*   **T+60 minutes: Scale to 100% (Full Launch)**
    *   _Action:_ If 25% soak is stable, route all traffic to the new version.
    *   _Command:_ `make ga-canary PERCENT=100` (conceptual)
    *   _Monitoring:_ Continue monitoring for any regressions.

## 4. Canary Guardrails (Auto-Rollback Triggers)

If any of the following conditions are met for a sustained period (≥10 minutes), an **automatic rollback** will be initiated.

*   **High Graph Latency:** Graph p95 latency > 1.5s
    *   _Prometheus Alert:_ `HighGraphLatency`
*   **High Inference Latency:** Inference p95 latency > 300ms
    *   _Prometheus Alert:_ `HighInferenceLatency`
*   **High Streaming E2E Latency:** Streaming E2E p95 latency > 2.5s
    *   _Prometheus Alert:_ `AlertE2EHigh`
*   **Elevated Error Rate:** Overall error rate > 0.5%
    *   _Prometheus Alert:_ `HighErrorRate`
*   **Low PSI (Performance Score Index):** PSI < 0.25 on any monitored feature
    *   _Prometheus Alert:_ `LowPSIScore` (conceptual)
*   **Sustained Consumer Lag:** Consumer lag > 10k messages (sustained for 10m)
    *   _Prometheus Alert:_ `ConsumerLagHigh`

## 5. Post-Launch Actions (T+Launch)

*   **Capture Evidence Bundle:** Generate a final evidence bundle from the production environment.
    *   _Command:_ `make evidence-bundle ENV=prod`
    *   _Evidence:_ [Link to Production Evidence Bundle]
*   **Status Update:** Communicate launch success to stakeholders.
*   **Post-Mortem (if applicable):** If any incidents occurred during the canary, conduct a post-mortem.

## 6. Commands (Conceptual)

*   `make ga-canary`: Triggers the main GA canary deployment process.
*   `make ml-canary`: Triggers ML-specific canary deployment.
*   `make stream-canary`: Triggers streaming-specific canary deployment.

## 7. Reviewer Sign-off

**SRE Lead:** _________________________ Date: _________

**Release Captain:** _________________________ Date: _________

**Engineering Lead:** _________________________ Date: _________
