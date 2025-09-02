# Billing, Budgets, and Quotas in Maestro

This document outlines Maestro's capabilities for managing and enforcing billing, budgets, and quotas for various workloads and resources. It covers policy enforcement, usage exports, and alert mechanisms.

## Budget Enforcement

Maestro implements a `BudgetGuard` middleware that enforces per-tenant budget policies. This guard is invoked for every orchestrated action that incurs cost, such as running pipelines or executing individual steps.

### Policy Types

Budget policies can be configured as either `hard-cap` or `soft-cap`:

- **Hard-Cap:** When a hard-cap budget is reached or projected to be exceeded, the workload is immediately halted. This prevents any further cost accrual beyond the defined limit.
- **Soft-Cap:** A soft-cap budget allows workloads to continue even if the limit is exceeded, but it triggers warnings and alerts. A grace percentage can be configured, allowing the workload to continue within a certain buffer beyond the soft limit before more severe actions (like alerts) are taken.

### Enforcement Points

Budget enforcement is plumbed into critical points in the Maestro workflow:

- **Run Creation (`POST /runs`):** A pre-check is performed when a new run is initiated. If the estimated cost of the run, combined with the current month's spend, would breach a hard-cap budget, the run creation is denied.
- **Step Execution Dispatch:** Before dispatching individual steps within a pipeline, a pre-step check is performed. This check considers the estimated cost of the step (e.g., based on estimated tokens for LLM calls, or model rates) against the remaining budget.

### Alerting

When a budget cap is hit (especially a hard-cap), an `AlertCenter` event with the type `BUDGET_HARD_CAP_HIT` is emitted. This event includes details such as the tenant, the pipeline, and the last step that attempted to execute.

## Quotas

In addition to overall budgets, Maestro allows defining per-tenant quotas for resource consumption. These quotas can include:

- **Requests per minute (RPM):** Limits the rate of API calls or specific operations.
- **Tokens per day:** Caps the total number of LLM tokens consumed within a 24-hour period.
- **Allowed Models:** Restricts which models a tenant can use.

Quotas are enforced at the routing and execution layers. Violations surface as user-friendly errors in the UI and trigger `AlertCenter` events.

## Usage Exports

Maestro provides functionality to export monthly usage data for billing and auditing purposes. These exports can be generated in CSV or JSON format.

### Export Endpoint

Usage exports are generated via the following endpoint:

`POST /api/maestro/v1/billing/export?tenant=<id>&month=YYYY-MM`

- **`tenant`**: The ID of the tenant for which to generate the export.
- **`month`**: The month for which to generate the export, in `YYYY-MM` format (e.g., `2025-08`).

### Export Format

Both CSV and JSON exports include the following fields:

- `date`: The date of the usage record.
- `pipeline`: The ID of the pipeline that incurred the cost.
- `runId`: The ID of the specific run.
- `model/provider`: The model used and its provider (e.g., `gpt-4o-mini/openai`).
- `tokens`: The number of tokens consumed (if applicable).
- `costUSD`: The cost incurred in USD.
- `tags`: Any relevant tags associated with the usage (e.g., environment, project).

### Immutability and Storage

Generated usage exports are stored into an S3 WORM (Write Once, Read Many) bucket. This ensures data immutability and compliance with auditing requirements. Objects are stored with object-lock headers, denying overwrite or deletion while retention is active. Each evidence object is tagged with `tenant`, `pipeline`, and `runId` for easy retrieval and categorization.

## Override Process and Runbooks

In scenarios where a budget cap is hit and a workload needs to proceed, an override process is available. This typically involves:

1.  **Alert Notification:** A `BUDGET_HARD_CAP_HIT` alert is triggered.
2.  **Runbook Consultation:** The alert links to a runbook section (e.g., `/docs/maestro/runbooks/budget-override`) that describes:
    - The process for requesting a one-time exception.
    - How to temporarily increase the budget limit.
    - The approval workflow for such overrides.

This ensures that critical workloads can be unblocked while maintaining financial controls and audit trails.
