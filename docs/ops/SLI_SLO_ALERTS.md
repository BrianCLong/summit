# Service Level Indicators, Objectives, and Alerting Policy

## Executive Summary
This document defines the operational standards for the Summit platform. It establishes what we measure (SLIs), our targets (SLOs), and when we wake up humans (Alerts). The goal is to ensure high availability and rapid incident response without alerting fatigue.

## 1. Service Level Indicators (SLIs) & Objectives (SLOs)

### 1.1 API Availability & Latency
**Target:** High-throughput public and internal APIs.

| Metric | Definition | SLO (Target) | Window |
| :--- | :--- | :--- | :--- |
| **Availability** | Percentage of non-5xx requests. | 99.9% | 28 days |
| **Latency (P95)** | 95th percentile response time for `GET` requests. | < 500ms | 28 days |
| **Latency (P99)** | 99th percentile response time for `POST/PUT` requests. | < 2000ms | 28 days |

### 1.2 Agent Execution
**Target:** Background job processors and AI agents.

| Metric | Definition | SLO (Target) | Window |
| :--- | :--- | :--- | :--- |
| **Success Rate** | Percentage of jobs completing without error. | 99.5% | 7 days |
| **Freshness** | Time from enqueue to start of processing. | < 60s (P95) | 7 days |

### 1.3 System Health
**Target:** Core infrastructure components.

| Metric | Definition | SLO (Target) | Window |
| :--- | :--- | :--- | :--- |
| **Queue Depth** | Number of pending jobs in Redis/BullMQ. | < 10,000 | N/A |
| **Cost Burn** | Daily spend vs budget. | 100% of budget | Daily |

## 2. Alert Policy

### 2.1 Alert Severity Levels

| Severity | Description | Notification Channel | Response Time |
| :--- | :--- | :--- | :--- |
| **SEV-1 (Critical)** | System unavailable, data loss imminent, or critical security breach. | PagerDuty (Phone + Push) | < 15 mins |
| **SEV-2 (High)** | Major feature broken, performance severely degraded. | PagerDuty (Push), Slack `#incidents` | < 30 mins |
| **SEV-3 (Medium)** | Minor bug, elevated errors but retriable. | Jira Ticket, Slack `#ops-alerts` | < 4 hours |
| **SEV-4 (Low)** | Informational, cosmetic issues, approaching capacity. | Slack `#ops-logs` | Next business day |

### 2.2 Alert Definitions

#### API Alerts
*   **High Error Rate (SEV-1):** > 5% 5xx errors for 5 minutes.
*   **High Latency (SEV-2):** P95 > 1s for 10 minutes.

#### Agent/Worker Alerts
*   **Queue Backlog (SEV-2):** > 5,000 jobs pending for > 15 minutes.
*   **Dead Letter Queue (SEV-3):** > 100 jobs failed permanently in 1 hour.

#### Security Alerts
*   **Massive Auth Failures (SEV-1):** > 100 failed logins per minute from single IP.
*   **Policy Denial Spike (SEV-2):** > 50 OPA denials per minute.

#### Cost & Resource Alerts
*   **Budget Spike (SEV-2):** Projected daily spend > 150% of average.
*   **Disk Space (SEV-2):** < 10% free space on database volume.

## 3. Maintenance

*   **Review Cadence:** Monthly review of alerts during Operational Review meetings.
*   **Silence Policy:** Alerts can be silenced for max 24 hours with a linked Jira ticket explaining the fix plan.
