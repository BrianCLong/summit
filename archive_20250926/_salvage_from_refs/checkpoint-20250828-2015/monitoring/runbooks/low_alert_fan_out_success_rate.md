# Runbook: Low Alert Fan-Out Success Rate

**Alert:** `LowAlertFanOutSuccessRate`

**Severity:** Warning

**SLO:** Alert fan-out success rate ≥ 99%

---

### Summary

This alert fires when the success rate of sending alerts to downstream systems (e.g., webhooks, email, etc.) drops below 99%.

### 1. Initial Triage

1.  **Acknowledge the alert.**
2.  **Check the `IntelGraph / GA SLOs` Grafana dashboard.** Look at the "Alert Fan-Out Success Rate" panel to see the current success rate.
3.  **Check the logs for the `reliability-service` or the primary alerting component.** Look for errors related to sending alerts.

### 2. Diagnostics

*   **Identify the failing endpoint:** The logs should indicate which downstream endpoint is failing (e.g., a specific webhook URL, SMTP server).
*   **Check network connectivity:** Is there a network issue preventing the alerting service from reaching the endpoint?
*   **Check endpoint status:** Is the downstream service (e.g., Slack, PagerDuty, custom webhook receiver) operational?
*   **Check for malformed alerts:** Is there a specific type of alert that is failing to send? There may be a malformed payload.

### 3. Remediation

*   **Retry failed alerts:** If the issue was transient, the system may automatically retry. If not, a manual retry may be necessary.
*   **Disable the failing endpoint:** If a specific endpoint is down and causing the issue, temporarily disable it in the alerting configuration to allow other alerts to be sent.
*   **Correct the alert payload:** If alerts are malformed, a code change may be required. Escalate to the development team.
*   **Escalate:** If the downstream system is managed by another team, escalate to them.
