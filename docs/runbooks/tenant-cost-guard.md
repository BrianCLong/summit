# Runbook: Tenant Cost Guard

**Alert Name:** `TenantCostGuardBreaching80Percent`, `TenantCostGuardBreaching90Percent`, `TenantCostGuardBreaching100Percent`

**Summary:** These alerts indicate that a tenant's monthly cost is approaching or has exceeded its defined budget limit. This is a critical financial control and may lead to workload throttling or halting.

**Severity:**

- `TenantCostGuardBreaching80Percent`: Warning
- `TenantCostGuardBreaching90Percent`: Critical
- `TenantCostGuardBreaching100Percent`: Critical

**Impact:** Uncontrolled cost accrual, potential service disruption for the affected tenant, and financial implications.

## Troubleshooting Steps

1.  **Verify Alert:**
    - Confirm the alert is active in Alertmanager.
    - Identify the affected tenant (`{{ $labels.tenant }}`) from the alert details.
    - Check the Grafana dashboard (`grafana_dashboard_url`) and Maestro UI Tenant Costs page (`maestro_link`) linked in the alert annotations for a detailed view of the tenant's spend.

2.  **Analyze Cost Drivers:**
    - In the Maestro UI Tenant Costs page, review the breakdown of costs by pipeline, model/provider, and recent runs.
    - Identify which pipelines or services are contributing most to the cost increase.

3.  **Review Recent Activity:**
    - Check recent activity for the tenant, including new pipeline runs, increased usage of expensive models, or changes in workload patterns.

4.  **Budget Policy:**
    - Confirm the configured budget policy (hard-cap vs. soft-cap) and its limit for the affected tenant.
    - Understand if the current breach is a warning (soft-cap) or an enforcement action (hard-cap).

## Resolution

### For Soft-Cap Breaches (Warning/Approaching Limit)

- **Notify Tenant:** Inform the tenant about their approaching budget limit and suggest reviewing their usage.
- **Optimize Workloads:** Work with the tenant to identify opportunities for cost optimization (e.g., using cheaper models, reducing run frequency, optimizing pipeline steps).
- **Increase Budget (Temporary/Permanent):** If the increased spend is justified, initiate the process to temporarily or permanently increase the tenant's budget. This typically requires approval from finance/management.

### For Hard-Cap Breaches (Limit Exceeded / Workload Halted)

- **Immediate Action:** Understand that workloads for this tenant may already be halted or throttled.
- **Request Exception:** If the workload is critical and must proceed, follow the documented process for requesting a one-time exception to the budget guard. This usually involves a manual override with strict approval.
- **Budget Increase:** Work with the tenant and finance to increase the budget. Once approved, update the budget policy in Maestro.
- **Circuit Breaker Review:** If the budget guard triggered a circuit breaker, ensure the underlying issue is resolved before re-enabling the affected services.

## Override Process

To request a budget override or increase:

1.  **Access Maestro UI:** Navigate to the Tenant Costs page for the affected tenant.
2.  **Initiate Request:** Look for a "Request Budget Exception" or "Increase Budget" button/workflow.
3.  **Provide Justification:** Clearly articulate the reason for the override/increase, including business impact and expected duration.
4.  **Approval Workflow:** The request will go through an approval workflow (e.g., finance, management).
5.  **Policy Update:** Once approved, the budget policy will be updated in Maestro, allowing the workloads to resume.

## Post-Mortem / Follow-up

- Document the incident, its root cause, and the steps taken for resolution.
- Review the effectiveness of the budget policy and adjust thresholds or grace periods if necessary.
- Ensure all stakeholders are aware of the budget status and any changes.
