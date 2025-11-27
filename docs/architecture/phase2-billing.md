
## Phase 2: MaaS Billing

### Model
-   **UsageRecord**: Raw event data (e.g., 1 Task Execution, 500 Tokens).
-   **PricePlan**: distinct rates per category, optional quotas.
-   **Invoice**: Aggregated bill for a period.

### Flow
1.  System components emit events.
2.  `UsageCollector` aggregates into `UsageRecord`s.
3.  `BillingEngine` applies `PricePlan` to generate `Invoice`.
