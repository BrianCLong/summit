# GA Failure Modes & Recovery Procedures

**Version:** 1.0.0
**Last Updated:** 2026-01-26
**Status:** PROVISIONAL

This document defines the top known failure modes for Summit in the cloud, their detection signals, ownership, and rollback actions. It is a critical artifact for GA operational readiness.

| ID | Failure Mode | Detection Signal | Owner | Mitigation / Rollback |
|----|--------------|------------------|-------|-----------------------|
| **FM-01** | **Region Outage** | AWS Health Dashboard / Synthetic Probes failing | SRE | Failover to DR region (RTO < 4h). If active-active, route traffic away from impacted region. |
| **FM-02** | **DB Connection Saturation** | `pg_stat_activity` > 90% / High Latency / Connection Refused | Backend Infra | Scale Read Replicas (if read heavy). Kill idle connections. Reboot writer (last resort). Rollback recent code deploying bad queries. |
| **FM-03** | **Bad Deployment (CrashLoop)** | K8s Pod Restarts > 5 / Health Checks Failing | Release Captain | **Automated Rollback** via ArgoCD to previous stable revision. Disable feature flags if applicable. |
| **FM-04** | **Secret Rotation Failure** | `Authentication Failed` / 401 Errors / Vault Access Denied | SecOps | Revert to previous secret version in Vault. Rotate manually if automated rotation failed mid-way. |
| **FM-05** | **Dependency Supply Chain Attack** | Falco Runtime Alert / Unexpected Outbound Traffic | Security | **ISOLATE** affected pods (NetworkPolicy). Revoke all active tokens. Trigger Incident Response. Rollback to last known clean image (signed). |

## Operational SLOs

*   **Availability:** 99.9% (Monthly)
*   **API Latency (p95):** < 500ms
*   **RPO (Data Loss):** < 15 minutes
*   **RTO (Recovery Time):** < 4 hours

## Paging Policy

*   **Critical (P0):** Immediate Page (24/7). Customer facing outage or data loss.
*   **High (P1):** Page during business hours. Degraded performance or non-critical feature broken.
*   **Medium (P2):** Ticket (Next Business Day). Minor bug or internal tool issue.
