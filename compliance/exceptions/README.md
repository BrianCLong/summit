# SOC Exception Registry

This directory contains the canonical registry of exceptions for SOC controls.

## Registry File
`EXCEPTIONS.yml` contains a list of exception objects.

## Schema
- `exception_id`: string (stable, unique, e.g., `EX-YYYY-NNN`)
- `control_ids`: list[string] (canonical SOC control IDs from `compliance/control-matrix.yml`)
- `status`: one of `[active, resolved, superseded]`
- `owner`: string (GitHub handle/team)
- `approvers`: list[string] (GitHub teams/users that must approve changes)
- `created_at_utc`: ISO8601 date string
- `expires_at_utc`: ISO8601 date string (mandatory)
- `max_extension_days`: int (policy; e.g., 90)
- `renewal_window_days`: int (e.g., 30)
- `reason`: short string
- `risk_statement`: short string
- `compensating_controls`: list[string] (required unless exception is "non-applicable")
- `evidence_plan`: short string
- `links`: list[string]
- `notes`: optional string

## Policy Rules
1.  **Expiry is Mandatory**: No exception without `expires_at_utc`.
2.  **Bounded Horizon**: `expires_at_utc` must be within 180 days of creation.
3.  **Bounded Extensions**: Extensions must be <= `max_extension_days`.
4.  **Referential Integrity**: Must reference valid control IDs.
5.  **Approvals**: Changes must be approved by the listed approvers.

## Workflows
- **Validation**: `make ga-validate-exceptions` runs in CI.
- **Renewals**: Automated issues are created for expiring exceptions.
