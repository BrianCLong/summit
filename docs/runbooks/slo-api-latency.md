# Runbook: SLO - API Latency

**Alert Name:** `SLOBurnRateHighFast`, `SLOBurnRateHighSlow`

**Summary:** This alert indicates that the API latency Service Level Objective (SLO) is being breached, meaning a significant portion of API requests are taking longer than the defined threshold (e.g., 200ms for 99.5% objective).

**Severity:**
*   `SLOBurnRateHighFast`: Critical (14x budget burn for fast window)
*   `SLOBurnRateHighSlow`: Warning (6x budget burn for slow window)

**Impact:** Degraded user experience, potential service unavailability, and failure to meet customer expectations.

## Troubleshooting Steps

1.  **Verify Alert:**
    *   Confirm the alert is active in Alertmanager.
    *   Check the Grafana dashboard linked in the alert annotations (`grafana_dashboard_url`) to visualize the API latency and error rates.

2.  **Check API Gateway Health:**
    *   Inspect the Maestro Gateway logs for errors, high latency, or resource saturation.
    *   Check CPU, memory, and network utilization of the gateway instances.

3.  **Review Upstream Services:**
    *   Identify any services that the API Gateway depends on (e.g., authentication service, data stores, external APIs).
    *   Check their health, logs, and performance metrics for anomalies.

4.  **Database Performance:**
    *   If the API relies on a database, check database query performance, connection pool utilization, and resource usage.

5.  **Network Issues:**
    *   Look for any network latency or packet loss between the UI, Gateway, and backend services.

6.  **Recent Deployments/Changes:**
    *   Identify any recent code deployments, configuration changes, or infrastructure updates that might have introduced regressions.

7.  **Load Spikes:**
    *   Check if there's an unusual spike in traffic or request volume that might be overwhelming the API.

## Resolution

*   **Scale Resources:** If resource saturation is identified, consider scaling up API Gateway instances, backend service instances, or database resources.
*   **Optimize Queries/Code:** Identify and optimize inefficient API endpoints, database queries, or application code.
*   **Rollback:** If a recent deployment is suspected, consider rolling back to a previous stable version.
*   **Rate Limiting/Circuit Breaking:** Implement or adjust rate limiting and circuit breaking mechanisms to protect the API from overload.
*   **Notify Stakeholders:** Inform relevant teams (e.g., engineering, product, support) about the ongoing issue and its impact.

## Post-Mortem / Follow-up

*   Document the incident, its root cause, and the steps taken for resolution.
*   Implement preventative measures to avoid recurrence.
*   Review and adjust SLO thresholds or alert configurations if necessary.
