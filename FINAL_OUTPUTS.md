# Final Outputs

This document contains the final outputs requested in the prompt.

## Health Model Factor Table

| Factor | Weight | Thresholds |
|---|---|---|
| Adoption | 0.3 | Green: >= 0.8, Yellow: >= 0.5, Red: < 0.5 |
| SLO Compliance | 0.3 | Green: >= 0.99, Yellow: >= 0.95, Red: < 0.95 |
| Incident Frequency | 0.2 | Green: <= 1, Yellow: <= 5, Red: > 5 |
| Version Drift | 0.1 | Green: <= 1, Yellow: <= 3, Red: > 3 |
| Security Exceptions | 0.1 | Green: <= 0, Yellow: <= 2, Red: > 2 |

## Sample Trust Dashboard

# Customer Trust Dashboard for ACME Corporation

**Tenant ID:** acme-corp
**Generated At:** <GENERATED_AT>

## Health Score: 90

| Factor | Score | Value |
|---|---|---|
| adoption | 100 | 0.85 |
| slo_compliance | 100 | 0.995 |
| incident_frequency | 100 | 1 |
| version_drift | 50 | 2 |
| security_exceptions | 50 | 1 |

## Renewal Risk: green

**Drivers:**
- None

**Mitigations:**
- None

## Admin Actions

### Scheduled Workflows
It is recommended to set up a nightly scheduled workflow (e.g., a GitHub Action) to perform the following tasks for all tenants:
- Compute health scores.
- Generate trust dashboards.
- Emit drift/risk signals.

### Artifact Retention
A retention policy should be established for the artifacts generated under `artifacts/cs/` and `artifacts/cs-bundles/`. A 90-day retention period is recommended for daily snapshots, with quarterly snapshots being retained for at least two years.

### Tenant Registry
A central tenant registry should be created and maintained to serve as the single source of truth for all customer tenants. This registry will be used by the automation scripts to iterate through all active tenants. The location of this registry should be `config/cs/tenant-registry.json`.
