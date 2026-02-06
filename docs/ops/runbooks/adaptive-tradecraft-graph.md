# Runbook: Adaptive Tradecraft Graph (ATG)

## Schedules

- **Nightly:** equilibrium run (configurable)
- **Hourly:** ESG delta apply (configurable)

## Alerts

- Equilibrium run failures
- Convergence anomalies
- Evidence integrity failures
- ERI spikes or drift rebound

## Break-Glass Controls

- Disable module per tenant
- Disable narratives
- Keep read-only access to historical equilibrium states

## Evidence & Audit

- Evidence bundles emitted prior to narratives.
- All outputs must be evidence-bound and tenant-scoped.

