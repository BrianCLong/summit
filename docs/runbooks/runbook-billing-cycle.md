
## Billing Cycle Runbook

1.  **Trigger**: 1st of every month.
2.  **Action**: Run `BillingEngine.generateInvoice` for all tenants.
3.  **Validation**: Check for negative totals or usage spikes (>50% MoM).
4.  **Issue**: Commit invoices to DB and email summary.
