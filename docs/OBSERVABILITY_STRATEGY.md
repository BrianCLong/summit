# Observability Strategy

## Core Principles

1.  **Correlation IDs**: Every request must have an `X-Request-ID` propagated across all services and logs.
2.  **Structured Logs**: All logs must be JSON with standard fields (`level`, `service`, `tenantId`, `traceId`).
3.  **Red Metrics**: Rate, Errors, Duration for every API endpoint.

## Tier-0 Observability

For Tier-0 journeys, we mandate:

- **SLO Dashboard**: Real-time view of availability and latency.
- **Alerts**: PagerDuty alerts for SLO breaches.
- **Business Metrics**: e.g., "Signups per hour", "Reports exported".

## Supportability

- **Diagnostics Panel**: Admin UI to view system health and tenant status.
- **Runbooks**: Every alert must link to a runbook in `docs/runbooks/`.
- **Safe Actions**: Admin tools to retry jobs, clear cache, etc., with audit logging.

## Ticket Context

Support tickets must automatically capture:

- User ID / Tenant ID
- Recent Error IDs
- Browser/OS info
- Last active page
