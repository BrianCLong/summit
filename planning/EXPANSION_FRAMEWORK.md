# Expansion Framework (GA+1)

## Philosophy

"Build thin slices with strict lifecycle gates."

## Process

1.  **Selection**: Select top 3 workflows from Wishbook based on evidence.
2.  **Definition**: Define the "Thin Slice" (MVP) using `SPEC_TEMPLATE.md`.
3.  **Lifecycle**:
    - **Experimental**: Internal only, rapid iteration.
    - **Beta**: Selected customers, no SLA.
    - **GA**: General availability, full SLA.

## Requirements for Expansion

New workflows must have:

- [ ] **API Surface**: Webhooks/API first.
- [ ] **Entitlements**: Integrated with RBAC/Quota system.
- [ ] **Governance**: Audit logs and policy checks.
- [ ] **Telemetry**: Defined metrics from Day 1.

## Deprecation

- If a new workflow replaces an old one, a deprecation plan (min 6 months) is required.

## Unit Economics

- Track cost per unit (e.g., per report, per search) to ensure profitability.
