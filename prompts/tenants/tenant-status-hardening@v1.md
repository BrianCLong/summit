# Tenant status hardening (Sprint +3)

## Objective
Implement tenant status lifecycle controls for hosted SaaS readiness, including:

- PATCH /api/tenants/{id} to set status to active or suspended.
- Provenance entry and lifecycle history on status changes.
- Route test coverage for status changes and dual-control sensitive operation requests.
- Dual-control-gated tenant export/delete request endpoints.
- Update docs/roadmap/STATUS.json to register the Sprint +3 hardening initiative.

## Constraints
- Scope limited to tenant routes, tenant service, tests, and roadmap status.
- No policy bypasses; enforce existing ABAC policy gate.

## Evidence
- Jest route tests for tenant status patch and dual-control export/delete request workflows.
- Roadmap status update recorded.
