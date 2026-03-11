# Summit SLOs and Error Budgets

This directory contains the Service Level Objectives (SLOs) definitions for the Summit project, including error budget tracking and Prometheus alerting rules based on burn rate methodology.

## SLO Definitions

Summit's core SLOs are defined in `SLO_DEFINITIONS.yaml`:

1.  **API Availability (99.9%)**: The Summit API must be available to process requests. Error budget is 43.2 minutes of downtime or 0.1% of requests per 30-day window.
2.  **Evidence Pipeline Success Rate (99.5%)**: Evidence artifacts generated must be valid and successfully processed. Error budget is 0.5% of total generated evidence artifacts.
3.  **CI Gate Pass Rate (98.0%)**: Pull requests should pass all CI gates without requiring manual override. Error budget is 2.0% of total CI pipeline runs.
4.  **Deploy Success Rate (99.0%)**: Deployments should succeed without requiring a rollback. Error budget is 1.0% of deployments.

## Error Budgets and Burn Rates

Error budgets represent the acceptable level of unreliability over a given time window (typically 30 days). The burn rate is how fast the error budget is being consumed relative to the time window. A burn rate of 1 means the error budget will be exactly exhausted at the end of the 30-day window.

To provide actionable alerts that trigger before the budget is exhausted while avoiding alert fatigue, we use a Multi-Window, Multi-Burn-Rate alerting strategy.

### Alerting Strategy

Alerts are defined in `../prometheus/slo-rules/burn-rate-alerts.yaml` and rely on pre-computed SLIs defined in `../prometheus/slo-rules/recording-rules.yaml`.

We implement three types of alerts:

*   **Fast Burn (Critical)**: Triggers when the burn rate is extremely high, consuming a significant portion of the error budget in a short time.
    *   Condition: Burn rate is > 36x, consuming 5% of the 30-day budget in 1 hour.
    *   Action: Requires immediate attention and page to on-call engineer.
*   **Slow Burn (Warning)**: Triggers when the burn rate is elevated, but not critical, consuming the budget steadily.
    *   Condition: Burn rate is > 12x, consuming 10% of the 30-day budget in 6 hours.
    *   Action: Creates a ticket for investigation during business hours.
*   **Critical Exhaustion**: Triggers when the error budget for the 30-day window is fully exhausted.

For detailed response procedures, refer to the runbooks linked in the alert annotations (e.g., `https://github.com/Summit/docs/runbooks/slo-alerts.md`).
